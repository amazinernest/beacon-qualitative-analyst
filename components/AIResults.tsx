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

export function AIResults({ aiResult, researchQuestion }: { aiResult: AIAnalysisResponse; researchQuestion: string }) {
  return (
    <div style={{ display: "grid", gap: "32px" }}>
      {/* Research Question Display */}
      <section style={{
        background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
        borderRadius: "16px",
        padding: "24px",
        border: "2px solid #667eea30",
      }}>
        <h3 style={{
          margin: "0 0 12px 0",
          fontSize: "16px",
          fontWeight: 600,
          color: "#667eea",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}>Research Question</h3>
        <p style={{
          margin: 0,
          fontSize: "18px",
          color: "#111827",
          fontWeight: 500,
          lineHeight: "1.6",
        }}>{researchQuestion}</p>
      </section>

      {/* Key Findings */}
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
        }}>Key Findings</h2>
        <ul style={{ margin: 0, paddingLeft: "24px" }}>
          {aiResult.keyFindings.map((finding, idx) => (
            <li key={idx} style={{
              color: "#374151",
              fontSize: "16px",
              marginTop: "12px",
              lineHeight: "1.7",
            }}>{finding}</li>
          ))}
        </ul>
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
          marginBottom: "32px",
          fontSize: "24px",
          fontWeight: 700,
          color: "#111827",
        }}>Identified Themes</h2>
        <div style={{ display: "grid", gap: "32px" }}>
          {aiResult.themes.map((theme, idx) => (
            <div key={idx} style={{
              background: "linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)",
              border: "2px solid #e5e7eb",
              borderRadius: "12px",
              padding: "24px",
            }}>
              <h3 style={{
                marginTop: 0,
                marginBottom: "12px",
                fontSize: "20px",
                fontWeight: 700,
                color: "#667eea",
              }}>Theme {idx + 1}: {theme.name}</h3>
              <p style={{
                margin: "0 0 16px 0",
                color: "#4b5563",
                fontSize: "15px",
                lineHeight: "1.7",
              }}>{theme.description}</p>
              {theme.subthemes.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <strong style={{ fontSize: "14px", color: "#374151" }}>Subthemes:</strong>
                  <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                    {theme.subthemes.map((sub, i) => (
                      <li key={i} style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}>{sub}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ fontSize: "14px", color: "#374151" }}>Prevalence:</strong>
                <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "14px" }}>{theme.prevalence}</p>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ fontSize: "14px", color: "#374151" }}>Significance:</strong>
                <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "14px", lineHeight: "1.6" }}>{theme.significance}</p>
              </div>
              {theme.quotes.length > 0 && (
                <div>
                  <strong style={{ fontSize: "14px", color: "#374151" }}>Representative Quotes:</strong>
                  <div style={{ marginTop: "12px", display: "grid", gap: "12px" }}>
                    {theme.quotes.map((quote, i) => (
                      <div key={i} style={{
                        background: "#f9fafb",
                        borderLeft: "4px solid #667eea",
                        padding: "12px 16px",
                        borderRadius: "6px",
                      }}>
                        <p style={{ margin: "0 0 8px 0", color: "#374151", fontSize: "14px", fontStyle: "italic", lineHeight: "1.6" }}>
                          &quot;{quote.text}&quot;
                        </p>
                        <p style={{ margin: 0, color: "#6b7280", fontSize: "12px" }}>
                          — {quote.respondentId}
                        </p>
                        {quote.context && (
                          <p style={{ margin: "8px 0 0 0", color: "#9ca3af", fontSize: "12px", lineHeight: "1.5" }}>
                            Context: {quote.context}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Patterns */}
      {aiResult.patterns && aiResult.patterns.length > 0 && (
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
          }}>Patterns & Relationships</h2>
          <div style={{ display: "grid", gap: "20px" }}>
            {aiResult.patterns.map((pattern, idx) => (
              <div key={idx} style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "20px",
              }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 600, color: "#111827" }}>
                  {pattern.name}
                </h4>
                <p style={{ margin: "0 0 12px 0", color: "#4b5563", fontSize: "14px", lineHeight: "1.6" }}>
                  {pattern.description}
                </p>
                {pattern.examples && pattern.examples.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: "20px" }}>
                    {pattern.examples.map((ex, i) => (
                      <li key={i} style={{ color: "#6b7280", fontSize: "13px", marginTop: "4px" }}>{ex}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Interpretations */}
      <section style={{
        background: "white",
        borderRadius: "16px",
        padding: "32px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
        border: "1px solid rgba(0, 0, 0, 0.05)",
      }}>
        <h2 style={{
          marginTop: 0,
          marginBottom: "16px",
          fontSize: "24px",
          fontWeight: 700,
          color: "#111827",
        }}>Interpretations</h2>
        <p style={{
          margin: 0,
          color: "#374151",
          fontSize: "15px",
          lineHeight: "1.8",
          whiteSpace: "pre-wrap",
        }}>{aiResult.interpretations}</p>
      </section>

      {/* Recommendations */}
      {aiResult.recommendations && aiResult.recommendations.length > 0 && (
        <section style={{
          background: "white",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
        }}>
          <h2 style={{
            marginTop: 0,
            marginBottom: "16px",
            fontSize: "24px",
            fontWeight: 700,
            color: "#111827",
          }}>Recommendations</h2>
          <ul style={{ margin: 0, paddingLeft: "24px" }}>
            {aiResult.recommendations.map((rec, idx) => (
              <li key={idx} style={{
                color: "#374151",
                fontSize: "15px",
                marginTop: "12px",
                lineHeight: "1.7",
              }}>{rec}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
