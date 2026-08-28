# ai-resume-analyzer

A React app that analyzes resumes for ATS score, strengths and weaknesses, and job description match. Paste text or upload a PDF, add a target role, and get structured feedback.

PDF text is extracted in the browser with pdf.js and sent to Gemini for analysis. The UI shows score, keyword gaps and actionable suggestions.

## Why this exists

ATS blocks many resumes before a human reads them. This tool gives quick, specific feedback so candidates can tailor their resume for each role.

## Features

- ATS score from 0 to 100
- Strengths and weaknesses with examples
- Job description match with missing keywords
- PDF upload with client side text extraction
- Progress and toast feedback

## Project structure

```text
.
├── src
│   ├── components/ui
│   ├── App.jsx
│   └── main.jsx
├── index.html
└── vite.config.js
```

## Prerequisites

Node 18 or later and a Gemini API key for analysis.

## Installation

```bash
git clone https://github.com/mastaan66/ai-resume-analyzer.git
cd ai-resume-analyzer
npm install
```

Create `.env` with your key

```text
VITE_GEMINI_API_KEY=your_key_here
```

## Usage

```bash
npm run dev
```

Open `http://localhost:5173`, paste a resume or upload a PDF, optionally paste a job description, and click Analyze. The service in `src/App.jsx:1` handles extraction and the Gemini call with retry.

## Limitations

- Analysis quality depends on the LLM and prompt
- No server side storage, results are session only
- PDF extraction uses pdf.js worker from CDN

## Contributing

Issues and pull requests are welcome.

## License

MIT. See LICENSE.
