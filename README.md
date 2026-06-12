# ATS Resume Tailor

A simple web app: upload your resume + paste a job description → get an ATS-friendly, tailored resume you can edit and download as DOCX or PDF.

- **Frontend:** plain HTML/CSS/JS (`public/`)
- **Backend:** Node + Express (`server.js`, `lib/`)
- **AI:** Google Gemini (free tier)

## Setup

1. **Get a free Gemini API key:** https://aistudio.google.com/app/apikey
2. **Create your `.env` file** (copy the example):
   ```powershell
   Copy-Item .env.example .env
   ```
   Then open `.env` and paste your key:
   ```
   GEMINI_API_KEY=your_key_here
   ```
3. **Install dependencies** (already done if you ran `npm install`):
   ```powershell
   npm install
   ```
4. **Start the app:**
   ```powershell
   npm start
   ```
5. Open **http://localhost:3000** in your browser.

## How it works

1. The backend extracts text from your resume (PDF / DOCX / TXT).
2. It sends your resume + the job description to Gemini with an ATS-optimization prompt
   (keyword alignment, achievement-oriented bullets, standard sections, no fabrication).
3. Gemini returns a structured resume, which you can **edit inline** in the browser.
4. Download the result as **DOCX** or **PDF**.

## Notes

- Your API key stays on the server (in `.env`, which is git-ignored). It is never sent to the browser.
- The AI is instructed not to invent employers, dates, or fake metrics — it rephrases and re-emphasizes what's already in your resume.
- Free Gemini tier has rate limits; for heavy use you may need a paid tier.
