# Beacon Qualitative Analyst

A Next.js full-stack application for importing research transcripts and generating academic-quality thematic analysis reports. The app performs NVivo-style analysis including auto-coding, keyword extraction, code co-occurrence, sentiment analysis, and theme identification.

## Features

- **Transcript Analysis**: Import multiple interview transcripts
- **Academic Report Generation**: Generate research-ready thematic analysis reports with:
  - Structured themes with descriptive summaries
  - Subthemes identification
  - Representative verbatim quotes with respondent IDs
  - Narrative interpretations for each theme
- **Export Options**: Download reports as Markdown or PDF
- **Customizable Metadata**: Add title, author, methodology, demographics, and notes

## Quick Start

1. **Install dependencies**

```bash
npm install
```

2. **Run the development server**

```bash
npm run dev
```

3. **Open the app**

- Visit `http://localhost:3000`
- Paste transcripts (separate interviews with a blank line)
- Click "Analyze" to see results
- Click "Generate report" to create an academic thematic analysis report

## Analysis Features

The app performs automated heuristic analysis including:

- **TF-IDF Keyword Extraction**: Identifies salient terms
- **Auto-code Generation**: Creates codes from frequent 2-3 word phrases
- **Code Co-occurrence**: Analyzes relationships between codes
- **Sentiment Analysis**: Lexicon-based sentiment scoring
- **Theme Grouping**: Identifies themes from word stems and patterns
- **Academic Report Format**: Generates NVivo-style thematic analysis reports

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── analyze/route.ts    # Analysis API endpoint
│   │   └── report/route.ts     # Report generation endpoint
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main UI component
├── lib/
│   ├── analysis.ts            # Core analysis engine
│   └── report.ts              # Academic report generator
└── package.json
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository on [Vercel](https://vercel.com)
3. Deploy automatically

### Deploy to GitHub Pages

For static export (requires configuration adjustments):

```bash
npm run build
```

## Production

```bash
npm run build
npm start
```

## Limitations

This is an automated, heuristic analysis tool intended to accelerate initial synthesis. For publication-grade studies, manual coding, inter-rater reliability checks, and triangulation with additional data sources are recommended.

## License

MIT
