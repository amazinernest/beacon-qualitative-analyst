import type { analyzeCorpus } from "./analysis";

type AnalysisResult = ReturnType<typeof analyzeCorpus>;

function formatDate(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function topN<T>(arr: T[], n: number) {
  return arr.slice(0, Math.max(0, n));
}

function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const pieces = normalized.split(/(?<=[.!?])\s+/);
  return pieces.map((s) => s.trim()).filter(Boolean);
}

function sentenceContainsAny(sentence: string, terms: string[]): boolean {
  const lower = sentence.toLowerCase();
  return terms.some((t) => lower.includes(t.toLowerCase()));
}

function themeQuotables(result: AnalysisResult, perTheme = 3) {
  const quotables: { theme: string; quotes: { text: string; respondentId: string }[] }[] = [];
  const topKeywordSet = new Set(topN(result.keywords, 30).map((k) => k.term.toLowerCase()));

  for (const theme of result.themes) {
    const sentences: { text: string; score: number; respondentId: string }[] = [];
    for (const doc of result.documents) {
      const docSentences = splitSentences(doc.text);
      for (const s of docSentences) {
        if (!sentenceContainsAny(s, theme.terms)) continue;
        const lower = s.toLowerCase();
        let score = 0;
        for (const t of theme.terms) if (lower.includes(t.toLowerCase())) score += 2;
        for (const kw of topKeywordSet) if (lower.includes(kw)) score += 1;
        // Prefer quotable length (between 50 and 200 chars)
        const len = s.length;
        const lenPenalty = Math.abs(120 - Math.min(240, len)) / 120;
        score += 1 - Math.min(1, lenPenalty);
        sentences.push({ text: s, score, respondentId: doc.id });
      }
    }
    sentences.sort((a, b) => b.score - a.score);
    const unique: { text: string; respondentId: string }[] = [];
    for (const s of sentences) {
      if (unique.find((q) => q.text.toLowerCase() === s.text.toLowerCase())) continue;
      unique.push({ text: s.text, respondentId: s.respondentId });
      if (unique.length >= perTheme) break;
    }
    if (unique.length > 0) quotables.push({ theme: theme.theme, quotes: unique });
  }
  return quotables;
}

function extractRespondentId(docId: string): string {
  const match = docId.match(/doc_(\d+)/);
  return match ? `Respondent ${match[1]}` : docId;
}

function generateThemeDescription(theme: { theme: string; terms: string[] }, result: AnalysisResult): string {
  const themeDocs = result.documents.filter((d) =>
    sentenceContainsAny(d.text, theme.terms)
  );
  const relevantCodes = result.codes.filter((c) =>
    theme.terms.some((t) => c.code.toLowerCase().includes(t.toLowerCase()))
  );
  
  const keyTerms = theme.terms.slice(0, 5).join(", ");
  const codeExamples = relevantCodes.slice(0, 3).map((c) => c.code).join(", ");
  
  let description = `The theme of ${theme.theme} emerged across ${themeDocs.length} participant(s). `;
  description += `This theme encompasses concepts related to ${keyTerms}. `;
  if (codeExamples) {
    description += `Associated codes include: ${codeExamples}. `;
  }
  description += `Participants' narratives reveal various dimensions of this theme, as illustrated in the verbatim quotes below.`;
  
  return description;
}

