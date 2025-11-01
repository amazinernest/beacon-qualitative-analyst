type Document = { id: string; text: string };

const STOPWORDS = new Set(
  [
    "the","a","an","and","or","but","about","above","after","again","against","all","am","an","and","any","are","as","at","be","because","been","before","being","below","between","both","by","could","did","do","does","doing","down","during","each","few","for","from","further","had","has","have","having","he","her","here","hers","herself","him","himself","his","how","i","if","in","into","is","it","its","itself","let","me","more","most","my","myself","no","nor","not","of","off","on","once","only","other","our","ours","ourselves","out","over","own","s","same","she","should","so","some","such","t","than","that","the","their","theirs","them","themselves","then","there","these","they","this","those","through","to","too","under","until","up","very","was","we","were","what","when","where","which","while","who","whom","why","with","you","your","yours","yourself","yourselves",
  ]
);

// Minimal AFINN-like sentiment scores (subset)
const AFINN: Record<string, number> = {
  good: 3, great: 3, excellent: 4, amazing: 4, love: 3, loved: 3, smooth: 2, help: 1, helpful: 2,
  bad: -3, poor: -2, terrible: -4, awful: -4, confusing: -2, struggle: -2, struggled: -2, hate: -3,
  easy: 2, difficult: -2, issue: -1, issues: -1, bug: -2, slow: -2, fast: 2, clear: 2, unclear: -2,
  confusingly: -2, delighted: 3, delightedly: 3, frustrating: -3, frustration: -2, satisfied: 2,
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

function autoCodes(documents: Document[]): { code: string; examples: string[]; frequency: number }[] {
  const phraseCounts = new Map<string, { count: number; examples: string[] }>();
  for (const doc of documents) {
    const tokens = tokenize(doc.text);
    const phrases = [
      ...ngrams(tokens, 2),
      ...ngrams(tokens, 3),
    ];
    for (const p of phrases) {
      if (p.split(" ").some((w) => w.length < 3)) continue;
      const entry = phraseCounts.get(p) || { count: 0, examples: [] };
      entry.count += 1;
      if (entry.examples.length < 5) entry.examples.push(doc.text.slice(0, 180));
      phraseCounts.set(p, entry);
    }
  }

  const items = Array.from(phraseCounts.entries())
    .map(([code, v]) => ({ code, frequency: v.count, examples: v.examples }))
    .filter((c) => c.frequency > 1)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 40);

  // If too sparse, fallback to top keywords as codes
  if (items.length < 10) {
    const kws = keywordScores(documents).slice(0, 20);
    return kws.map((k) => ({ code: k.term, frequency: Math.round(k.score), examples: [] }));
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

function simpleThemes(keywords: { term: string; score: number }[]) {
  // Group top keywords by shared stems (very naive)
  const groups: Record<string, Set<string>> = {};
  const top = keywords.slice(0, 50);
  const stem = (w: string) => w.replace(/(ing|ed|ly|s)$/i, "");
  for (const kw of top) {
    const s = stem(kw.term);
    if (!groups[s]) groups[s] = new Set();
    groups[s].add(kw.term);
  }
  return Object.entries(groups)
    .map(([root, terms]) => ({ theme: root, terms: Array.from(terms) }))
    .slice(0, 12);
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


