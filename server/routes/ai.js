import express from 'express';
import OpenAI from 'openai';
import "dotenv/config";
import { authenticateToken } from '../middleware/auth.js';
import { upload, deleteFile } from '../middleware/upload.js';
import { createRequire } from 'module';
import fs from 'fs';
import Course from '../models/Course.js';

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
console.log('pdf-parse module type:', typeof pdfParseModule);
console.log('pdf-parse module keys:', Object.keys(pdfParseModule));
console.log('pdf-parse is function:', typeof pdfParseModule === 'function');
console.log('pdf-parse.default type:', typeof pdfParseModule.default);
// Handle both CommonJS default export and named export
const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule.default || pdfParseModule);
console.log('Final pdfParse type:', typeof pdfParse);

const router = express.Router();

// Initialize OpenAI client with OpenRouter configuration
if (!process.env.AI_KEY) {
  console.error('ERROR: AI_KEY environment variable is not set!');
  throw new Error('AI_KEY environment variable is required');
}

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.SITE_URL || "http://localhost:5173",
    "X-Title": process.env.SITE_NAME || "SyllaScribe",
  },
  dangerouslyAllowBrowser: false,
});

// Test connection endpoint - simple text completion
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const completion = await openai.chat.completions.create({
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

    const completion = await openai.chat.completions.create({
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

    const completion = await openai.chat.completions.create({
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
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      contentForAI = pdfData.text;
      console.log(`PDF extracted text length: ${contentForAI.length} characters`);
      console.log(`PDF first 200 chars: ${contentForAI.substring(0, 200)}...`);
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

You MUST return ONLY valid JSON in this exact format with no additional text:
{
  "className": "string (REQUIRED)",
  "instructor": "string (REQUIRED)",
  "categories": [
    {
      "name": "string (e.g., Exams, Homework, Projects)",
      "weight": number (percentage, e.g., 30 for 30%),
      "assignments": [
        {
          "name": "string (e.g., Midterm Exam, Final Exam)",
          "weight": number (percentage within category, or 0 if uniform)
        }
      ]
    }
  ],
  "warnings": ["string (optional - list any missing or partially found information)"]
}

Rules:
- className and instructor are REQUIRED. If not found, return an error.
- If no grade breakdown is found, return an error.
- If partial grade information is found, include what you found and add warnings.
- All weights should sum to 100. Unless it explicitly states extra credit.
- If individual assignment weights aren't specified, use 0 for weight.`;

    let parsedData;

    // Use vision model for images, text model for PDFs
    if (fileType.startsWith('image/')) {
      console.log('Sending image to Claude 3.5 Sonnet vision model...');
      const completion = await openai.chat.completions.create({
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
      const completion = await openai.chat.completions.create({
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
    res.status(500).json({
      error: 'Failed to parse syllabus',
      details: error.message
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