function generateAcademicInterpretation(
  theme: { theme: string; terms: string[] },
  quotes: { text: string; respondentId: string }[],
  result: AnalysisResult
): string {
  const themeDocs = result.documents.filter((d) =>
    sentenceContainsAny(d.text, theme.terms)
  );
  const sentiment = themeDocs.length
    ? result.sentiment
        .filter((s) => themeDocs.some((d) => d.id === s.documentId))
        .reduce((acc, s) => acc + s.score, 0) / themeDocs.length
    : 0;
  
  const sentimentContext = sentiment > 0.2 
    ? "participants expressed positive associations with" 
    : sentiment < -0.2 
    ? "participants expressed negative associations with" 
    : "participants expressed mixed experiences regarding";
  
  const respondentCount = new Set(quotes.map((q) => q.respondentId)).size;
  
  let interpretation = `The analysis reveals that ${sentimentContext} ${theme.theme}. `;
  interpretation += `These experiences were articulated by ${respondentCount} respondent(s) in this sample. `;
  interpretation += `The verbatim statements demonstrate how ${theme.theme} manifests in participants' lived experiences. `;
  interpretation += `These findings suggest that ${theme.theme} represents a significant dimension of the phenomenon under investigation. `;
  interpretation += `The recurrent mention of related terms (e.g., ${theme.terms.slice(0, 3).join(", ")}) across multiple transcripts indicates this theme's salience. `;
  interpretation += `Further analysis may benefit from exploring how ${theme.theme} interacts with other emergent themes and contextual factors.`;
  
  return interpretation;
}

function identifySubthemes(theme: { theme: string; terms: string[] }, result: AnalysisResult): string[] {
  const relevantCodes = result.codes
    .filter((c) => theme.terms.some((t) => c.code.toLowerCase().includes(t.toLowerCase())))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3);
  
  return relevantCodes.map((c) => c.code);
}

function abstractSummary(result: AnalysisResult) {
  const topThemes = topN(result.themes, 3).map((t) => t.theme);
  const topTerms = topN(result.keywords, 5).map((k) => k.term).join(", ");
  const avgSent = result.sentiment.reduce((s, d) => s + d.score, 0) / Math.max(1, result.sentiment.length);
  const sentLabel = avgSent > 0.2 ? "overall positive" : avgSent < -0.2 ? "overall negative" : "mixed";
  return `This thematic analysis (n=${result.documents.length}) identified several key themes: ${topThemes.join(", ")}. ` +
         `Prominent conceptual terms emerging from the data include ${topTerms}. ` +
         `The overall sentiment analysis indicates ${sentLabel} experiences across the sample. ` +
         `The following sections provide detailed thematic analysis with descriptive summaries, representative verbatim quotes, and interpretive discussion for each identified theme.`;
}

