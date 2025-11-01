import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "linear-gradient(to bottom, #fafafa 0%, #ffffff 100%)",
    }}>
      <h1 style={{
        fontSize: "48px",
        fontWeight: 800,
        marginBottom: "16px",
        color: "#111827",
      }}>
        404
      </h1>
      <h2 style={{
        fontSize: "24px",
        fontWeight: 600,
        marginBottom: "16px",
        color: "#374151",
      }}>
        Page Not Found
      </h2>
      <p style={{
        fontSize: "18px",
        color: "#6b7280",
        marginBottom: "32px",
        textAlign: "center",
        maxWidth: "600px",
      }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          padding: "14px 28px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          border: 0,
          borderRadius: "10px",
          fontSize: "15px",
          fontWeight: 600,
          cursor: "pointer",
          textDecoration: "none",
          transition: "all 0.2s ease",
          boxShadow: "0 4px 6px rgba(102, 126, 234, 0.25)",
          display: "inline-block",
        }}
      >
        Return Home
      </Link>
    </div>
  );
}

