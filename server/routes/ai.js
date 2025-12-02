import express from 'express';
import OpenAI from 'openai';
import "dotenv/config";
import { authenticateToken } from '../middleware/auth.js';
import { upload, deleteFile } from '../middleware/upload.js';
import { createRequire } from 'module';
import fs from 'fs';
import Course from '../models/Course.js';

const require = createRequire(import.meta.url);

// Load pdf-parse - it's a CommonJS module
// We'll load it dynamically when needed to avoid import issues
const loadPdfParse = async () => {
  try {
    // Use the require function created at the top of the file
    const pdfParseModule = require('pdf-parse');
    
    console.log('pdf-parse module type:', typeof pdfParseModule);
    console.log('pdf-parse is function?', typeof pdfParseModule === 'function');
    console.log('pdf-parse module keys:', Object.keys(pdfParseModule || {}));
    console.log('pdf-parse module:', pdfParseModule);
    
    // pdf-parse v1.x exports: module.exports = function pdf(dataBuffer, options)
    // So require() should return the function directly
    if (typeof pdfParseModule === 'function') {
      console.log('✓ pdf-parse is a function directly');
      return pdfParseModule;
    }
    
    // Sometimes wrapped in default (ES module interop)
    if (pdfParseModule?.default && typeof pdfParseModule.default === 'function') {
      console.log('✓ pdf-parse found in .default');
      return pdfParseModule.default;
    }
    
    // Or as a named export
    if (pdfParseModule?.pdfParse && typeof pdfParseModule.pdfParse === 'function') {
      console.log('✓ pdf-parse found in .pdfParse');
      return pdfParseModule.pdfParse;
    }
    
    // Check if it has a __esModule flag and default
    if (pdfParseModule?.__esModule && pdfParseModule.default) {
      console.log('✓ pdf-parse has __esModule, using default');
      return pdfParseModule.default;
    }
    
    // If it's an object, try to find any function property
    if (typeof pdfParseModule === 'object' && pdfParseModule !== null) {
      for (const key of Object.keys(pdfParseModule)) {
        if (typeof pdfParseModule[key] === 'function') {
          console.log(`✓ Found function in pdf-parse.${key}`);
          return pdfParseModule[key];
        }
      }
    }
    
    // Last resort - the module itself might be callable even if typeof says object
    console.log('⚠ Using pdf-parse module directly (type check failed)');
    return pdfParseModule;
  } catch (error) {
    console.error('Failed to load pdf-parse:', error);
    throw new Error(`Failed to load pdf-parse module: ${error.message}`);
  }
};

const router = express.Router();

// Lazy initialization of OpenAI client
let openai = null;

// Warn if AI_KEY is not set (but don't crash the server)
if (!process.env.AI_KEY) {
  console.warn('⚠️  WARNING: AI_KEY environment variable is not set.');
  console.warn('   The server will start, but AI features (syllabus parsing) will not work.');
  console.warn('   To enable AI features, add AI_KEY to your .env file.');
}

const getOpenAIClient = () => {
  if (!process.env.AI_KEY) {
    throw new Error('AI_KEY environment variable is not set. Please add it to your .env file to use AI features.');
  }
  
  if (!openai) {
    openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.AI_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:5173",
        "X-Title": process.env.SITE_NAME || "SyllaScribe",
      },
      dangerouslyAllowBrowser: false,
    });
  }
  
  return openai;
};

// Test connection endpoint - simple text completion
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "openai/gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: message
        }
      ]
    });

    res.json({
      response: completion.choices[0].message.content,
      usage: completion.usage
    });
  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({
      error: 'Failed to get AI response',
      details: error.message
    });
  }
});

// Analyze image with AI vision
router.post('/analyze-image', authenticateToken, async (req, res) => {
  try {
    const { imageUrl, prompt } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const userPrompt = prompt || "What is in this image?";

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "openai/gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ]
    });

    res.json({
      response: completion.choices[0].message.content,
      usage: completion.usage
    });
  } catch (error) {
    console.error('AI image analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze image',
      details: error.message
    });
  }
});

// Chat completion endpoint - for general text interactions
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const selectedModel = model || "openai/gpt-3.5-turbo";

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: selectedModel,
      messages: messages
    });

    res.json({
      response: completion.choices[0].message.content,
      usage: completion.usage
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      error: 'Failed to get chat response',
      details: error.message
    });
  }
});