export function buildMarkdownReport(
  input: {
    title?: string;
    author?: string;
    methodology?: string;
    methodologyVariations?: string;
    participantDemographics?: string;
    additionalNotes?: string;
  },
  result: AnalysisResult
) {
  const title = input.title?.trim() || "Qualitative Analysis Report";
  const author = input.author?.trim() || "Research Team";
  const methodology = input.methodology?.trim() ||
    "Automated heuristic analysis approximating NVivo-style workflows (TF-IDF keyword extraction, phrase-based auto-coding, code co-occurrence, lexicon-based sentiment, naive theme grouping).";
  const methodologyVariations = input.methodologyVariations?.trim();
  const participantDemographics = input.participantDemographics?.trim();
  const additionalNotes = input.additionalNotes?.trim();

  const numDocs = result.documents.length;
  const sampleQuotes: string[] = [];
  for (const c of topN(result.codes, 6)) {
    for (const ex of c.examples) {
      if (sampleQuotes.length < 6) sampleQuotes.push(ex);
    }
  }

  const topCodes = topN(result.codes, 12)
    .map(c => `| ${c.code} | ${c.frequency} |`)
    .join("\n");

  const topKeywords = topN(result.keywords, 25)
    .map(k => `- ${k.term}`)
    .join("\n");

  const topThemes = topN(result.themes, 8)
    .map(t => `- ${t.theme}: ${t.terms.slice(0, 6).join(", ")}`)
    .join("\n");

  const sentimentAvg = result.sentiment.reduce((s, d) => s + d.score, 0) / Math.max(1, result.sentiment.length);

  const coocTop = topN(result.cooccurrence.sort((a,b)=>b.count-a.count), 15)
    .map(c => `- ${c.a} × ${c.b}: ${c.count}`)
    .join("\n");

  const quotes = themeQuotables(result, 3);
  const abstract = abstractSummary(result);
  const topThemesForReport = topN(result.themes, 8);

  // Build thematic analysis section
  let thematicSection = "## THEMATIC ANALYSIS\n\n";
  
  for (let i = 0; i < topThemesForReport.length; i++) {
    const theme = topThemesForReport[i];
    const themeQuotes = quotes.find((q) => q.theme === theme.theme)?.quotes || [];
    const subthemes = identifySubthemes(theme, result);
    const description = generateThemeDescription(theme, result);
    const interpretation = generateAcademicInterpretation(theme, themeQuotes, result);
    
    thematicSection += `### Theme ${i + 1}: ${theme.theme.charAt(0).toUpperCase() + theme.theme.slice(1)}\n\n`;
    thematicSection += `${description}\n\n`;
    
    if (subthemes.length > 0) {
      thematicSection += `**Subthemes:** ${subthemes.join(", ")}\n\n`;
    }
    
    if (themeQuotes.length > 0) {
      thematicSection += `**Respondent Quotes:**\n\n`;
      for (const quote of themeQuotes) {
        thematicSection += `${extractRespondentId(quote.respondentId)}: "${quote.text}"\n\n`;
      }
    }
    
    thematicSection += `**Interpretation:**\n\n${interpretation}\n\n`;
    thematicSection += "---\n\n";
  }

  return `# ${title}\n\n` +
`**Author**: ${author}\\\n` +
`**Date**: ${formatDate()}\\\n` +
`**Corpus size**: ${numDocs} documents\n\n` +

`## Executive summary\n\n` +
`- Average sentiment: ${sentimentAvg.toFixed(2)} (lexicon-based scale)\n` +
`- Top themes suggest focus around: ${topN(result.themes,3).map(t=>t.theme).join(", ")}\n` +
`- Most frequent codes indicate salient concepts; see table below.\n\n` +

`## Abstract\n\n` +
`${abstract}\n\n` +

`${thematicSection}` +

`## Methodology\n\n` +
`${methodology}\n\n` +

`${methodologyVariations ? `## Methodology variations\n\n${methodologyVariations}\n\n` : ""}` +

`## Dataset description\n\n` +
`- Number of documents: ${numDocs}\n` +
`- Average document length: ${Math.round(result.documents.reduce((s,d)=>s+d.text.length,0)/Math.max(1,numDocs))} characters\n` +
`- Total corpus size: ${result.documents.reduce((s,d)=>s+d.text.length,0)} characters\n\n` +

`${participantDemographics ? `## Participant demographics\n\n${participantDemographics}\n\n` : ""}` +

`## Summary of themes\n\n` +
`The following ${topThemesForReport.length} themes were identified through the analysis:\n\n` +
`${topThemesForReport.map((t, idx) => `${idx + 1}. ${t.theme.charAt(0).toUpperCase() + t.theme.slice(1)}`).join("\n")}\n\n` +

`## Code frequency table\n\n` +
`| Code | Frequency |\n|---|---|\n` +
`${topCodes || "| (none) | 0 |"}\n\n` +

`## Keyword list (top)\n\n` +
`${topKeywords || "(none)"}\n\n` +

`## Code co-occurrence (top pairs)\n\n` +
`${coocTop || "(no co-occurrence detected)"}\n\n` +

`## Sentiment (per document)\n\n` +
`${result.sentiment.map(s => `- ${s.documentId}: ${s.score.toFixed(2)}`).join("\n")}\n\n` +

`${additionalNotes ? `## Additional notes\n\n${additionalNotes}\n\n` : ""}` +

`## Limitations\n\n` +
`This is an automated, heuristic analysis intended to accelerate initial synthesis. Manual coding, inter-rater reliability checks, and triangulation with additional data sources are recommended for publication-grade studies.`;
}


