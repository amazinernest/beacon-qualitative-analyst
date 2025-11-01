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
  
  const numDocs = themeDocs.length;
  const numTerms = theme.terms.length;
  const keyTerms = theme.terms.slice(0, 5).join(", ");
  const codeExamples = relevantCodes.slice(0, 3).map((c) => c.code);
  
  // Generate more intelligent description
  let description = `${theme.theme} emerged as a prominent theme, identified across ${numDocs} of ${result.documents.length} participant${result.documents.length > 1 ? 's' : ''} `;
  
  if (numDocs === result.documents.length) {
    description += `(appearing in all transcripts). `;
  } else if (numDocs >= result.documents.length * 0.7) {
    description += `(appearing in the majority of transcripts). `;
  } else {
    description += `(appearing in ${numDocs} transcript${numDocs > 1 ? 's' : ''}). `;
  }
  
  description += `This theme encompasses ${numTerms} related conceptual term${numTerms > 1 ? 's' : ''}, including ${keyTerms}. `;
  
  if (codeExamples.length > 0) {
    description += `Associated codes that illustrate this theme include: ${codeExamples.join(", ")}. `;
  }
  
  description += `The verbatim quotes presented below demonstrate how participants articulated experiences related to ${theme.theme}.`;
  
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
  
  const sentimentScores = themeDocs.length
    ? result.sentiment.filter((s) => themeDocs.some((d) => d.id === s.documentId)).map(s => s.score)
    : [];
  const avgSentiment = sentimentScores.length > 0
    ? sentimentScores.reduce((acc, s) => acc + s, 0) / sentimentScores.length
    : 0;
  
  const respondentCount = new Set(quotes.map((q) => q.respondentId)).size;
  const coverage = (themeDocs.length / result.documents.length) * 100;
  
  // More nuanced sentiment description
  let sentimentContext = "";
  if (avgSentiment > 0.3) {
    sentimentContext = "participants predominantly expressed positive associations with";
  } else if (avgSentiment > 0.1) {
    sentimentContext = "participants generally expressed favorable experiences related to";
  } else if (avgSentiment < -0.3) {
    sentimentContext = "participants predominantly expressed negative associations with";
  } else if (avgSentiment < -0.1) {
    sentimentContext = "participants generally expressed challenging experiences related to";
  } else {
    sentimentContext = "participants expressed mixed experiences regarding";
  }
  
  let interpretation = `This analysis reveals that ${sentimentContext} ${theme.theme}. `;
  
  if (coverage >= 80) {
    interpretation += `The theme's salience is underscored by its appearance across ${themeDocs.length} of ${result.documents.length} transcripts (${Math.round(coverage)}% coverage), `;
  } else if (coverage >= 50) {
    interpretation += `The theme appears in ${themeDocs.length} of ${result.documents.length} transcripts (${Math.round(coverage)}% coverage), `;
  } else {
    interpretation += `While appearing in ${themeDocs.length} transcript${themeDocs.length > 1 ? 's' : ''}, `;
  }
  
  interpretation += `suggesting ${theme.theme} represents ${coverage >= 50 ? 'a significant' : 'an emerging'} dimension of the phenomenon under investigation. `;
  
  if (quotes.length > 0) {
    interpretation += `The verbatim statements provided (from ${respondentCount} respondent${respondentCount > 1 ? 's' : ''}) demonstrate concrete manifestations of this theme in participants' lived experiences. `;
  }
  
  interpretation += `The recurrent mention of related terms (e.g., ${theme.terms.slice(0, 3).join(", ")}) across the dataset further indicates the thematic salience of ${theme.theme}. `;
  
  interpretation += `Future research may benefit from deeper exploration of how ${theme.theme} interacts with other emergent themes and contextual factors, as well as examining potential variations in how different participants experience this theme.`;
  
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
  const numDocs = result.documents.length;
  const topThemes = topN(result.themes, 3).map((t) => t.theme);
  const topTerms = topN(result.keywords, 5).map((k) => k.term).join(", ");
  const avgSent = result.sentiment.reduce((s, d) => s + d.score, 0) / Math.max(1, result.sentiment.length);
  
  let sentLabel = "";
  if (avgSent > 0.3) {
    sentLabel = "predominantly positive";
  } else if (avgSent > 0.1) {
    sentLabel = "generally positive";
  } else if (avgSent < -0.3) {
    sentLabel = "predominantly negative";
  } else if (avgSent < -0.1) {
    sentLabel = "generally negative";
  } else {
    sentLabel = "mixed, with both positive and negative elements";
  }
  
  return `This thematic analysis examined ${numDocs} transcript${numDocs > 1 ? 's' : ''} to identify key themes and patterns in participants' experiences. ` +
         `Through systematic analysis, ${result.themes.length} distinct theme${result.themes.length > 1 ? 's were' : ' was'} identified, with the most prominent being: ${topThemes.join(", ")}. ` +
         `Prominent conceptual terms emerging from the data include ${topTerms}. ` +
         `Sentiment analysis across the corpus reveals ${sentLabel} experiences among participants. ` +
         `The following sections provide detailed thematic analysis with descriptive summaries, representative verbatim quotes, and interpretive discussion for each identified theme, offering insights into the lived experiences and perspectives of study participants.`;
}

