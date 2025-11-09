# Beacon Qualitative Analyst

A Next.js full-stack application for importing research transcripts and generating academic-quality thematic analysis reports. The app uses **AI-powered analysis** to provide expert-level qualitative research insights, as well as traditional NVivo-style heuristic analysis.

## Features

### 🤖 AI-Powered Analysis (NEW!)
- **Research Question-Driven**: Start with your research question to guide focused analysis
- **Expert Thematic Analysis**: AI identifies themes, subthemes, and patterns
- **Verbatim Quotes with Context**: Automatically extracts representative quotes with context
- **Deep Interpretations**: Provides scholarly interpretations grounded in data
- **Prevalence Tracking**: Shows how many respondents mentioned each theme
- **Pattern Recognition**: Identifies relationships between themes
- **Actionable Recommendations**: Suggests directions for future research

### 📊 Traditional Heuristic Analysis
- **TF-IDF Keyword Extraction**: Identifies salient terms
- **Auto-code Generation**: Creates codes from frequent phrases
- **Code Co-occurrence**: Analyzes relationships between codes
- **Sentiment Analysis**: Lexicon-based sentiment scoring
- **Theme Grouping**: Identifies themes from word stems and patterns

### 📄 Report Generation
- **Academic Report Format**: Generate research-ready thematic analysis reports with:
  - Structured themes with descriptive summaries
  - Subthemes identification
  - Representative verbatim quotes with respondent IDs
  - Narrative interpretations for each theme
- **Export Options**: Download reports as Markdown or PDF
- **Customizable Metadata**: Add title, author, methodology, demographics, and notes
- **Publication-Ready Format**: Optional Elsevier/Web of Science-style output

## Quick Start

1. **Install dependencies**

```bash
npm install
```

2. **Set up environment variables**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Add your **FREE** Google Gemini API key to the `.env` file:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

**Get your FREE Gemini API key:**
- Visit: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- Sign in with your Google account
- Click "Create API key"
- Copy and paste it into your `.env` file

**Free Tier Limits:**
- 15 requests per minute
- 1,500 requests per day
- More than enough for research work!

*Alternative: You can also use OpenAI (paid) by setting `OPENAI_API_KEY` instead*

3. **Run the development server**

```bash
npm run dev
```

4. **Open the app**

- Visit `http://localhost:3000`
- **Enter your research question** (required for AI analysis)
- Paste transcripts (separate interviews with a blank line)
- Click **"🤖 AI Analysis"** for AI-powered thematic analysis
- Or click **"Basic Analysis"** for traditional heuristic analysis
- Click "Generate report" to create an academic thematic analysis report
- Export as Markdown or PDF

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
