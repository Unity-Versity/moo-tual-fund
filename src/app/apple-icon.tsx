import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #6b9e4a 0%, #3d6b28 100%)",
          borderRadius: "36px",
          gap: "4px",
        }}
      >
        <span style={{ fontSize: 72 }}>🐄</span>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "white",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "-0.5px",
          }}
        >
          MOO-TUAL
        </div>
      </div>
    ),
    { ...size }
  );
}