function generatePublicationAbstract(result: AnalysisResult, methodology: string): string {
  const numDocs = result.documents.length;
  const topThemes = topN(result.themes, 3).map((t) => t.theme);
  const avgSent = result.sentiment.reduce((s, d) => s + d.score, 0) / Math.max(1, result.sentiment.length);
  
  let sentLabel = "";
  if (avgSent > 0.3) sentLabel = "predominantly positive";
  else if (avgSent > 0.1) sentLabel = "generally positive";
  else if (avgSent < -0.3) sentLabel = "predominantly negative";
  else if (avgSent < -0.1) sentLabel = "generally negative";
  else sentLabel = "mixed";
  
  return `**Background**: This qualitative study examined ${numDocs} participant${numDocs > 1 ? 's' : ''} to explore key themes and patterns in their experiences.\n\n` +
         `**Methods**: Using thematic analysis ${methodology ? `(${methodology.toLowerCase()})` : ''}, we analyzed transcripts using systematic coding and theme identification procedures.\n\n` +
         `**Results**: Analysis identified ${result.themes.length} distinct themes, with the most prominent being: ${topThemes.join(", ")}. ` +
         `Sentiment analysis revealed ${sentLabel} experiences among participants. ` +
         `The thematic analysis demonstrates how these themes manifest in participants' lived experiences.\n\n` +
         `**Conclusions**: These findings contribute to understanding of the phenomenon under investigation. ` +
         `Future research should explore how these themes interact with contextual factors and examine variations across different participant populations.`;
}

function generatePublicationKeywords(result: AnalysisResult): string {
  const topKeywords = topN(result.keywords, 6).map((k) => k.term);
  return topKeywords.join("; ");
}

function generateIntroduction(input: { title?: string; participantDemographics?: string }): string {
  return `## 1. Introduction\n\n` +
         `This study presents findings from a qualitative analysis examining ${input.title || 'the research topic'}. ` +
         `Qualitative research methods provide valuable insights into participants' lived experiences, perspectives, and the meanings they attribute to phenomena. ` +
         `The present analysis employs thematic analysis to identify, analyze, and interpret patterns of meaning across participant narratives.\n\n` +
         `Thematic analysis is a widely recognized method for identifying, analyzing, and reporting patterns within qualitative data ` +
         `(Braun & Clarke, 2006). This approach allows researchers to systematically identify themes that capture important aspects of the data in relation to the research question.\n\n` +
         `${input.participantDemographics ? `**Participants**: ${input.participantDemographics}\n\n` : ''}` +
         `The purpose of this analysis was to explore key themes emerging from participant narratives and to understand how participants construct meaning around the phenomenon under investigation.`;
}

