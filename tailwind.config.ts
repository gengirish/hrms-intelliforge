import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Trust & Authority palette (UI/UX Pro Max design system)
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB", // Primary
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          DEFAULT: "#2563EB",
        },
        accent: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316", // CTA orange
          600: "#EA580C",
          700: "#C2410C",
          DEFAULT: "#F97316",
        },
        surface: {
          DEFAULT: "#0B1220",
          subtle: "#0F172A",
          raised: "#1E293B",
          muted: "#334155",
          border: "#334155",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        "brand-glow":
          "0 10px 30px -12px rgba(37, 99, 235, 0.45), 0 0 0 1px rgba(37, 99, 235, 0.15)",
        "accent-glow":
          "0 10px 30px -12px rgba(249, 115, 22, 0.5), 0 0 0 1px rgba(249, 115, 22, 0.18)",
        "trust-card":
          "0 1px 2px rgba(15, 23, 42, 0.4), 0 8px 24px -8px rgba(15, 23, 42, 0.6)",
      },
      keyframes: {
        "metric-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.03)" },
        },
        "stat-reveal": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "metric-pulse": "metric-pulse 3s ease-in-out infinite",
        "stat-reveal": "stat-reveal 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 2.5s linear infinite",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
