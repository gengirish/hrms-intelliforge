"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { captureEvent, grantAnalyticsConsent } from "@/lib/posthog";
import { useAuth } from "@/lib/auth-context";

interface WhatsAppOtpFormProps {
  redirect: string;
  onBack: () => void;
}

/**
 * Phone → code → session. The code is delivered over WhatsApp by the hosted OTP
 * API; /api/auth/otp/verify maps the verified number onto an existing Intern and
 * issues the normal hrms-session cookie.
 */
export function WhatsAppOtpForm({ redirect, onBack }: WhatsAppOtpFormProps) {
  const router = useRouter();
  const { refresh } = useAuth();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const sendCode = useCallback(
    async (isResend: boolean) => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/auth/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg =
            res.status === 429 && data.retryInSeconds
              ? `Too many requests. Try again in ${data.retryInSeconds}s.`
              : data.message ?? data.error ?? "Couldn't send the code. Try again.";
          setError(msg);
          toast.error(msg);
          return;
        }

        setStep("code");
        setResendIn(typeof data.resendInSeconds === "number" ? data.resendInSeconds : 30);
        toast.success(isResend ? "New code sent on WhatsApp" : "Code sent on WhatsApp");
      } catch {
        const msg = "Network error. Check your connection and retry.";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [phone]
  );

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Enter your WhatsApp number");
      return;
    }
    await sendCode(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok !== true) {
        let msg: string;
        if (res.status === 401) {
          msg =
            typeof data.attemptsLeft === "number"
              ? `That code is incorrect. ${data.attemptsLeft} attempt${
                  data.attemptsLeft === 1 ? "" : "s"
                } left.`
              : "That code is incorrect.";
        } else if (res.status === 410) {
          msg = "That code expired. Request a new one.";
        } else {
          msg = data.message ?? data.error ?? "Verification failed.";
        }
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success("Signed in successfully");
      grantAnalyticsConsent();
      captureEvent("sign_in", { method: "whatsapp_otp" });
      await refresh();
      router.push(redirect);
      router.refresh();
    } catch {
      const msg = "Network error. Check your connection and retry.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={step === "code" ? () => setStep("phone") : onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {step === "code" ? "Use a different number" : "Back to email sign-in"}
      </button>

      {step === "phone" ? (
        <form onSubmit={handleSendCode} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="wa-phone"
              className="block text-sm font-medium text-slate-200 mb-1.5"
            >
              WhatsApp number
            </label>
            <input
              id="wa-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(null);
              }}
              className="input-base"
              placeholder="+91 98765 43210"
              aria-invalid={!!error}
              aria-describedby={error ? "wa-error" : "wa-phone-hint"}
            />
            <p id="wa-phone-hint" className="mt-1.5 text-xs text-slate-500">
              Use the number your internship is registered with.
            </p>
          </div>

          {error && (
            <p
              id="wa-error"
              className="flex items-start gap-2 text-sm text-red-300"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Send code on WhatsApp
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="wa-code"
              className="block text-sm font-medium text-slate-200 mb-1.5"
            >
              Enter the 6-digit code
            </label>
            <input
              id="wa-code"
              ref={codeInputRef}
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              className="input-base tracking-[0.4em] text-center text-lg"
              placeholder="000000"
              aria-invalid={!!error}
              aria-describedby={error ? "wa-error" : "wa-code-hint"}
            />
            <p id="wa-code-hint" className="mt-1.5 text-xs text-slate-500">
              Sent on WhatsApp to {phone}
            </p>
          </div>

          {error && (
            <p
              id="wa-error"
              className="flex items-start gap-2 text-sm text-red-300"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="btn-primary w-full py-2.5"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Verifying…
              </>
            ) : (
              "Verify & sign in"
            )}
          </button>

          <button
            type="button"
            onClick={() => sendCode(true)}
            disabled={loading || resendIn > 0}
            className="w-full text-sm text-brand-300 hover:text-brand-200 disabled:text-slate-500 transition-colors"
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </button>
        </form>
      )}
    </div>
  );
}
