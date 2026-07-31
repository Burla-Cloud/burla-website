/** @type {import('tailwindcss').Config} */
// Core colors are CSS variables so the page can flip from the dark "space"
// theme (:root) to the light "sky" theme (.theme-day) partway down the page.
// ice/cyan are constant: they live on dark terminal panels in both themes.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "rgb(var(--c-void) / <alpha-value>)",
        panel: "rgb(var(--c-panel) / <alpha-value>)",
        card: "rgb(var(--c-card) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        inkDim: "var(--c-ink-dim)",
        inkFaint: "var(--c-ink-faint)",
        ice: "#EAF6FA",
        iceDim: "rgba(234,246,250,0.72)",
        iceFaint: "rgba(234,246,250,0.55)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        cyan: "#7ECBDD",
        blue: "#2A7F96",
        coral: "#FF806C",
        hairline: "var(--c-hairline)",
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
