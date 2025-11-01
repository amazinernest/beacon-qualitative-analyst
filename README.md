# Beacon Qualitative Analyst

A minimal Next.js full-stack app to import research transcripts and analyze responses using NVivo-like techniques (auto-coding, keyword extraction, code co-occurrence, simple themes, sentiment).

## Quick start

1. Install deps

```bash
npm install
```

2. Run the dev server

```bash
npm run dev
```

3. Open the app

- Visit `http://localhost:3000`
- Paste transcripts separated by a blank line
- Click "Analyze"

## Notes

- Analysis is local and heuristic (no external APIs). It performs:
  - TF-IDF keyword extraction
  - Auto-code generation using frequent 2-3 word phrases
  - Co-occurrence counts across documents
  - Simple lexicon-based sentiment
  - Naive theme grouping by word stems
- For real NVivo-like workflows (manual coding, codebooks, hierarchical themes, inter-rater reliability), extend the UI and persist data to a database.

## Project structure

- `app/` Next.js App Router pages and API routes
- `app/api/analyze/route.ts` analysis endpoint
- `lib/analysis.ts` core analysis logic

## Production

```bash
npm run build
npm start
```
