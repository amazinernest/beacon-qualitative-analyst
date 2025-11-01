type Document = { id: string; text: string };

const STOPWORDS = new Set(
  [
    "the","a","an","and","or","but","about","above","after","again","against","all","am","an","and","any","are","as","at","be","because","been","before","being","below","between","both","by","could","did","do","does","doing","down","during","each","few","for","from","further","had","has","have","having","he","her","here","hers","herself","him","himself","his","how","i","if","in","into","is","it","its","itself","let","me","more","most","my","myself","no","nor","not","of","off","on","once","only","other","our","ours","ourselves","out","over","own","s","same","she","should","so","some","such","t","than","that","the","their","theirs","them","themselves","then","there","these","they","this","those","through","to","too","under","until","up","very","was","we","were","what","when","where","which","while","who","whom","why","with","you","your","yours","yourself","yourselves",
  ]
);

// Enhanced AFINN-like sentiment scores
const AFINN: Record<string, number> = {
  // Positive
  good: 3, great: 3, excellent: 4, amazing: 4, love: 3, loved: 3, smooth: 2, help: 1, helpful: 2,
  easy: 2, clear: 2, fast: 2, delighted: 3, satisfied: 2, happy: 3, pleased: 2, wonderful: 3,
  fantastic: 4, perfect: 3, awesome: 3, nice: 2, better: 2, best: 3, fine: 1, positive: 2,
  superb: 3, outstanding: 4, brilliant: 3, grateful: 2, appreciate: 2, enjoyed: 2,
  // Negative
  bad: -3, poor: -2, terrible: -4, awful: -4, confusing: -2, struggle: -2, struggled: -2, hate: -3,
  difficult: -2, issue: -1, issues: -1, bug: -2, slow: -2, unclear: -2, confusingly: -2,
  frustrating: -3, frustration: -2, upset: -2, angry: -3, disappointed: -2, worried: -2,
  concerned: -1, problem: -2, problems: -2, fail: -3, failed: -3, failure: -3, wrong: -2,
  worse: -2, worst: -3, horrible: -4, disgusting: -4, annoying: -2, stressed: -2,
  // Neutral/Contextual
  sad: -2, ignored: -2, lonely: -2, rejected: -3, alone: -1, hard: -1, tough: -1,
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function ngrams(tokens: string[], n: number): string[] {
  const grams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    grams.push(tokens.slice(i, i + n).join(" "));
  }
  return grams;
}

function keywordScores(documents: Document[]): { term: string; score: number }[] {
  const termCounts = new Map<string, number>();
  const docFreq = new Map<string, number>();

  for (const doc of documents) {
    const tokens = tokenize(doc.text);
    const unique = new Set(tokens);
    for (const t of tokens) termCounts.set(t, (termCounts.get(t) || 0) + 1);
    for (const t of unique) docFreq.set(t, (docFreq.get(t) || 0) + 1);
  }

  const N = documents.length;
  const scored: { term: string; score: number }[] = [];
  for (const [term, count] of termCounts) {
    const df = docFreq.get(term) || 1;
    const idf = Math.log((N + 1) / (df + 1)) + 1; // smoothed
    scored.push({ term, score: count * idf });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 200);
}

function extractMeaningfulQuotes(text: string, phrase: string, maxLength = 180): string {
  const lowerText = text.toLowerCase();
  const lowerPhrase = phrase.toLowerCase();
  const index = lowerText.indexOf(lowerPhrase);
  
  if (index === -1) return text.slice(0, maxLength).trim();
  
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + phrase.length + 100);
  let quote = text.slice(start, end).trim();
  
  // Try to start at sentence beginning
  const sentenceStart = quote.lastIndexOf(/[.!?]\s+/.exec(quote)?.[0] || quote);
  if (sentenceStart > 0 && sentenceStart < 50) {
    quote = quote.slice(sentenceStart + 2);
  }
  
  // Try to end at sentence end
  const sentenceEnd = quote.search(/[.!?]\s+/);
  if (sentenceEnd > 0 && sentenceEnd < quote.length - 20) {
    quote = quote.slice(0, sentenceEnd + 1);
  }
  
  return quote.slice(0, maxLength).trim() + (quote.length > maxLength ? "..." : "");
}

