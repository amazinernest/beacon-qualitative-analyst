"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "linear-gradient(to bottom, #fafafa 0%, #ffffff 100%)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif",
        }}>
          <h1 style={{
            fontSize: "48px",
            fontWeight: 800,
            marginBottom: "16px",
            color: "#111827",
          }}>
            Something went wrong
          </h1>
          <p style={{
            fontSize: "18px",
            color: "#6b7280",
            marginBottom: "32px",
            textAlign: "center",
            maxWidth: "600px",
          }}>
            {error.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={reset}
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
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

