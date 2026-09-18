import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "480px",
      },
      colors: {
        // "Study Hall" palette — grounded in library/ledger materiality,
        // not the default SaaS blue/purple or the AI-cream/terracotta
        // pairing. Cool paper background, near-black ink for text, deep
        // ledger green as the one working accent, stamp gold reserved for
        // secondary emphasis only (due-date-stamp feeling, used sparingly).
        paper: {
          DEFAULT: "#F3F4F1",
          raised: "#FFFFFF",
        },
        ink: {
          DEFAULT: "#14181B",
          muted: "#565F5A",
          faint: "#8A928C",
        },
        ledger: {
          DEFAULT: "#24403A",
          dark: "#152722",
          light: "#3A5C53",
        },
        stamp: {
          DEFAULT: "#B08641",
          light: "#E8D9BC",
        },
        line: "#DDDAD2",
        rust: {
          DEFAULT: "#8C4A3A",
          light: "#F3E4DF",
        },
        // Status tones mapped onto the existing palette rather than raw
        // Tailwind slate/blue/amber/purple, so ticket/routing states read
        // as part of the same product instead of a bolted-on admin theme.
        status: {
          pending: "#B08641", // stamp
          pendingBg: "#F5EEDD",
          active: "#3A5C53", // ledger.light
          activeBg: "#E6ECE9",
          done: "#24403A", // ledger
          doneBg: "#DEE6E3",
          escalated: "#8C4A3A", // rust
          escalatedBg: "#F3E4DF",
          closed: "#8A928C", // ink.faint
          closedBg: "#EAEAE6",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 24, 27, 0.04), 0 1px 1px rgba(20, 24, 27, 0.03)",
        raised:
          "0 4px 16px -4px rgba(20, 24, 27, 0.10), 0 2px 6px -2px rgba(20, 24, 27, 0.06)",
        floating:
          "0 12px 32px -8px rgba(20, 24, 27, 0.16), 0 4px 10px -4px rgba(20, 24, 27, 0.08)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
