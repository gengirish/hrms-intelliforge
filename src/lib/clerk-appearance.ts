import type { Appearance } from "@clerk/types";

/** Shared dark-theme Clerk styling for HRMS auth surfaces. */
export const hrmsClerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#3b82f6",
    colorBackground: "transparent",
    colorForeground: "#f8fafc",
    colorInput: "#1e293b",
    colorInputForeground: "#f1f5f9",
    colorMutedForeground: "#94a3b8",
    colorBorder: "#334155",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full mx-auto",
    card: "bg-transparent shadow-none border-0 p-0 w-full gap-4",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    footerAction: "hidden",
    socialButtonsBlockButton:
      "border border-slate-700 bg-slate-800/80 text-slate-100 hover:bg-slate-800",
    dividerLine: "bg-slate-700",
    dividerText: "text-slate-500",
    formFieldLabel: "text-slate-200",
    formFieldInput:
      "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500",
    formButtonPrimary:
      "bg-brand-500 hover:bg-brand-600 text-white shadow-none normal-case",
    footer: "bg-transparent [&_*]:text-slate-500",
    identityPreviewText: "text-slate-200",
    identityPreviewEditButton: "text-brand-300",
  },
};
