/**
 * Burla for Agents — V8 Paper Blue.
 * Cool near-white primary canvas. Deep slate inverse panel.
 * Royal-blue accent — the middle reading of the three blue light variants.
 *
 * Role tokens are inverted compared to dark variants: `onyx` is the
 * light primary canvas and `cream` is the dark inverse secondary panel.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        onyx: "#F5F7F9",
        onyxDeep: "#D6DDE5",
        surface: "#FFFFFF",
        surfaceElev: "#EEF2F6",
        surfaceHi: "#D2DAE2",
        line: "#D2DAE2",
        lineBright: "#B0BAC4",
        ink: "#0F1419",
        inkMuted: "#3F4854",
        inkSubtle: "#6B7480",
        inkDim: "#98A1AB",
        cream: "#0F1419",
        creamDeep: "#0E1418",
        creamLine: "#212931",
        creamInk: "#F5F7F9",
        creamMuted: "#A4ADB8",
        creamSubtle: "#5E6772",
        accent: "#155E75",
        accentDeep: "#164E63",
        accentSoft: "rgba(21, 94, 117, 0.10)",
        accentRing: "rgba(21, 94, 117, 0.28)",
        accentInk: "#FFFFFF",
        live: "#16A34A",
        liveSoft: "rgba(22, 163, 74, 0.14)",
        warn: "#EA580C",
        error: "#DC2626",
        blue: "#155E75",
        blueSoft: "rgba(21, 94, 117, 0.10)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      letterSpacing: {
        tightest: "-0.045em",
        tighter2: "-0.035em",
        eyebrow: "0.18em",
        eyebrowTight: "0.12em",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(21,94,117,0.4), 0 0 40px rgba(21,94,117,0.18)",
        card: "0 1px 0 rgba(15,20,25,0.03) inset, 0 18px 60px -20px rgba(15,20,25,0.10)",
        cream:
          "0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 60px -20px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        onyxGrad:
          "radial-gradient(60% 90% at 70% 0%, rgba(21,94,117,0.06), transparent 60%), radial-gradient(50% 70% at 0% 0%, rgba(99,102,241,0.04), transparent 60%), linear-gradient(180deg, #F5F7F9 0%, #D6DDE5 100%)",
        gridFade:
          "linear-gradient(180deg, rgba(15,20,25,0.05) 0%, transparent 60%)",
      },
      keyframes: {
        floatIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%,49%": { opacity: "1" },
          "50%,100%": { opacity: "0" },
        },
        pulseDot: {
          "0%,100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.4)", opacity: "0.55" },
        },
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        floatIn: "floatIn 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        blink: "blink 1s steps(1) infinite",
        pulseDot: "pulseDot 1.8s ease-in-out infinite",
        sweep: "sweep 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};