function autoCodes(documents: Document[]): { code: string; examples: string[]; frequency: number }[] {
  const phraseCounts = new Map<string, { count: number; examples: Map<string, string> }>();
  
  for (const doc of documents) {
    const tokens = tokenize(doc.text);
    const phrases = [
      ...ngrams(tokens, 2),
      ...ngrams(tokens, 3),
    ];
    
    for (const p of phrases) {
      if (p.split(" ").some((w) => w.length < 3)) continue;
      const entry = phraseCounts.get(p) || { count: 0, examples: new Map() };
      entry.count += 1;
      
      // Extract meaningful quote containing this phrase
      const quote = extractMeaningfulQuotes(doc.text, p);
      if (quote && !entry.examples.has(quote.toLowerCase())) {
        entry.examples.set(quote.toLowerCase(), quote);
      }
      
      phraseCounts.set(p, entry);
    }
  }

  const items = Array.from(phraseCounts.entries())
    .map(([code, v]) => ({
      code,
      frequency: v.count,
      examples: Array.from(v.examples.values()).slice(0, 5),
    }))
    .filter((c) => c.frequency > 1 && c.examples.length > 0)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 40);

  // If too sparse, fallback to top keywords as codes
  if (items.length < 10) {
    const kws = keywordScores(documents).slice(0, 20);
    return kws.map((k) => {
      // Find examples for keywords
      const examples: string[] = [];
      for (const doc of documents) {
        if (doc.text.toLowerCase().includes(k.term.toLowerCase())) {
          const quote = extractMeaningfulQuotes(doc.text, k.term);
          if (quote && !examples.includes(quote)) {
            examples.push(quote);
            if (examples.length >= 3) break;
          }
        }
      }
      return { code: k.term, frequency: Math.round(k.score), examples };
    });
  }
  return items;
}

function computeCooccurrence(codes: string[], doc: string): Set<string> {
  const present = new Set<string>();
  const lower = doc.toLowerCase();
  for (const c of codes) {
    if (lower.includes(c.toLowerCase())) present.add(c);
  }
  return present;
}

function cooccurrenceMatrix(documents: Document[], codes: string[]) {
  const counts = new Map<string, number>();
  for (const doc of documents) {
    const present = Array.from(computeCooccurrence(codes, doc.text));
    for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        const a = present[i];
        const b = present[j];
        const key = a < b ? `${a}|||${b}` : `${b}|||${a}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  return Array.from(counts.entries()).map(([k, count]) => {
    const [a, b] = k.split("|||");
    return { a, b, count };
  });
}

function sentimentFor(doc: string): number {
  const tokens = tokenize(doc);
  if (tokens.length === 0) return 0;
  let sum = 0;
  for (const t of tokens) sum += AFINN[t] || 0;
  return sum / Math.sqrt(tokens.length);
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizeThemeName(name: string): string {
  // Handle multi-word themes
  if (name.includes(" ")) {
    return name.split(" ").map(capitalizeFirst).join(" ");
  }
  return capitalizeFirst(name);
}

function simpleThemes(keywords: { term: string; score: number }[]): { theme: string; terms: string[] }[] {
  // Enhanced theme grouping with better stem detection
  const groups: Record<string, { terms: Set<string>; scores: number[] }> = {};
  const top = keywords.slice(0, 60);
  
  const stem = (w: string): string => {
    // More sophisticated stemming
    w = w.toLowerCase();
    // Remove common suffixes
    w = w.replace(/(ing|ed|ly|s|es|er|est|tion|sion|ness|ment)$/i, "");
    return w;
  };
  
  for (const kw of top) {
    const stemmed = stem(kw.term);
    if (stemmed.length < 3) continue;
    
    if (!groups[stemmed]) {
      groups[stemmed] = { terms: new Set(), scores: [] };
    }
    groups[stemmed].terms.add(kw.term);
    groups[stemmed].scores.push(kw.score);
  }
  
  // Filter and rank themes
  const themes = Object.entries(groups)
    .filter(([root, data]) => data.terms.size >= 2 || (data.terms.size === 1 && data.scores[0] > 5))
    .map(([root, data]) => {
      const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      const terms = Array.from(data.terms).sort((a, b) => {
        const aScore = keywords.find(k => k.term === a)?.score || 0;
        const bScore = keywords.find(k => k.term === b)?.score || 0;
        return bScore - aScore;
      });
      return {
        root,
        theme: normalizeThemeName(root),
        terms,
        avgScore,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 15)
    .map(({ theme, terms }) => ({ theme, terms }));
  
  return themes;
}

export function analyzeCorpus(rawDocs: string[]) {
  const documents: Document[] = rawDocs.map((t, i) => ({ id: `doc_${i + 1}`, text: t }));

  const keywords = keywordScores(documents);
  const codes = autoCodes(documents);
  const codeLabels = codes.map((c) => c.code);
  const cooccurrence = cooccurrenceMatrix(documents, codeLabels);
  const sentiment = documents.map((d) => ({ documentId: d.id, score: sentimentFor(d.text) }));
  const themes = simpleThemes(keywords);

  return { documents, keywords, codes, cooccurrence, sentiment, themes };
}


