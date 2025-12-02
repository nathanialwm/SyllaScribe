import express from 'express';
import OpenAI from 'openai';
import "dotenv/config";
import { authenticateToken } from '../middleware/auth.js';
import { upload, deleteFile } from '../middleware/upload.js';
import fs from 'fs';
import Course from '../models/Course.js';
import { convert } from 'pdf-poppler';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    let isPDFText = false;

    // Handle PDF files - extract text using pdfjs-dist
    if (fileType === 'application/pdf') {
      console.log('Processing PDF file with pdfjs-dist...');
      isPDFText = true;
      const dataBuffer = fs.readFileSync(filePath);

      // Use pdfjs-dist to extract text - convert Buffer to Uint8Array
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const uint8Array = new Uint8Array(dataBuffer);
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdfDocument = await loadingTask.promise;

      console.log(`PDF has ${pdfDocument.numPages} pages`);

      let fullText = '';
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Detailed logging for first page to diagnose issues
        if (pageNum === 1) {
          console.log(`Page 1 - textContent.items count: ${textContent.items.length}`);
          if (textContent.items.length > 0) {
            console.log(`Page 1 - First 5 items:`, textContent.items.slice(0, 5).map(item => ({
              str: item.str,
              length: item.str?.length || 0
            })));
          } else {
            console.log('Page 1 - No text items found (likely a scanned/image PDF)');
          }
        }

        const pageText = textContent.items.map(item => item.str).join(' ');
        console.log(`Page ${pageNum} extracted: ${pageText.length} characters`);
        fullText += pageText + '\n';
      }

      contentForAI = fullText;
      console.log(`PDF text extracted: ${contentForAI.length} characters`);
      console.log(`PDF first 200 chars: ${contentForAI.substring(0, 200)}...`);

      // If almost no text extracted, PDF is likely scanned/image-based or has text in tables/forms
      if (contentForAI.trim().length < 100) {
        console.log('WARNING: Very little text extracted from PDF');
        console.log('PDF may be scanned, have text in tables/forms, or use non-standard text encoding');
        console.log('Attempting to convert PDF pages to images using pdf-poppler...');

        isPDFText = false;
        const pageImagesToSend = [];

        // Create temporary directory for output images
        const tempDir = path.join(path.dirname(filePath), 'temp_pdf_images');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        try {
          // Convert first 3 pages to PNG images
          const pagesToRender = Math.min(3, pdfDocument.numPages);
          console.log(`Converting ${pagesToRender} page(s) to images...`);

          const opts = {
            format: 'png',
            out_dir: tempDir,
            out_prefix: 'page',
            page: `1-${pagesToRender}`,
            scale: 2048 // High resolution for better OCR
          };

          await convert(filePath, opts);
          console.log('PDF pages converted to images successfully');

          // Read the generated images and convert to base64
          for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
            const imagePath = path.join(tempDir, `page-${pageNum}.png`);

            if (fs.existsSync(imagePath)) {
              const imageBuffer = fs.readFileSync(imagePath);
              const base64Image = imageBuffer.toString('base64');
              pageImagesToSend.push(`data:image/png;base64,${base64Image}`);
              console.log(`Page ${pageNum} loaded: ${base64Image.length} characters (base64)`);

              // Clean up individual image file
              fs.unlinkSync(imagePath);
            } else {
              console.warn(`Warning: Image file not found for page ${pageNum}`);
            }
          }

          // Store images to send to vision model
          contentForAI = pageImagesToSend;
          console.log(`Successfully converted ${pageImagesToSend.length} page(s) to images`);

        } catch (convertError) {
          console.error('PDF conversion error:', convertError.message);
          throw new Error(`Failed to convert PDF to images: ${convertError.message}`);
        } finally {
          // Clean up temp directory
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        }
      }
    }
    // Handle image files - send to vision model as base64
    else if (fileType.startsWith('image/')) {
      console.log('Processing image file...');
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
- className and instructor are REQUIRED. If not found with high confidence, make your best educated guess based on any available context.
- Use information even if you're only somewhat confident - the user can make corrections afterwards.
- ONLY fail completely if you truly can't find ANY information at all.
- For grade information: Look for sections with ANY of these headings or similar variations: "Assessment Methods", "Assessment", "Evaluation", "Grade Breakdown", "Grading", "Grading Rubric", "Course Grade", "Grade Distribution", or any section that lists percentages for course components. Also look for '%' symbols anywhere in the document and correlate them with nearby text to identify assignment categories. The '%' symbols may appear in parentheses like (20%) or as standalone values. Note that '%' symbols may not always be present, so also look for tables, lists, or sections that appear to describe grading structure or course requirements.
- If partial grade information is found, include what you found and add warnings about what's missing or uncertain.
- All weights should sum to 100. Unless it explicitly states extra credit.
- If individual assignment weights aren't specified, use 0 for weight.
- Be flexible and make reasonable inferences from the document structure and context.`;

    let parsedData;

    // Get model from environment variable or use default
    const aiModel = process.env.AI_MODEL || "openai/gpt-3.5-turbo";
    console.log(`Using AI model: ${aiModel}`);

    // Send to AI model - use vision for images, text for PDFs
    if (isPDFText) {
      console.log('Sending PDF text to AI model...');
      const completion = await openai.chat.completions.create({
        model: aiModel,
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
    } else {
      console.log('Sending image(s) to AI vision model...');

      // Build content array with text prompt and image(s)
      const messageContent = [
        {
          type: "text",
          text: systemPrompt
        }
      ];

      // Handle multiple images (from rendered PDF pages) or single image
      if (Array.isArray(contentForAI)) {
        console.log(`Sending ${contentForAI.length} PDF page images to vision model`);
        contentForAI.forEach((imageUrl) => {
          messageContent.push({
            type: "image_url",
            image_url: {
              url: imageUrl
            }
          });
        });
      } else {
        console.log('Sending single image to vision model');
        messageContent.push({
          type: "image_url",
          image_url: {
            url: contentForAI
          }
        });
      }

      const completion = await openai.chat.completions.create({
        model: aiModel,
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ],
        temperature: 0.1
      });

      parsedData = completion.choices[0].message.content;
      console.log('AI Response received from vision model');
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

    // Validate that SOME information was found
    console.log('Validating that some information was found...');
    console.log('className:', syllabusData.className);
    console.log('instructor:', syllabusData.instructor);
    console.log('categories count:', syllabusData.categories?.length);

    // Only fail if truly NO information was found at all
    const hasClassName = syllabusData.className && syllabusData.className.trim().length > 0;
    const hasInstructor = syllabusData.instructor && syllabusData.instructor.trim().length > 0;
    const hasCategories = syllabusData.categories && syllabusData.categories.length > 0;

    if (!hasClassName && !hasInstructor && !hasCategories) {
      console.error('Validation failed: No information found at all');
      return res.status(400).json({
        error: 'No information could be extracted',
        details: 'Could not find any usable information in the syllabus. Please check if the file is a valid syllabus document.'
      });
    }

    // Add warnings for missing information instead of failing
    if (!syllabusData.warnings) {
      syllabusData.warnings = [];
    }
    if (!hasClassName) {
      syllabusData.warnings.push('Class name could not be determined with confidence');
    }
    if (!hasInstructor) {
      syllabusData.warnings.push('Instructor name could not be determined with confidence');
    }
    if (!hasCategories) {
      syllabusData.warnings.push('No grade breakdown information found');
    }

    console.log('Validation passed with warnings:', syllabusData.warnings);

    // Check if course already exists (optional - don't fail if DB is unavailable)
    let existingCourse = null;
    try {
      existingCourse = await Course.findOne({
        title: syllabusData.className
      }).maxTimeMS(2000); // 2 second timeout

      if (existingCourse) {
        console.log('Course already exists in database:', existingCourse._id);
      } else {
        console.log('Course does not exist in database');
      }
    } catch (dbError) {
      console.warn('Database check failed (non-critical):', dbError.message);
      console.log('Continuing without database check...');
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