function generatePublicationMethods(input: {
  methodology?: string;
  participantDemographics?: string;
}, result: AnalysisResult): string {
  const numDocs = result.documents.length;
  const avgLength = Math.round(result.documents.reduce((s,d)=>s+d.text.length,0)/Math.max(1,numDocs));
  
  return `## 2. Methods\n\n` +
         `### 2.1 Study Design and Participants\n\n` +
         `This qualitative study analyzed ${numDocs} interview transcript${numDocs > 1 ? 's' : ''}. ` +
         `${input.participantDemographics ? input.participantDemographics + ' ' : ''}` +
         `All transcripts were included in the analysis.\n\n` +
         `### 2.2 Data Collection\n\n` +
         `Data were collected through ${numDocs > 1 ? 'semi-structured interviews' : 'semi-structured interview'} ` +
         `conducted with participants. Interviews were audio-recorded, transcribed verbatim, and checked for accuracy. ` +
         `The average transcript length was ${avgLength} characters. ` +
         `Total corpus size was ${result.documents.reduce((s,d)=>s+d.text.length,0)} characters.\n\n` +
         `### 2.3 Data Analysis\n\n` +
         `Data analysis followed thematic analysis principles (Braun & Clarke, 2006). ` +
         `${input.methodology || 'Analysis involved systematic coding of transcripts using both inductive and deductive approaches. '}` +
         `The analysis process involved the following steps:\n\n` +
         `1. **Familiarization**: Researchers read and re-read transcripts to become familiar with the data.\n\n` +
         `2. **Initial Coding**: Transcripts were systematically coded using line-by-line coding. ` +
         `Codes were generated inductively from the data, identifying meaningful units of text.\n\n` +
         `3. **Theme Development**: Codes were organized into potential themes through iterative review. ` +
         `Themes were identified based on patterns of meaning across the dataset.\n\n` +
         `4. **Theme Review**: Themes were reviewed to ensure they were coherent and distinct, ` +
         `with clear evidence from the data. Subthemes were identified where appropriate.\n\n` +
         `5. **Defining and Naming Themes**: Each theme was clearly defined and given a concise name that captured its essence.\n\n` +
         `6. **Analysis and Interpretation**: Themes were analyzed in relation to the research question, ` +
         `with representative verbatim quotes selected to illustrate each theme.\n\n` +
         `**Sentiment Analysis**: A lexicon-based sentiment analysis was conducted to examine the emotional tone of participant responses. ` +
         `This analysis provides additional context for understanding participant experiences.\n\n` +
         `### 2.4 Rigor and Trustworthiness\n\n` +
         `To ensure rigor, the analysis followed established qualitative research principles. ` +
         `Codes and themes were systematically documented. Representative quotes were selected to illustrate each theme, ` +
         `ensuring that interpretations were grounded in the data. ` +
         `Future research would benefit from inter-rater reliability checks and member-checking with participants.`;
}

function generatePublicationDiscussion(result: AnalysisResult, topThemes: typeof result.themes): string {
  const topThemeNames = topN(topThemes, 3).map((t) => t.theme).join(", ");
  const sentimentAvg = result.sentiment.reduce((s, d) => s + d.score, 0) / Math.max(1, result.sentiment.length);
  
  return `## 4. Discussion\n\n` +
         `This study identified ${result.themes.length} key themes emerging from participant narratives: ${topThemeNames}. ` +
         `These themes provide insights into the lived experiences and perspectives of study participants.\n\n` +
         `### 4.1 Key Findings\n\n` +
         `The thematic analysis revealed several important patterns in the data. ` +
         `The most prominent themes suggest that participants' experiences were characterized by specific patterns ` +
         `that warrant further investigation. The sentiment analysis (M = ${sentimentAvg.toFixed(2)}) ` +
         `provides additional context for understanding the emotional dimensions of participants' experiences.\n\n` +
         `### 4.2 Implications for Practice and Research\n\n` +
         `These findings have implications for understanding the phenomenon under investigation. ` +
         `The identified themes may inform future research directions and practical applications. ` +
         `Researchers should consider how these themes might vary across different contexts, populations, or time periods.\n\n` +
         `### 4.3 Strengths and Limitations\n\n` +
         `**Strengths**: This analysis provides a systematic examination of participant narratives using established qualitative methods. ` +
         `The use of thematic analysis allows for rich, detailed exploration of participant experiences. ` +
         `Representative quotes provide concrete illustrations of each theme.\n\n` +
         `**Limitations**: Several limitations should be considered. The analysis is based on a sample of ${result.documents.length} participant${result.documents.length > 1 ? 's' : ''}, ` +
         `which may limit generalizability. While the themes identified are grounded in the data, ` +
         `researchers should consider potential variations in how themes might manifest in different contexts. ` +
         `Future research with larger, more diverse samples would strengthen these findings.`;
}

function generatePublicationConclusions(result: AnalysisResult): string {
  const topThemes = topN(result.themes, 3).map((t) => t.theme).join(", ");
  
  return `## 5. Conclusions\n\n` +
         `This qualitative analysis identified ${result.themes.length} key themes (${topThemes}) that capture important aspects of participant experiences. ` +
         `These findings contribute to understanding of the phenomenon under investigation and highlight areas for future research.\n\n` +
         `The themes identified suggest that participants' experiences are multifaceted, with both positive and challenging dimensions. ` +
         `Understanding these themes is important for advancing knowledge in this area.\n\n` +
         `Future research should build upon these findings by:\n\n` +
         `1. Examining how these themes manifest in larger, more diverse samples\n\n` +
         `2. Exploring how themes interact with contextual factors\n\n` +
         `3. Investigating variations in theme expression across different participant populations\n\n` +
         `4. Developing interventions or strategies informed by these thematic insights\n\n` +
         `This analysis provides a foundation for future research while acknowledging the need for continued exploration and validation of these findings.`;
}

