import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950">
      <SignIn />
      <a
        href="https://www.intelliforge.tech/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex items-center gap-1 text-[11px] text-slate-500 transition-colors hover:text-slate-400"
      >
        Powered by <span className="font-medium">IntelliForge AI</span>
      </a>
    </div>
  );
}
