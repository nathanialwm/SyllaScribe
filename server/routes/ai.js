import express from 'express';
import { GoogleGenAI, createPartFromUri } from '@google/genai';
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

// Initialize Google GenAI client (newer SDK)
if (!process.env.GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is not set!');
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

// Token-based rate limiting (125k tokens/minute for gemini-2.0-flash-exp)
const TOKEN_LIMIT_PER_MINUTE = 125000;
let tokensUsedThisMinute = 0;
let tokenMinuteReset = Date.now();

async function checkTokenLimit(estimatedTokens) {
  const now = Date.now();

  // Reset token counter every minute
  if (now - tokenMinuteReset > 60000) {
    tokensUsedThisMinute = 0;
    tokenMinuteReset = now;
  }

  // Check if adding this request would exceed limit
  if (tokensUsedThisMinute + estimatedTokens > TOKEN_LIMIT_PER_MINUTE) {
    const secondsUntilReset = Math.ceil((60000 - (now - tokenMinuteReset)) / 1000);
    throw new Error(`Token rate limit exceeded: ${tokensUsedThisMinute}/${TOKEN_LIMIT_PER_MINUTE} tokens used this minute. Reset in ${secondsUntilReset}s.`);
  }
}

function trackTokenUsage(tokens) {
  tokensUsedThisMinute += tokens;
  console.log(`Tokens used this minute: ${tokensUsedThisMinute}/${TOKEN_LIMIT_PER_MINUTE}`);
}

// Test connection endpoint - simple text completion
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Count tokens before sending
    const countResponse = await ai.models.countTokens({
      model: modelName,
      contents: message,
    });

    await checkTokenLimit(countResponse.totalTokens * 2); // Estimate input + output tokens

    const response = await ai.models.generateContent({
      model: modelName,
      contents: message,
    });

    // Track actual token usage
    if (response.usageMetadata) {
      trackTokenUsage(response.usageMetadata.totalTokenCount || 0);
    }

    res.json({
      response: response.text,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      }
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

    // Extract base64 data and mime type from data URL
    const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid image URL format. Expected data URL with base64 encoding.');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Estimate tokens (images are roughly 258 tokens each, plus prompt)
    await checkTokenLimit(500);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        { text: userPrompt },
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ]
    });

    // Track actual token usage
    if (response.usageMetadata) {
      trackTokenUsage(response.usageMetadata.totalTokenCount || 0);
    }

    res.json({
      response: response.text,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      }
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
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Build content from messages
    const fullConversation = messages.map(m => m.content).join('\n');

    // Count tokens before sending
    const countResponse = await ai.models.countTokens({
      model: modelName,
      contents: fullConversation,
    });

    await checkTokenLimit(countResponse.totalTokens * 2);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: fullConversation,
    });

    // Track actual token usage
    if (response.usageMetadata) {
      trackTokenUsage(response.usageMetadata.totalTokenCount || 0);
    }

    res.json({
      response: response.text,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      }
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

    let uploadedFile = null;
    let useFileUpload = false;
    let contentForAI = null;

    // Handle PDF files using Gemini File Upload API (better for preserving formatting)
    if (fileType === 'application/pdf') {
      console.log('Uploading PDF to Gemini File API for processing...');

      try {
        // Upload the file to Gemini
        uploadedFile = await ai.files.upload({
          file: filePath,
          config: {
            displayName: req.file.originalname,
          },
        });

        console.log(`File uploaded: ${uploadedFile.name}`);
        console.log(`File state: ${uploadedFile.state}`);

        // Wait for the file to be processed
        let getFile = await ai.files.get({ name: uploadedFile.name });
        let retries = 0;
        const maxRetries = 12; // 1 minute max wait (5s * 12)

        while (getFile.state === 'PROCESSING' && retries < maxRetries) {
          console.log(`File is still processing (${retries + 1}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
          getFile = await ai.files.get({ name: uploadedFile.name });
          retries++;
        }

        if (getFile.state === 'FAILED') {
          throw new Error('File processing failed on Gemini servers.');
        }

        if (getFile.state === 'PROCESSING') {
          throw new Error('File processing timeout - file took too long to process.');
        }

        console.log(`File processing complete! State: ${getFile.state}`);
        uploadedFile = getFile;
        useFileUpload = true;

      } catch (uploadError) {
        console.error('File upload error:', uploadError.message);
        console.log('Falling back to base64 image conversion...');
        useFileUpload = false;

        // Fallback: Convert PDF to images if upload fails
        const dataBuffer = fs.readFileSync(filePath);
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const uint8Array = new Uint8Array(dataBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdfDocument = await loadingTask.promise;

        const pageImagesToSend = [];
        const tempDir = path.join(path.dirname(filePath), 'temp_pdf_images');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        try {
          const pagesToRender = Math.min(3, pdfDocument.numPages);
          console.log(`Converting ${pagesToRender} page(s) to images...`);

          const opts = {
            format: 'png',
            out_dir: tempDir,
            out_prefix: 'page',
            page: `1-${pagesToRender}`,
            scale: 2048
          };

          await convert(filePath, opts);

          for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
            const imagePath = path.join(tempDir, `page-${pageNum}.png`);
            if (fs.existsSync(imagePath)) {
              const imageBuffer = fs.readFileSync(imagePath);
              const base64Image = imageBuffer.toString('base64');
              pageImagesToSend.push(`data:image/png;base64,${base64Image}`);
              fs.unlinkSync(imagePath);
            }
          }

          contentForAI = pageImagesToSend;
          console.log(`Fallback: Successfully converted ${pageImagesToSend.length} page(s) to images`);
        } finally {
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
    let response;

    console.log(`Using Gemini model: ${modelName}`);

    // Send to AI model - three paths: uploaded file, images, or text
    if (useFileUpload && uploadedFile) {
      console.log('Using uploaded file from Gemini File API...');

      // Build content with file reference
      const content = [systemPrompt];

      if (uploadedFile.uri && uploadedFile.mimeType) {
        const fileContent = createPartFromUri(uploadedFile.uri, uploadedFile.mimeType);
        content.push(fileContent);
      }

      // Estimate tokens for large PDFs (rough estimate: 1 token per 4 chars, PDFs avg 5k tokens)
      await checkTokenLimit(10000); // Conservative estimate for PDF

      response = await ai.models.generateContent({
        model: modelName,
        contents: content,
        config: {
          temperature: 0.1,
        }
      });

      parsedData = response.text;
      console.log('AI Response received from file upload model');

      // Clean up uploaded file from Gemini
      try {
        await ai.files.delete({ name: uploadedFile.name });
        console.log(`Deleted uploaded file: ${uploadedFile.name}`);
      } catch (deleteError) {
        console.warn('Failed to delete uploaded file:', deleteError.message);
      }

    } else if (contentForAI && typeof contentForAI === 'string') {
      console.log('Sending text content to Gemini model...');

      const fullPrompt = `${systemPrompt}\n\n${contentForAI}`;

      // Count tokens before sending
      const countResponse = await ai.models.countTokens({
        model: modelName,
        contents: fullPrompt,
      });

      console.log(`Estimated tokens: ${countResponse.totalTokens}`);
      await checkTokenLimit(countResponse.totalTokens * 2);

      response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt,
        config: {
          temperature: 0.1,
        }
      });

      parsedData = response.text;
      console.log('AI Response received from text model');

    } else if (Array.isArray(contentForAI) || contentForAI) {
      console.log('Sending image(s) to Gemini vision model...');

      // Build content array with text prompt and image(s)
      const contentParts = [{ text: systemPrompt }];

      // Handle multiple images (from rendered PDF pages) or single image
      if (Array.isArray(contentForAI)) {
        console.log(`Sending ${contentForAI.length} PDF page images to vision model`);
        contentForAI.forEach((imageDataUrl) => {
          // Extract base64 and mime type from data URL
          const matches = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            contentParts.push({
              inlineData: {
                data: matches[2],
                mimeType: matches[1]
              }
            });
          }
        });
      } else {
        console.log('Sending single image to vision model');
        // Extract base64 and mime type from data URL
        const matches = contentForAI.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          contentParts.push({
            inlineData: {
              data: matches[2],
              mimeType: matches[1]
            }
          });
        }
      }

      // Estimate tokens (images ~258 tokens each + prompt)
      const estimatedTokens = (Array.isArray(contentForAI) ? contentForAI.length * 258 : 258) + 500;
      await checkTokenLimit(estimatedTokens * 2);

      response = await ai.models.generateContent({
        model: modelName,
        contents: contentParts,
        config: {
          temperature: 0.1,
        }
      });

      parsedData = response.text;
      console.log('AI Response received from vision model');
    }

    // Track actual token usage
    if (response.usageMetadata) {
      trackTokenUsage(response.usageMetadata.totalTokenCount || 0);
      console.log(`Actual tokens used: ${response.usageMetadata.totalTokenCount}`);
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

    // Return the parsed data with existence check
    console.log('=== Syllabus Parsing Completed Successfully ===');
    res.json({
      success: true,
      data: syllabusData,
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