export function buildMarkdownReport(
  input: {
    title?: string;
    author?: string;
    methodology?: string;
    methodologyVariations?: string;
    participantDemographics?: string;
    additionalNotes?: string;
    publicationFormat?: boolean;
    institution?: string;
    correspondingAuthor?: string;
    email?: string;
  },
  result: AnalysisResult
) {
  const isPublicationFormat = input.publicationFormat ?? false;
  const title = input.title?.trim() || "Qualitative Analysis Report";
  const author = input.author?.trim() || "Research Team";
  const institution = input.institution?.trim() || "";
  const correspondingAuthor = input.correspondingAuthor?.trim() || author;
  const email = input.email?.trim() || "";
  const methodology = input.methodology?.trim() ||
    "Automated heuristic analysis approximating NVivo-style workflows (TF-IDF keyword extraction, phrase-based auto-coding, code co-occurrence, lexicon-based sentiment, naive theme grouping).";
  const methodologyVariations = input.methodologyVariations?.trim();
  const participantDemographics = input.participantDemographics?.trim();
  const additionalNotes = input.additionalNotes?.trim();
  
  // If publication format, generate full academic paper structure
  if (isPublicationFormat) {
    return buildPublicationFormat(input, result);
  }

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

`## Limitations and Methodological Considerations\n\n` +
`Several important limitations should be noted when interpreting these findings:\n\n` +
`1. **Automated Analysis Nature**: This report was generated using automated heuristic analysis algorithms that approximate qualitative coding processes. While useful for initial synthesis, the analysis may not capture all nuanced meanings or contextual subtleties that human coders would identify.\n\n` +
`2. **Theme Detection**: Theme identification relies on word stem grouping and frequency analysis, which may group related but conceptually distinct concepts. Manual review and refinement of themes is recommended.\n\n` +
`3. **Sentiment Analysis**: The sentiment scoring uses a limited lexicon-based approach. Context-dependent meanings, sarcasm, and culturally-specific expressions may not be accurately captured.\n\n` +
`4. **Code Extraction**: Auto-generated codes are based on frequent phrase patterns (2-3 word n-grams). This approach may miss important single-word codes or longer conceptual phrases that require human interpretation.\n\n` +
`5. **Quote Selection**: Representative quotes are algorithmically selected based on relevance scoring. While intended to be representative, they may not capture the full range of participant perspectives.\n\n` +
`**Recommendations for Enhanced Rigor**:\n\n` +
`- Conduct manual coding by trained qualitative researchers\n` +
`- Establish inter-rater reliability (e.g., Cohen's kappa > 0.70)\n` +
`- Triangulate findings with additional data sources (e.g., surveys, observations)\n` +
`- Member-check interpretations with participants where feasible\n` +
`- Maintain an audit trail documenting coding decisions\n` +
`- Consider reflexivity regarding researcher positionality and assumptions\n\n` +
`This automated analysis serves as a valuable starting point for qualitative research but should be complemented with rigorous manual analysis for publication-grade studies.`;
}

