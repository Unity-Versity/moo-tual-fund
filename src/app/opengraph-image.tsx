import { ImageResponse } from "next/og";

export const alt = "Moo-tual Fund — split a steer with mates";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
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
          background: "linear-gradient(145deg, #f5f0e8 0%, #e8e0d0 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: 80 }}>🐄</span>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#3d2b1f",
            marginBottom: "12px",
          }}
        >
          Moo-tual Fund
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#6b5744",
            textAlign: "center",
            maxWidth: "600px",
          }}
        >
          Split a steer with mates. Track it, claim your slot, sort your order.
        </div>
        <div
          style={{
            marginTop: "32px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 24px",
            background: "#5a8a3c",
            color: "white",
            borderRadius: "999px",
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          8 slots · 1 steer · 0 middlemen
        </div>
      </div>
    ),
    { ...size }
  );
}
