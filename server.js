import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import path from 'path';

import { buildDocx } from './lib/docx-export.js';
import { buildPdf } from './lib/pdf-export.js';
import { tailorPrompt, RESUME_SCHEMA_HINT } from './lib/prompt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const PORT = process.env.PORT || 3000;

if (!API_KEY) {
  console.warn('\n⚠  GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.\n');
}

// --- Extract plain text from an uploaded resume (PDF or DOCX) ---
async function extractResumeText(file) {
  if (!file) throw new Error('No resume file uploaded.');
  const name = (file.originalname || '').toLowerCase();
  if (name.endsWith('.pdf')) {
    try {
      const data = await pdfParse(file.buffer);
      return data.text;
    } catch {
      throw new Error('The PDF file appears to be corrupt or invalid. Please try a different file.');
    }
  }
  if (name.endsWith('.docx')) {
    try {
      const { value } = await mammoth.extractRawText({ buffer: file.buffer });
      return value;
    } catch {
      throw new Error('The DOCX file appears to be corrupt or invalid. Please try a different file.');
    }
  }
  if (name.endsWith('.txt')) {
    return file.buffer.toString('utf8');
  }
  throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT resume.');
}

// --- Tailor endpoint: resume file + JD text -> structured tailored resume JSON ---
app.post('/api/tailor', upload.single('resume'), async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. See .env.example.' });
    }
    const jobDescription = (req.body.jobDescription || '').trim();
    if (!jobDescription) {
      return res.status(400).json({ error: 'Please paste a job description.' });
    }
    const additionalInstructions = (req.body.additionalInstructions || '').trim();

    const resumeText = (await extractResumeText(req.file)).trim();
    if (!resumeText) {
      return res.status(400).json({ error: 'Could not read any text from that resume file.' });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    });

    const prompt = tailorPrompt(resumeText, jobDescription, additionalInstructions);
    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // strip any stray markdown fences and retry
      const cleaned = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    res.json(parsed);
  } catch (err) {
    console.error('tailor error:', err);
    res.status(500).json({ error: err.message || 'Failed to tailor resume.' });
  }
});

// --- Export endpoint: structured resume JSON -> DOCX or PDF download ---
app.post('/api/export', async (req, res) => {
  try {
    const { resume, format } = req.body;
    if (!resume) return res.status(400).json({ error: 'Missing resume data.' });

    const fname = (resume.name || 'resume').replace(/[^a-z0-9]+/gi, '_');

    if (format === 'pdf') {
      const buf = await buildPdf(resume);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fname}.pdf"`);
      return res.send(buf);
    }

    // default: docx
    const buf = await buildDocx(resume);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}.docx"`);
    res.send(buf);
  } catch (err) {
    console.error('export error:', err);
    res.status(500).json({ error: err.message || 'Failed to export resume.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Resume Tailor running at http://localhost:${PORT}  (model: ${MODEL})\n`);
});
