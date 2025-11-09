"use client";

import { useState } from "react";
import { AIResults } from "@/components/AIResults";

type AnalysisResponse = {
  documents: { id: string; text: string }[];
  codes: { code: string; examples: string[]; frequency: number }[];
  cooccurrence: { a: string; b: string; count: number }[];
  sentiment: { documentId: string; score: number }[];
  keywords: { term: string; score: number }[];
  themes: { theme: string; terms: string[] }[];
};

type AIAnalysisResponse = {
  themes: {
    name: string;
    description: string;
    subthemes: string[];
    quotes: { text: string; respondentId: string; context: string }[];
    prevalence: string;
    significance: string;
  }[];
  keyFindings: string[];
  patterns: {
    name: string;
    description: string;
    examples: string[];
  }[];
  interpretations: string;
  recommendations: string[];
  methodologyNotes: string;
};

export default function HomePage() {
  const [rawInput, setRawInput] = useState("");
  const [researchQuestion, setResearchQuestion] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportMd, setReportMd] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<"basic" | "ai">("ai");
  const [reportMeta, setReportMeta] = useState({
    title: "Qualitative Analysis Report",
    author: "",
    methodology: "",
    methodologyVariations: "",
    participantDemographics: "",
    additionalNotes: "",
    publicationFormat: false,
    institution: "",
    correspondingAuthor: "",
    email: "",
  });

  async function onAnalyze() {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setAiResult(null);

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
      setAnalysisMode("basic");
      setReportMd(null);
    } catch (e: any) {
      setError(e?.message || "Failed to analyze");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function onAIAnalyze() {
    if (!researchQuestion.trim()) {
      setError("Please enter a research question");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setAiResult(null);

    try {
      const cleaned = rawInput
        .split(/\n\n+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: cleaned, researchQuestion: researchQuestion.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as AIAnalysisResponse;
      setAiResult(json);
      setAnalysisMode("ai");
      setReportMd(null);
    } catch (e: any) {
      setError(e?.message || "Failed to analyze with AI");
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
      
      if (analysisMode === "ai" && researchQuestion.trim()) {
        // Generate AI-powered report
        const res = await fetch("/api/ai-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            documents: cleaned, 
            researchQuestion: researchQuestion.trim(),
            ...reportMeta 
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const text = await res.text();
        setReportMd(text);
      } else {
        // Generate basic heuristic report
        const res = await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documents: cleaned, ...reportMeta }),
        });
        if (!res.ok) throw new Error(await res.text());
        const text = await res.text();
        setReportMd(text);
      }
      
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
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(to bottom, #fafafa 0%, #ffffff 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        padding: "20px 0",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: 700,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.5px",
          }}>
            Beacon Qualitative Analyst
          </h1>
          <p style={{
            margin: "8px 0 0 0",
            color: "#6b7280",
            fontSize: "16px",
            fontWeight: 400,
          }}>
            AI-powered qualitative analysis for interview transcripts
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "48px 24px",
      }}>
        {/* Hero Section */}
        <section style={{
          textAlign: "center",
          marginBottom: "64px",
        }}>
          <h2 style={{
            fontSize: "48px",
            fontWeight: 800,
            letterSpacing: "-1px",
            margin: "0 0 16px 0",
            color: "#111827",
            lineHeight: "1.1",
          }}>
            Expert Qualitative Analysis
            <br />
            <span style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Powered by AI</span>
          </h2>
          <p style={{
            fontSize: "20px",
            color: "#6b7280",
            maxWidth: "700px",
            margin: "0 auto 32px",
            lineHeight: "1.6",
          }}>
            Start with your research question, then let AI analyze your transcripts to generate comprehensive thematic analysis reports with themes, quotes, and expert interpretations.
          </p>
        </section>

        {/* Input Section */}
        <section style={{
          background: "white",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
          marginBottom: "32px",
          border: "1px solid rgba(0, 0, 0, 0.05)",
        }}>
          {/* Research Question Input */}
          <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #667eea10 0%, #764ba210 100%)", padding: "20px", borderRadius: "12px", border: "2px solid #667eea20" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 700,
              color: "#667eea",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              ① Research Question (Required for AI Analysis)
            </label>
            <input
              type="text"
              value={researchQuestion}
              onChange={(e) => setResearchQuestion(e.target.value)}
              placeholder="e.g., What are users' experiences with the product's onboarding process?"
              style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: "12px",
                border: "2px solid #e5e7eb",
                fontSize: "15px",
                lineHeight: "1.6",
                color: "#111827",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <p style={{ margin: "10px 0 0 0", color: "#6b7280", fontSize: "13px", lineHeight: "1.5" }}>
              💡 Tip: Be specific. Good questions guide AI to provide focused, relevant analysis.
            </p>
          </div>

          <label style={{
            display: "block",
            fontSize: "14px",
            fontWeight: 600,
            color: "#374151",
            marginBottom: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}>
            ② Transcripts
          </label>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={`Paste your research transcripts here...\n\nSeparate different interviews with a blank line.\n\nExample:\n\nParticipant 1: I loved the onboarding process but struggled with billing.\n\nParticipant 2: Billing was confusing; support helped, though onboarding was smooth.`}
            style={{
              width: "100%",
              minHeight: "280px",
              padding: "20px",
              borderRadius: "12px",
              border: "2px solid #e5e7eb",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#111827",
              resize: "vertical",
              transition: "all 0.2s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#667eea";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.boxShadow = "none";
            }}
          />

          {/* Action Buttons */}
          <div style={{
            display: "flex",
            gap: "12px",
            marginTop: "20px",
            flexWrap: "wrap",
          }}>
            <button
              onClick={onAIAnalyze}
              disabled={isAnalyzing || rawInput.trim().length === 0 || researchQuestion.trim().length === 0}
              style={{
                padding: "14px 28px",
                background: isAnalyzing || rawInput.trim().length === 0 || researchQuestion.trim().length === 0
                  ? "#d1d5db"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                border: 0,
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: isAnalyzing || rawInput.trim().length === 0 || researchQuestion.trim().length === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                boxShadow: isAnalyzing || rawInput.trim().length === 0 || researchQuestion.trim().length === 0
                  ? "none"
                  : "0 4px 6px rgba(102, 126, 234, 0.25)",
              }}
              onMouseEnter={(e) => {
                if (!isAnalyzing && rawInput.trim().length > 0 && researchQuestion.trim().length > 0) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 12px rgba(102, 126, 234, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isAnalyzing && rawInput.trim().length > 0 && researchQuestion.trim().length > 0) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px rgba(102, 126, 234, 0.25)";
                }
              }}
            >
              {isAnalyzing ? "Analyzing with AI..." : "🤖 AI Analysis"}
            </button>
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing || rawInput.trim().length === 0}
              style={{
                padding: "14px 28px",
                background: isAnalyzing || rawInput.trim().length === 0 ? "#f3f4f6" : "white",
                color: isAnalyzing || rawInput.trim().length === 0 ? "#9ca3af" : "#374151",
                border: "2px solid #e5e7eb",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: isAnalyzing || rawInput.trim().length === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!isAnalyzing && rawInput.trim().length > 0) {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.color = "#667eea";
                }
              }}
              onMouseLeave={(e) => {
                if (!isAnalyzing && rawInput.trim().length > 0) {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.color = "#374151";
                }
              }}
            >
              Basic Analysis
            </button>
            <button
              onClick={() => setShowReportForm(!showReportForm)}
              disabled={rawInput.trim().length === 0}
              style={{
                padding: "14px 28px",
                background: rawInput.trim().length === 0 ? "#f3f4f6" : "white",
                color: rawInput.trim().length === 0 ? "#9ca3af" : "#374151",
                border: "2px solid #e5e7eb",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: rawInput.trim().length === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (rawInput.trim().length > 0) {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.color = "#667eea";
                }
              }}
              onMouseLeave={(e) => {
                if (rawInput.trim().length > 0) {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.color = "#374151";
                }
              }}
            >
              {showReportForm ? "Hide Report Options" : "Generate Report"}
            </button>
            <button
              onClick={() => {
                setRawInput("");
                setResearchQuestion("");
                setResult(null);
                setAiResult(null);
                setError(null);
                setReportMd(null);
                setShowReportForm(false);
                setAnalysisMode("ai");
                setReportMeta({
                  title: "Qualitative Analysis Report",
                  author: "",
                  methodology: "",
                  methodologyVariations: "",
                  participantDemographics: "",
                  additionalNotes: "",
                  publicationFormat: false,
                  institution: "",
                  correspondingAuthor: "",
                  email: "",
                });
              }}
              style={{
                padding: "14px 28px",
                background: "transparent",
                color: "#6b7280",
                border: "2px solid #e5e7eb",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ef4444";
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.color = "#6b7280";
              }}
            >
              Reset
            </button>
          </div>
        </section>

        {/* Report Form */}
        {showReportForm && (
          <section style={{
            background: "white",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
            marginBottom: "32px",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}>
            <h3 style={{
              marginTop: 0,
              marginBottom: "24px",
              fontSize: "24px",
              fontWeight: 700,
              color: "#111827",
            }}>
              Report Metadata
            </h3>
            <div style={{ display: "grid", gap: "20px" }}>
              {/* Publication Format Toggle */}
              <div style={{
                padding: "16px",
                background: "#f9fafb",
                borderRadius: "10px",
                border: "2px solid #e5e7eb",
              }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                }}>
                  <input
                    type="checkbox"
                    checked={reportMeta.publicationFormat}
                    onChange={(e) => setReportMeta({ ...reportMeta, publicationFormat: e.target.checked })}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                    }}
                  />
                  <span style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#111827",
                  }}>
                    Publication-ready format (Elsevier/Web of Science)
                  </span>
                </label>
                <p style={{
                  margin: "8px 0 0 30px",
                  fontSize: "13px",
                  color: "#6b7280",
                }}>
                  Generates a full academic paper structure with Abstract, Introduction, Methods, Results, Discussion, Conclusions, References, and appendices
                </p>
              </div>

              {[
                { key: "title", label: "Title", placeholder: "Qualitative Analysis Report" },
                { key: "author", label: "Author(s)", placeholder: "Author Name" },
                { key: "institution", label: "Institution (optional)", placeholder: "University Name" },
                { key: "correspondingAuthor", label: "Corresponding Author", placeholder: "Name" },
                { key: "email", label: "Email", placeholder: "author@university.edu", type: "email" },
                { key: "methodology", label: "Methodology", textarea: true, placeholder: "Describe your analysis methodology (e.g., Thematic analysis following Braun and Clarke's 2006 approach)..." },
                { key: "methodologyVariations", label: "Methodology Variations (optional)", textarea: true, placeholder: "Describe any variations or alternative approaches..." },
                { key: "participantDemographics", label: "Participant Demographics", textarea: true, placeholder: "Age range, gender distribution, location, recruitment method, etc." },
                { key: "additionalNotes", label: "Acknowledgments (optional)", textarea: true, placeholder: "Funding sources, acknowledgments, etc." },
              ].map(({ key, label, placeholder, textarea, type }) => {
                const value = reportMeta[key as keyof typeof reportMeta] as string;
                return (
                <div key={key}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "8px",
                  }}>
                    {label}
                  </label>
                  {textarea ? (
                    <textarea
                      value={value || ""}
                      onChange={(e) => setReportMeta({ ...reportMeta, [key]: e.target.value })}
                      placeholder={placeholder}
                      style={{
                        width: "100%",
                        minHeight: "100px",
                        padding: "14px",
                        borderRadius: "10px",
                        border: "2px solid #e5e7eb",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        resize: "vertical",
                        transition: "all 0.2s ease",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#667eea";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  ) : (
                    <input
                      type={type || "text"}
                      value={value || ""}
                      onChange={(e) => setReportMeta({ ...reportMeta, [key]: e.target.value })}
                      placeholder={placeholder}
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "10px",
                        border: "2px solid #e5e7eb",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        transition: "all 0.2s ease",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#667eea";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  )}
                </div>
              )})}
              <button
                onClick={onGenerateReport}
                style={{
                  padding: "14px 28px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                  border: 0,
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 6px rgba(102, 126, 234, 0.25)",
                  marginTop: "8px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 12px rgba(102, 126, 234, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px rgba(102, 126, 234, 0.25)";
                }}
              >
                Generate Report
              </button>
            </div>
          </section>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            padding: "16px 20px",
            color: "#991b1b",
            marginBottom: "32px",
            fontSize: "14px",
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* AI Results Section */}
        {aiResult && (
          <AIResults aiResult={aiResult} researchQuestion={researchQuestion} />
        )}

        {/* Results Section */}
        {result && (
          <div style={{ display: "grid", gap: "32px" }}>
            {/* Codes */}
            <section style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
            }}>
              <h2 style={{
                marginTop: 0,
                marginBottom: "24px",
                fontSize: "24px",
                fontWeight: 700,
                color: "#111827",
              }}>
                Auto-Generated Codes
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "16px",
              }}>
                {result.codes.map((c) => (
                  <div key={c.code} style={{
                    background: "linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "20px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  >
                    <div style={{
                      fontWeight: 700,
                      fontSize: "16px",
                      color: "#111827",
                      marginBottom: "8px",
                    }}>
                      {c.code}
                    </div>
                    <div style={{
                      color: "#6b7280",
                      fontSize: "13px",
                      marginBottom: "12px",
                    }}>
                      Frequency: <strong>{c.frequency}</strong>
                    </div>
                    <ul style={{
                      margin: 0,
                      paddingLeft: "20px",
                      listStyle: "disc",
                    }}>
                      {c.examples.slice(0, 3).map((ex, i) => (
                        <li key={i} style={{
                          color: "#4b5563",
                          fontSize: "13px",
                          marginTop: "6px",
                          lineHeight: "1.5",
                        }}>
                          {ex.slice(0, 100)}{ex.length > 100 ? "..." : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Themes */}
            <section style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
            }}>
              <h2 style={{
                marginTop: 0,
                marginBottom: "24px",
                fontSize: "24px",
                fontWeight: 700,
                color: "#111827",
              }}>
                Identified Themes
              </h2>
              <div style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
              }}>
                {result.themes.map((t) => (
                  <div key={t.theme} style={{
                    background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
                    border: "2px solid #667eea30",
                    borderRadius: "12px",
                    padding: "20px",
                    minWidth: "200px",
                    flex: "1 1 250px",
                  }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: "18px",
                      color: "#667eea",
                      marginBottom: "8px",
                    }}>
                      {t.theme.charAt(0).toUpperCase() + t.theme.slice(1)}
                    </div>
                    <div style={{
                      color: "#6b7280",
                      fontSize: "14px",
                      lineHeight: "1.6",
                    }}>
                      {t.terms.slice(0, 5).join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Keywords */}
            <section style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
            }}>
              <h2 style={{
                marginTop: 0,
                marginBottom: "24px",
                fontSize: "24px",
                fontWeight: 700,
                color: "#111827",
              }}>
                Top Keywords
              </h2>
              <div style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}>
                {result.keywords.slice(0, 40).map((k) => (
                  <span key={k.term} style={{
                    background: "linear-gradient(135deg, #667eea20 0%, #764ba220 100%)",
                    color: "#667eea",
                    borderRadius: "20px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 600,
                    border: "1px solid #667eea30",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.background = "linear-gradient(135deg, #667eea30 0%, #764ba230 100%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.background = "linear-gradient(135deg, #667eea20 0%, #764ba220 100%)";
                  }}
                  >
                    {k.term}
                  </span>
                ))}
              </div>
            </section>

            {/* Sentiment & Co-occurrence */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "24px",
            }}>
              <section style={{
                background: "white",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
              }}>
                <h3 style={{
                  marginTop: 0,
                  marginBottom: "16px",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#111827",
                }}>
                  Sentiment Analysis
                </h3>
                <ul style={{ margin: 0, paddingLeft: "20px", listStyle: "disc" }}>
                  {result.sentiment.map((s) => (
                    <li key={s.documentId} style={{
                      color: "#4b5563",
                      fontSize: "14px",
                      marginTop: "8px",
                    }}>
                      {s.documentId}: <strong>{s.score.toFixed(2)}</strong>
                    </li>
                  ))}
                </ul>
              </section>

              <section style={{
                background: "white",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
              }}>
                <h3 style={{
                  marginTop: 0,
                  marginBottom: "16px",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#111827",
                }}>
                  Code Co-occurrence
                </h3>
                <ul style={{ margin: 0, paddingLeft: "20px", listStyle: "disc" }}>
                  {result.cooccurrence.slice(0, 10).map((c, idx) => (
                    <li key={idx} style={{
                      color: "#4b5563",
                      fontSize: "14px",
                      marginTop: "8px",
                    }}>
                      <strong>{c.a}</strong> × <strong>{c.b}</strong>: {c.count}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}

        {/* Report Preview */}
        {reportMd && (
          <section style={{
            background: "white",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
            marginTop: "32px",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              flexWrap: "wrap",
              gap: "12px",
            }}>
              <h2 style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 700,
                color: "#111827",
              }}>
                Generated Report
              </h2>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  onClick={onExportPDF}
                  style={{
                    padding: "12px 24px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "#fff",
                    border: 0,
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 6px rgba(102, 126, 234, 0.25)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 12px rgba(102, 126, 234, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 6px rgba(102, 126, 234, 0.25)";
                  }}
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
                  style={{
                    padding: "12px 24px",
                    background: "white",
                    color: "#374151",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#667eea";
                    e.currentTarget.style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.color = "#374151";
                  }}
                >
                  Download Markdown
                </button>
              </div>
            </div>
            <pre style={{
              whiteSpace: "pre-wrap",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              padding: "24px",
              borderRadius: "12px",
              fontSize: "13px",
              lineHeight: "1.7",
              overflowX: "auto",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}>
              {reportMd}
            </pre>
          </section>
        )}
      </main>
    </div>
  );
}
