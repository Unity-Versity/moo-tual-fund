import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #6b9e4a 0%, #3d6b28 100%)",
          borderRadius: "6px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: "white",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "-0.5px",
            lineHeight: 1,
          }}
        >
          MF
        </div>
      </div>
    ),
    { ...size }
  );
}
