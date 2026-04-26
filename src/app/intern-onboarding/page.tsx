"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Upload,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Bell,
  FileText,
  User,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { useAuth } from "@/lib/auth-context";

const schema = z.object({
  phone: z.string().min(10, "Valid phone number required"),
  college: z.string().min(2, "College name required"),
  branch: z.string().min(2, "Branch required"),
  year: z.string().min(1, "Year of study required"),
  role: z.enum(["AI Intern", "Dev Intern", "Research Intern"], {
    required_error: "Select a role",
  }),
  startDate: z.string().min(1, "Start date required"),
  durationWeeks: z.coerce
    .number()
    .min(4, "Minimum 4 weeks")
    .max(52, "Maximum 52 weeks"),
  whatsappOptIn: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

const sectionSteps = [
  { id: 1, label: "Personal", icon: User },
  { id: 2, label: "Academic", icon: GraduationCap },
  { id: 3, label: "Internship", icon: Briefcase },
  { id: 4, label: "Comms", icon: Bell },
  { id: 5, label: "Documents", icon: FileText },
];

export default function OnboardPage() {
  const { user, isLoading } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<{
    aadhar?: File;
    pan?: File;
    photo?: File;
  }>({});

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handleFileChange =
    (field: "aadhar" | "pan" | "photo") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setFiles((prev) => ({ ...prev, [field]: file }));
    };

  async function onSubmit(data: FormData) {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) =>
        formData.append(key, String(value))
      );
      if (files.aadhar) formData.append("aadhar", files.aadhar);
      if (files.pan) formData.append("pan", files.pan);
      if (files.photo) formData.append("photo", files.photo);

      const res = await fetch("/api/intern-onboarding", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Onboarding failed");
      }

      setSubmitted(true);
      toast.success("Onboarding submitted successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 flex items-center justify-center">
          <Loader2
            className="h-8 w-8 animate-spin text-brand-400"
            aria-label="Loading"
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 flex items-center justify-center px-4">
          <div className="trust-card p-8 max-w-md w-full text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 ring-1 ring-inset ring-brand-500/30">
              <ShieldCheck
                className="h-6 w-6 text-brand-300"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Sign In Required
            </h2>
            <p className="text-slate-400 text-sm">
              Please{" "}
              <a
                href="/sign-in"
                className="text-brand-300 hover:text-brand-200 font-medium"
              >
                sign in
              </a>{" "}
              or{" "}
              <a
                href="/sign-up"
                className="text-brand-300 hover:text-brand-200 font-medium"
              >
                create an account
              </a>{" "}
              first, then return here to complete onboarding.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 flex items-center justify-center px-4">
          <div className="trust-card p-8 max-w-md w-full text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/30 animate-stat-reveal">
              <CheckCircle2
                className="h-7 w-7 text-emerald-400"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Onboarding Submitted
            </h2>
            <p className="text-slate-400 text-sm">
              Your details have been received. An admin will review your
              application and send you an offer letter shortly.
            </p>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main id="main-content" className="flex-1 mx-auto max-w-2xl w-full px-4 py-10 sm:py-12">
        <header className="mb-8">
          <span className="badge-trust mb-3">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Secure intake · documents encrypted
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Intern Onboarding
          </h1>
          <p className="mt-2 text-slate-400">
            Fill in your details to begin your internship journey at IntelliForge AI.
          </p>
        </header>

        <ol
          aria-label="Onboarding sections"
          className="mb-8 hidden sm:flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-3"
        >
          {sectionSteps.map((step) => (
            <li key={step.id} className="flex items-center gap-2 text-xs">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-brand-300 ring-1 ring-inset ring-brand-500/30">
                <step.icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="font-medium text-slate-300">{step.label}</span>
            </li>
          ))}
        </ol>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <fieldset className="trust-card p-6 space-y-5">
            <legend className="flex items-center gap-2 text-lg font-semibold text-white px-1">
              <User className="h-5 w-5 text-brand-400" aria-hidden="true" />
              Personal Information
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-sm font-medium text-slate-200 mb-1.5">
                  Full Name
                </span>
                <div className="w-full rounded-lg bg-slate-800/60 border border-slate-700 px-4 py-2.5 text-slate-200">
                  {user.name || "—"}
                </div>
                <p className="mt-1 text-xs text-slate-500">From your account</p>
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-200 mb-1.5">
                  Email
                </span>
                <div className="w-full rounded-lg bg-slate-800/60 border border-slate-700 px-4 py-2.5 text-slate-200 truncate">
                  {user.email}
                </div>
                <p className="mt-1 text-xs text-slate-500">From your account</p>
              </div>

              <div>
                <label
                  htmlFor="onboard-phone"
                  className="block text-sm font-medium text-slate-200 mb-1.5"
                >
                  Phone
                </label>
                <input
                  id="onboard-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  {...register("phone")}
                  className="input-base"
                  placeholder="+91 98765 43210"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "err-phone" : undefined}
                />
                {errors.phone && (
                  <p id="err-phone" className="mt-1 text-xs text-red-300">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="onboard-role"
                  className="block text-sm font-medium text-slate-200 mb-1.5"
                >
                  Role
                </label>
                <select
                  id="onboard-role"
                  {...register("role")}
                  className="input-base"
                  aria-invalid={!!errors.role}
                  aria-describedby={errors.role ? "err-role" : undefined}
                >
                  <option value="">Select role</option>
                  <option value="AI Intern">AI Intern</option>
                  <option value="Dev Intern">Dev Intern</option>
                  <option value="Research Intern">Research Intern</option>
                </select>
                {errors.role && (
                  <p id="err-role" className="mt-1 text-xs text-red-300">
                    {errors.role.message}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          <fieldset className="trust-card p-6 space-y-5">
            <legend className="flex items-center gap-2 text-lg font-semibold text-white px-1">
              <GraduationCap
                className="h-5 w-5 text-brand-400"
                aria-hidden="true"
              />
              Academic Information
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="onboard-college"
                  className="block text-sm font-medium text-slate-200 mb-1.5"
                >
                  College
                </label>
                <input
                  id="onboard-college"
                  {...register("college")}
                  className="input-base"
                  placeholder="IIT Delhi"
                  aria-invalid={!!errors.college}
                  aria-describedby={errors.college ? "err-college" : undefined}
                />
                {errors.college && (
                  <p id="err-college" className="mt-1 text-xs text-red-300">
                    {errors.college.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="onboard-branch"
                  className="block text-sm font-medium text-slate-200 mb-1.5"
                >
                  Branch
                </label>
                <input
                  id="onboard-branch"
                  {...register("branch")}
                  className="input-base"
                  placeholder="Computer Science"
                  aria-invalid={!!errors.branch}
                  aria-describedby={errors.branch ? "err-branch" : undefined}
                />
                {errors.branch && (
                  <p id="err-branch" className="mt-1 text-xs text-red-300">
                    {errors.branch.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="onboard-year"
                  className="block text-sm font-medium text-slate-200 mb-1.5"
                >
                  Year of Study
                </label>
                <select
                  id="onboard-year"
                  {...register("year")}
                  className="input-base"
                  aria-invalid={!!errors.year}
                  aria-describedby={errors.year ? "err-year" : undefined}
                >
                  <option value="">Select year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduated">Graduated</option>
                </select>
                {errors.year && (
                  <p id="err-year" className="mt-1 text-xs text-red-300">
                    {errors.year.message}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          <fieldset className="trust-card p-6 space-y-5">
            <legend className="flex items-center gap-2 text-lg font-semibold text-white px-1">
              <Briefcase
                className="h-5 w-5 text-brand-400"
                aria-hidden="true"
              />
              Internship Details
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="onboard-startDate"
                  className="block text-sm font-medium text-slate-200 mb-1.5"
                >
                  Start Date
                </label>
                <input
                  id="onboard-startDate"
                  {...register("startDate")}
                  type="date"
                  className="input-base"
                  aria-invalid={!!errors.startDate}
                  aria-describedby={
                    errors.startDate ? "err-startDate" : undefined
                  }
                />
                {errors.startDate && (
                  <p
                    id="err-startDate"
                    className="mt-1 text-xs text-red-300"
                  >
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="onboard-durationWeeks"
                  className="block text-sm font-medium text-slate-200 mb-1.5"
                >
                  Duration (weeks)
                </label>
                <input
                  id="onboard-durationWeeks"
                  {...register("durationWeeks")}
                  type="number"
                  inputMode="numeric"
                  min={4}
                  max={52}
                  className="input-base"
                  placeholder="12"
                  aria-invalid={!!errors.durationWeeks}
                  aria-describedby={
                    errors.durationWeeks ? "err-durationWeeks" : undefined
                  }
                />
                {errors.durationWeeks && (
                  <p
                    id="err-durationWeeks"
                    className="mt-1 text-xs text-red-300"
                  >
                    {errors.durationWeeks.message}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          <fieldset className="trust-card p-6 space-y-4">
            <legend className="flex items-center gap-2 text-lg font-semibold text-white px-1">
              <Bell className="h-5 w-5 text-brand-400" aria-hidden="true" />
              Communication Preferences
            </legend>
            <label className="flex items-start gap-3 cursor-pointer rounded-lg p-2 -m-2 hover:bg-slate-800/40 transition-colors">
              <input
                type="checkbox"
                {...register("whatsappOptIn")}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900/50 text-brand-600 focus:ring-brand-500 focus:ring-offset-0"
              />
              <span>
                <span className="block text-sm font-medium text-slate-200">
                  Receive WhatsApp notifications
                </span>
                <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Get interview updates, reminders, and important notifications
                  via WhatsApp on the phone number provided above. You can opt
                  out anytime.
                </span>
              </span>
            </label>
          </fieldset>

          <fieldset className="trust-card p-6 space-y-5">
            <legend className="flex items-center gap-2 text-lg font-semibold text-white px-1">
              <FileText
                className="h-5 w-5 text-brand-400"
                aria-hidden="true"
              />
              Document Uploads
            </legend>
            <p className="text-sm text-slate-400">
              Upload your Aadhaar, PAN card, and a passport-size photo. PDFs and
              image files are accepted.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["aadhar", "pan", "photo"] as const).map((field) => {
                const labelText =
                  field === "aadhar"
                    ? "Aadhaar"
                    : field === "pan"
                    ? "PAN Card"
                    : "Photo";
                const hasFile = !!files[field];
                return (
                  <label
                    key={field}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors text-center ${
                      hasFile
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-slate-700 hover:border-brand-500/50 hover:bg-slate-800/40"
                    }`}
                  >
                    {hasFile ? (
                      <CheckCircle2
                        className="h-6 w-6 text-emerald-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <Upload
                        className="h-6 w-6 text-slate-500"
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-sm font-medium text-slate-300">
                      {labelText}
                    </span>
                    {hasFile ? (
                      <span className="text-xs text-emerald-300 truncate max-w-full">
                        {files[field]!.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Click to upload
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="sr-only"
                      onChange={handleFileChange(field)}
                      aria-label={`Upload ${labelText}`}
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-cta w-full px-6 py-3 text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              "Submit Onboarding"
            )}
          </button>
        </form>
      </main>

      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
