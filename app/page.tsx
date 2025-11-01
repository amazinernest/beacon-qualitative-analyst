"use client";

import { useState } from "react";

type AnalysisResponse = {
  documents: { id: string; text: string }[];
  codes: { code: string; examples: string[]; frequency: number }[];
  cooccurrence: { a: string; b: string; count: number }[];
  sentiment: { documentId: string; score: number }[];
  keywords: { term: string; score: number }[];
  themes: { theme: string; terms: string[] }[];
};

export default function HomePage() {
  const [rawInput, setRawInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportMd, setReportMd] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportMeta, setReportMeta] = useState({
    title: "Qualitative Analysis Report",
    author: "",
    methodology: "",
    methodologyVariations: "",
    participantDemographics: "",
    additionalNotes: "",
  });

  async function onAnalyze() {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const cleaned = rawInput
        .split(/\n\n+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: cleaned }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as AnalysisResponse;
      setResult(json);
      setReportMd(null);
    } catch (e: any) {
      setError(e?.message || "Failed to analyze");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function onGenerateReport() {
    if (!rawInput.trim()) return;
    try {
      const cleaned = rawInput
        .split(/\n\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: cleaned, ...reportMeta }),
      });
      if (!res.ok) throw new Error(await res.text());
      const text = await res.text();
      setReportMd(text);
      setShowReportForm(false);
    } catch (e: any) {
      setError(e?.message || "Failed to generate report");
    }
  }

  function escapeHtml(text: string) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function onExportPDF() {
    if (!reportMd) return;
    const win = window.open("", "_blank");
    if (!win) return;

    let html = "";
    let inTable = false;
    const lines = reportMd.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('# ')) {
        html += `<h1>${escapeHtml(trimmed.slice(2))}</h1>\n`;
      } else if (trimmed.startsWith('## ')) {
        html += `<h2>${escapeHtml(trimmed.slice(3))}</h2>\n`;
      } else if (trimmed.startsWith('### ')) {
        html += `<h3>${escapeHtml(trimmed.slice(4))}</h3>\n`;
      } else if (trimmed.startsWith('> ')) {
        html += `<blockquote>${escapeHtml(trimmed.slice(2))}</blockquote>\n`;
      } else if (trimmed.startsWith('|') && trimmed.includes('|')) {
        if (!inTable) {
          html += '<table>\n';
          inTable = true;
        }
        const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
        const isHeader = i > 0 && lines[i - 1]?.trim().startsWith('|') && lines[i + 1]?.trim().startsWith('|---');
        const tag = isHeader || (i === 1 && lines[0]?.trim().startsWith('|')) ? 'th' : 'td';
        html += `<tr>${cells.map(c => `<${tag}>${escapeHtml(c)}</${tag}>`).join('')}</tr>\n`;
        if (i + 1 < lines.length && lines[i + 1]?.trim().startsWith('|---')) {
          i++;
        }
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (inTable) {
          html += '</table>\n';
          inTable = false;
        }
        html += `<ul><li>${escapeHtml(trimmed.slice(2))}</li></ul>\n`;
      } else if (trimmed === '') {
        if (inTable) {
          html += '</table>\n';
          inTable = false;
        }
        html += '<br>\n';
      } else {
        if (inTable) {
          html += '</table>\n';
          inTable = false;
        }
        let processed = escapeHtml(trimmed);
        processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<p>${processed}</p>\n`;
      }
    }
    if (inTable) html += '</table>\n';

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(reportMeta.title || "Report")}</title>
          <style>
            @media print {
              @page { margin: 2cm; }
              body { margin: 0; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            h1 { border-bottom: 2px solid #333; padding-bottom: 10px; margin-top: 0; }
            h2 { margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            h3 { margin-top: 20px; }
            table { border-collapse: collapse; width: 100%; margin: 15px 0; }
            table td, table th { border: 1px solid #ddd; padding: 8px; text-align: left; }
            table th { background-color: #f3f4f6; font-weight: 600; }
            blockquote { border-left: 4px solid #ddd; padding-left: 15px; margin: 15px 0; color: #555; }
            ul { margin: 10px 0; padding-left: 25px; }
            li { margin: 5px 0; }
            p { margin: 10px 0; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 250);
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Beacon Qualitative Analyst</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Paste multiple transcripts below. Separate interviews with a blank line.
      </p>

      <textarea
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        placeholder={`Paste transcripts here...\n\nExample:\nParticipant 1: I loved the onboarding but struggled with billing.\n\nParticipant 2: Billing was confusing; support helped, though onboarding was smooth.`}
        style={{
          width: "100%",
          minHeight: 220,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #ccc",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      />

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || rawInput.trim().length === 0}
          style={{
            padding: "10px 16px",
            background: "#111827",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            cursor: isAnalyzing ? "progress" : "pointer",
          }}
        >
          {isAnalyzing ? "Analyzing..." : "Analyze"}
        </button>
        <button
          onClick={() => setShowReportForm(!showReportForm)}
          disabled={rawInput.trim().length === 0}
          style={{
            padding: "10px 16px",
            background: "#11182710",
            color: "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {showReportForm ? "Hide report options" : "Generate report"}
        </button>
        <button
          onClick={() => {
            setRawInput("");
            setResult(null);
            setError(null);
            setReportMd(null);
            setShowReportForm(false);
            setReportMeta({
              title: "Qualitative Analysis Report",
              author: "",
              methodology: "",
              methodologyVariations: "",
              participantDemographics: "",
              additionalNotes: "",
            });
          }}
          style={{
            padding: "10px 16px",
            background: "#f3f4f6",
            color: "#111827",
            border: 0,
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      {showReportForm && (
        <div style={{ marginTop: 16, padding: 20, border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb" }}>
          <h3 style={{ marginTop: 0 }}>Report metadata</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Title</label>
              <input
                type="text"
                value={reportMeta.title}
                onChange={(e) => setReportMeta({ ...reportMeta, title: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Author</label>
              <input
                type="text"
                value={reportMeta.author}
                onChange={(e) => setReportMeta({ ...reportMeta, author: e.target.value })}
                placeholder="Research Team"
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Methodology</label>
              <textarea
                value={reportMeta.methodology}
                onChange={(e) => setReportMeta({ ...reportMeta, methodology: e.target.value })}
                placeholder="Describe your analysis methodology..."
                style={{ width: "100%", minHeight: 80, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Methodology variations (optional)</label>
              <textarea
                value={reportMeta.methodologyVariations}
                onChange={(e) => setReportMeta({ ...reportMeta, methodologyVariations: e.target.value })}
                placeholder="Describe any variations or alternative approaches..."
                style={{ width: "100%", minHeight: 60, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Participant demographics (optional)</label>
              <textarea
                value={reportMeta.participantDemographics}
                onChange={(e) => setReportMeta({ ...reportMeta, participantDemographics: e.target.value })}
                placeholder="Age range, gender distribution, location, etc."
                style={{ width: "100%", minHeight: 60, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Additional notes (optional)</label>
              <textarea
                value={reportMeta.additionalNotes}
                onChange={(e) => setReportMeta({ ...reportMeta, additionalNotes: e.target.value })}
                placeholder="Any additional context, limitations, or considerations..."
                style={{ width: "100%", minHeight: 60, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              />
            </div>
            <button
              onClick={onGenerateReport}
              style={{
                padding: "10px 16px",
                background: "#111827",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Generate report
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, color: "#b91c1c" }}>Error: {error}</div>
      )}

      {result && (
        <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
          <section>
            <h2 style={{ marginBottom: 8 }}>Codes (auto-generated)</h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}>
              {result.codes.map((c) => (
                <div key={c.code} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{c.code}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>Frequency: {c.frequency}</div>
                  <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                    {c.examples.slice(0, 3).map((ex, i) => (
                      <li key={i} style={{ color: "#374151", fontSize: 13 }}>{ex}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ marginBottom: 8 }}>Themes</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {result.themes.map((t) => (
                <div key={t.theme} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{t.theme}</div>
                  <div style={{ color: "#6b7280" }}>{t.terms.join(", ")}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ marginBottom: 8 }}>Keyword extraction</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {result.keywords.slice(0, 30).map((k) => (
                <span key={k.term} style={{
                  background: "#eef2ff",
                  color: "#3730a3",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 12,
                }}>{k.term}</span>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ marginBottom: 8 }}>Sentiment (per document)</h2>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {result.sentiment.map((s) => (
                <li key={s.documentId}>
                  {s.documentId}: {s.score.toFixed(2)}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 style={{ marginBottom: 8 }}>Code co-occurrence</h2>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {result.cooccurrence.map((c, idx) => (
                <li key={idx}>
                  {c.a} × {c.b}: {c.count}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {reportMd && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ marginBottom: 8 }}>Report</h2>
          <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <button
              onClick={onExportPDF}
              style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#111827", color: "#fff", cursor: "pointer" }}
            >
              Export as PDF
            </button>
            <button
              onClick={() => {
                const blob = new Blob([reportMd], { type: "text/markdown;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${(reportMeta.title || "qualitative_report").replace(/[^a-z0-9]/gi, "_")}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer" }}
            >
              Download .md
            </button>
          </div>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f9fafb", border: "1px solid #e5e7eb", padding: 12, borderRadius: 8 }}>
{reportMd}
          </pre>
        </section>
      )}
    </main>
  );
}