// Parse syllabus from uploaded file (no authentication required)
router.post('/parse-syllabus', upload.single('syllabus'), async (req, res) => {
  let filePath = null;

  try {
    console.log('=== Syllabus Parsing Started ===');

    if (!req.file) {
      console.error('No file uploaded in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;
    const fileType = req.file.mimetype;
    const fileSize = req.file.size;
    console.log(`File received: ${req.file.originalname}`);
    console.log(`File type: ${fileType}, Size: ${fileSize} bytes`);

    let contentForAI = '';

    // Handle PDF files
    if (fileType === 'application/pdf') {
      console.log('Processing PDF file...');
      
      try {
        // Load pdf-parse dynamically
        const pdfParseFunc = await loadPdfParse();
        
        console.log('pdfParseFunc type after load:', typeof pdfParseFunc);
        
        const dataBuffer = fs.readFileSync(filePath);
        console.log('PDF buffer size:', dataBuffer.length);
        
        // Try to call it - sometimes CommonJS modules are callable even if typeof says 'object'
        let pdfData;
        try {
          if (typeof pdfParseFunc === 'function') {
            console.log('Calling pdfParseFunc as function...');
            pdfData = await pdfParseFunc(dataBuffer);
          } else {
            // Try calling it anyway - some CommonJS modules are callable objects
            console.log('Attempting to call pdfParseFunc (type: ' + typeof pdfParseFunc + ')...');
            pdfData = await pdfParseFunc(dataBuffer);
          }
        } catch (callError) {
          console.error('Error calling pdfParseFunc:', callError);
          throw new Error(`Cannot call pdf-parse: ${callError.message}. Module type: ${typeof pdfParseFunc}`);
        }
        
        contentForAI = pdfData?.text || '';
        
        if (!contentForAI || contentForAI.trim().length === 0) {
          throw new Error('PDF file appears to be empty or could not extract text. The PDF might be image-based or corrupted.');
        }
        
        console.log(`PDF extracted text length: ${contentForAI.length} characters`);
        console.log(`PDF first 200 chars: ${contentForAI.substring(0, 200)}...`);
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        throw new Error(`Failed to parse PDF: ${pdfError.message}`);
      }
    }
    // Handle image files - we'll use vision model
    else if (fileType.startsWith('image/')) {
      console.log('Processing image file...');
      // Convert image to base64
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');
      contentForAI = `data:${fileType};base64,${base64Image}`;
      console.log(`Image converted to base64, length: ${base64Image.length} characters`);
    }

    // Construct the prompt for AI
    const systemPrompt = `Parse this syllabus to find information regarding grade breakdown, class name and instructor, for the course. Create categories from this information for each type of graded item, and add the weight of that category as supplied in the syllabus. If there is no weight information found, fill the weights in as 100/num_categories.

ALSO extract all important dates including:
- Exam dates (midterms, finals, quizzes)
- Assignment due dates
- Project deadlines
- Important class events
- Drop/add deadlines
- Holiday/break dates

You MUST return ONLY valid JSON in this exact format with no additional text:
{
  "className": "string (REQUIRED)",
  "instructor": "string (REQUIRED)",
  "semester": "string (optional - e.g., Fall 2024, Spring 2025)",
  "categories": [
    {
      "name": "string (e.g., Exams, Homework, Projects)",
      "weight": number (percentage, e.g., 30 for 30%),
      "assignments": [
        {
          "name": "string (e.g., Midterm Exam, Final Exam)",
          "weight": number (percentage within category, or 0 if uniform),
          "dueDate": "ISO 8601 date string (YYYY-MM-DD) or null if not found"
        }
      ]
    }
  ],
  "calendarEvents": [
    {
      "title": "string (e.g., Midterm Exam, Assignment 1 Due)",
      "description": "string (optional)",
      "startDate": "ISO 8601 date string (YYYY-MM-DD) - REQUIRED",
      "endDate": "ISO 8601 date string (YYYY-MM-DD) or null",
      "eventType": "string (exam, assignment, homework, project, quiz, lecture, deadline, other)",
      "isAllDay": boolean (default true for most academic events)
    }
  ],
  "warnings": ["string (optional - list any missing or partially found information)"]
}

Rules:
- className and instructor are REQUIRED. If not found, return an error.
- If no grade breakdown is found, return an error.
- If partial grade information is found, include what you found and add warnings.
- All weights should sum to 100. Unless it explicitly states extra credit.
- If individual assignment weights aren't specified, use 0 for weight.
- Extract ALL dates mentioned in the syllabus, even if they don't have associated assignments.
- For dates, use ISO 8601 format (YYYY-MM-DD). If only month/day is given, infer the year from the semester or use current year.
- Include exam dates, assignment due dates, project deadlines, and any other important academic dates.`;

    let parsedData;

    // Validate we have content to process
    if (!contentForAI || contentForAI.trim().length === 0) {
      throw new Error('Could not extract content from file. Please ensure the file is a valid PDF or image.');
    }

    // Use vision model for images, text model for PDFs
    let client;
    try {
      client = getOpenAIClient();
    } catch (aiError) {
      throw new Error(`AI service unavailable: ${aiError.message}`);
    }
    
    if (fileType.startsWith('image/')) {
      console.log('Sending image to Claude 3.5 Sonnet vision model...');
      const completion = await client.chat.completions.create({
        model: "openrouter/anthropic/claude-3.5-sonnet:beta",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: systemPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: contentForAI
                }
              }
            ]
          }
        ],
        temperature: 0.1
      });

      parsedData = completion.choices[0].message.content;
      console.log('AI Response received from vision model');
    } else {
      // For PDF text
      console.log('Sending PDF text to Claude 3.5 Sonnet...');
      const completion = await client.chat.completions.create({
        model: "openrouter/anthropic/claude-3.5-sonnet:beta",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Here is the syllabus text:\n\n${contentForAI}`
          }
        ],
        temperature: 0.1
      });

      parsedData = completion.choices[0].message.content;
      console.log('AI Response received from text model');
    }

    console.log('Raw AI response length:', parsedData.length);
    console.log('Raw AI response:', parsedData);

    // Clean up the response - remove markdown code blocks if present
    let cleanedData = parsedData.trim();
    if (cleanedData.startsWith('```json')) {
      console.log('Removing ```json markdown wrapper');
      cleanedData = cleanedData.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleanedData.startsWith('```')) {
      console.log('Removing ``` markdown wrapper');
      cleanedData = cleanedData.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }

    console.log('Cleaned data for JSON parsing:', cleanedData.substring(0, 500));

    // Parse the JSON response
    let syllabusData;
    try {
      syllabusData = JSON.parse(cleanedData);
      console.log('Successfully parsed JSON from AI response');
      console.log('Parsed data structure:', JSON.stringify(syllabusData, null, 2));
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError.message);
      console.error('Failed to parse cleaned data:', cleanedData);
      throw new Error('AI returned invalid JSON format');
    }

    // Validate required fields
    console.log('Validating required fields...');
    console.log('className:', syllabusData.className);
    console.log('instructor:', syllabusData.instructor);
    console.log('categories count:', syllabusData.categories?.length);

    if (!syllabusData.className || !syllabusData.instructor) {
      console.error('Validation failed: Missing className or instructor');
      return res.status(400).json({
        error: 'Required information missing',
        details: 'Could not find class name or instructor in the syllabus'
      });
    }

    if (!syllabusData.categories || syllabusData.categories.length === 0) {
      console.error('Validation failed: No categories found');
      return res.status(400).json({
        error: 'No grade information found',
        details: 'Could not find any grade breakdown information in the syllabus'
      });
    }

    console.log('Validation passed!');

    // Check if course already exists
    const existingCourse = await Course.findOne({
      title: syllabusData.className
    });

    if (existingCourse) {
      console.log('Course already exists in database:', existingCourse._id);
    } else {
      console.log('Course does not exist in database');
    }

    // Return the parsed data with existence check
    console.log('=== Syllabus Parsing Completed Successfully ===');
    res.json({
      success: true,
      data: syllabusData,
      courseExists: !!existingCourse,
      existingCourseId: existingCourse?._id
    });

  } catch (error) {
    console.error('=== Syllabus Parsing Error ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to parse syllabus';
    let statusCode = 500;
    
    if (error.message.includes('AI_KEY') || error.message.includes('AI service')) {
      errorMessage = 'AI service is not configured. Please add AI_KEY to your .env file.';
      statusCode = 503;
    } else if (error.message.includes('PDF') || error.message.includes('pdf-parse')) {
      errorMessage = 'PDF parsing failed. The file might be corrupted or image-based. Try converting to an image file.';
      statusCode = 400;
    } else if (error.message.includes('empty') || error.message.includes('extract')) {
      errorMessage = 'Could not extract text from the file. Please ensure the file contains readable text.';
      statusCode = 400;
    } else if (error.message.includes('JSON')) {
      errorMessage = 'AI returned invalid data format. Please try again or upload a different syllabus.';
      statusCode = 500;
    }
    
    res.status(statusCode).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Clean up uploaded file
    if (filePath) {
      console.log('Cleaning up uploaded file:', filePath);
      deleteFile(filePath);
    }
  }
});

export default router;
