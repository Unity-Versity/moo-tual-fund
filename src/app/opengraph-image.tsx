import { ImageResponse } from "next/og";

export const alt = "Moo-tual Fund — Split a whole steer with mates";
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
          background: "linear-gradient(160deg, #f7f3eb 0%, #e6dcc8 50%, #d4c9b0 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background pattern — subtle cuts of beef */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            opacity: 0.06,
            fontSize: 80,
            gap: "20px",
            padding: "20px",
          }}
        >
          {"🥩🍖🥩🍖🥩🍖🥩🍖🥩🍖🥩🍖🥩🍖🥩🍖🥩🍖🥩🍖🥩🍖🥩🍖"}
        </div>

        {/* Green accent bar at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: "linear-gradient(90deg, #5a8a3c, #d4832a, #5a8a3c)",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: 100 }}>🐄</span>

          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#2d1f14",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            Moo-tual Fund
          </div>

          <div
            style={{
              fontSize: 26,
              color: "#6b5744",
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.4,
              marginTop: "8px",
            }}
          >
            A whole steer, split between mates.
          </div>

          <div
            style={{
              marginTop: "28px",
              display: "flex",
              alignItems: "center",
              gap: "32px",
              fontSize: 20,
              color: "#8b7560",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: 24 }}>🥩</span>
              <span>8 shares</span>
            </div>
            <div
              style={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                background: "#8b7560",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: 24 }}>📦</span>
              <span>Vacuum sealed</span>
            </div>
            <div
              style={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                background: "#8b7560",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: 24 }}>🔥</span>
              <span>Smoked in-house</span>
            </div>
          </div>
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 20px",
            background: "#5a8a3c",
            color: "white",
            borderRadius: "999px",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          No shop. No middlemen. Just beef.
        </div>
      </div>
    ),
    { ...size }
  );
}
