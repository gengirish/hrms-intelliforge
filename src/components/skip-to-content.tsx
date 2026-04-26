export function SkipToContent({
  targetId = "main-content",
}: {
  targetId?: string;
}) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand-600 focus:text-white focus:font-semibold focus:shadow-brand-glow focus:outline-none focus:ring-2 focus:ring-brand-300"
    >
      Skip to main content
    </a>
  );
}