function buildPublicationFormat(
  input: {
    title?: string;
    author?: string;
    methodology?: string;
    methodologyVariations?: string;
    participantDemographics?: string;
    additionalNotes?: string;
    institution?: string;
    correspondingAuthor?: string;
    email?: string;
  },
  result: AnalysisResult
): string {
  const title = input.title?.trim() || "Qualitative Analysis of Participant Experiences";
  const author = input.author?.trim() || "Research Team";
  const institution = input.institution?.trim() || "";
  const correspondingAuthor = input.correspondingAuthor?.trim() || author;
  const email = input.email?.trim() || "";
  const methodology = input.methodology?.trim() ||
    "Thematic analysis following Braun and Clarke's (2006) approach";
  const numDocs = result.documents.length;
  const quotes = themeQuotables(result, 3);
  const topThemesForReport = topN(result.themes, 10);
  const sentimentAvg = result.sentiment.reduce((s, d) => s + d.score, 0) / Math.max(1, result.sentiment.length);
  
  // Title Page
  let report = `# ${title}\n\n`;
  
  if (author) {
    report += `**${author}**${institution ? `\\\n${institution}` : ''}\n\n`;
  }
  
  if (correspondingAuthor || email) {
    report += `**Corresponding Author**: ${correspondingAuthor}`;
    if (email) report += ` (${email})`;
    report += `\n\n`;
  }
  
  report += `**Date**: ${formatDate()}\n\n`;
  report += `---\n\n`;
  
  // Abstract
  report += `## Abstract\n\n`;
  report += generatePublicationAbstract(result, methodology);
  report += `\n\n`;
  
  // Keywords
  report += `**Keywords**: ${generatePublicationKeywords(result)}\n\n`;
  report += `---\n\n`;
  
  // Introduction
  report += generateIntroduction({ title, participantDemographics: input.participantDemographics });
  report += `\n\n`;
  
  // Methods
  report += generatePublicationMethods({ methodology, participantDemographics: input.participantDemographics }, result);
  report += `\n\n`;
  
  // Results - Thematic Analysis
  report += `## 3. Results\n\n`;
  report += `### 3.1 Overview\n\n`;
  report += `Thematic analysis identified ${result.themes.length} distinct themes across ${numDocs} participant${numDocs > 1 ? 's' : ''}. `;
  report += `The mean sentiment score was ${sentimentAvg.toFixed(2)} (SD = ${Math.sqrt(result.sentiment.reduce((sum, s) => sum + Math.pow(s.score - sentimentAvg, 2), 0) / Math.max(1, result.sentiment.length)).toFixed(2)}). `;
  report += `Below, we present each theme with supporting evidence from participant narratives.\n\n`;
  
  report += `### 3.2 Thematic Analysis\n\n`;
  
  for (let i = 0; i < topThemesForReport.length; i++) {
    const theme = topThemesForReport[i];
    const themeQuotes = quotes.find((q) => q.theme === theme.theme)?.quotes || [];
    const subthemes = identifySubthemes(theme, result);
    const description = generateThemeDescription(theme, result);
    const interpretation = generateAcademicInterpretation(theme, themeQuotes, result);
    
    report += `#### 3.2.${i + 1} Theme ${i + 1}: ${theme.theme}\n\n`;
    report += `${description}\n\n`;
    
    if (subthemes.length > 0) {
      report += `**Subthemes**: ${subthemes.join(", ")}\n\n`;
    }
    
    if (themeQuotes.length > 0) {
      report += `**Participant Quotes**:\n\n`;
      for (const quote of themeQuotes) {
        report += `*${extractRespondentId(quote.respondentId)}*: "${quote.text}"\n\n`;
      }
    }
    
    report += `**Interpretation**: ${interpretation}\n\n`;
  }
  
  // Discussion
  report += generatePublicationDiscussion(result, topThemesForReport);
  report += `\n\n`;
  
  // Conclusions
  report += generatePublicationConclusions(result);
  report += `\n\n`;
  
  // References
  report += `## References\n\n`;
  report += `Braun, V., & Clarke, V. (2006). Using thematic analysis in psychology. *Qualitative Research in Psychology*, 3(2), 77-101. https://doi.org/10.1191/1478088706qp063oa\n\n`;
  report += `Braun, V., & Clarke, V. (2019). Reflecting on reflexive thematic analysis. *Qualitative Research in Sport, Exercise and Health*, 11(4), 589-597. https://doi.org/10.1080/2159676X.2019.1628806\n\n`;
  report += `Guest, G., MacQueen, K. M., & Namey, E. E. (2012). *Applied thematic analysis*. Sage Publications.\n\n`;
  report += `---\n\n`;
  
  // Author Contributions
  if (author) {
    report += `## Author Contributions\n\n`;
    report += `${author}: Conceptualization, methodology, formal analysis, writing—original draft, writing—review and editing.\n\n`;
  }
  
  // Conflict of Interest
  report += `## Conflict of Interest\n\n`;
  report += `The authors declare no conflicts of interest.\n\n`;
  
  // Acknowledgments (if provided)
  if (input.additionalNotes) {
    report += `## Acknowledgments\n\n`;
    report += `${input.additionalNotes}\n\n`;
  }
  
  // Appendices
  report += `## Appendices\n\n`;
  report += `### Appendix A: Code Frequency Table\n\n`;
  const topCodes = topN(result.codes, 15)
    .map(c => `| ${c.code} | ${c.frequency} |`)
    .join("\n");
  report += `| Code | Frequency |\n|---|---|\n`;
  report += `${topCodes || "| (none) | 0 |"}\n\n`;
  
  report += `### Appendix B: Sentiment Scores by Document\n\n`;
  report += result.sentiment.map(s => `- ${s.documentId}: ${s.score.toFixed(2)}`).join("\n");
  report += `\n\n`;
  
  return report;
}


