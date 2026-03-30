"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background: "#f5f0e8",
          color: "#3d2b1f",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: "4rem", margin: 0 }}>🐄😵</p>
          <h1 style={{ fontSize: "1.5rem", marginTop: "1rem" }}>
            Holy Cow, Something Went Wrong!
          </h1>
          <p style={{ color: "#6b5744", fontSize: "0.9rem" }}>
            The whole barn came down. Give it another go?
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1.5rem",
              fontSize: "0.9rem",
              background: "#5a8a3c",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
