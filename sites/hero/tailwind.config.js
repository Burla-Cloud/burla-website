/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#03080D",
        panel: "#091823",
        ink: "#F4FBFD",
        inkDim: "rgba(234,246,250,0.76)",
        inkFaint: "rgba(234,246,250,0.58)",
        ice: "#EAF6FA",
        iceDim: "rgba(234,246,250,0.72)",
        iceFaint: "rgba(234,246,250,0.55)",
        accent: "#7ECBDD",
        cyan: "#7ECBDD",
        blue: "#2A7F96",
        coral: "#FF806C",
        hairline: "rgba(126,203,221,0.20)",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        eyebrow: "0.28em",
      },
    },
  },
  plugins: [],
};
