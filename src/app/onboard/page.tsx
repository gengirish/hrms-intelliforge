"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Valid phone number required"),
  college: z.string().min(2, "College name required"),
  branch: z.string().min(2, "Branch required"),
  year: z.string().min(1, "Year of study required"),
  role: z.enum(["AI Intern", "Dev Intern", "Research Intern"], {
    required_error: "Select a role",
  }),
  startDate: z.string().min(1, "Start date required"),
  durationWeeks: z.coerce.number().min(4, "Minimum 4 weeks").max(52, "Maximum 52 weeks"),
});

type FormData = z.infer<typeof schema>;

export default function OnboardPage() {
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

  const handleFileChange = (field: "aadhar" | "pan" | "photo") => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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

      const res = await fetch("/api/onboard", {
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

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Onboarding Submitted!
            </h2>
            <p className="text-slate-400">
              Your details have been received. An admin will review your
              application and send you an offer letter shortly.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Intern Onboarding</h1>
          <p className="mt-2 text-slate-400">
            Fill in your details to begin your internship journey at IntelliForge AI.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="glass-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Personal Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  {...register("name")}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  placeholder="Priya Sharma"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  placeholder="priya@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Phone
                </label>
                <input
                  {...register("phone")}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  placeholder="+91 98765 43210"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Role
                </label>
                <select
                  {...register("role")}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                >
                  <option value="">Select role</option>
                  <option value="AI Intern">AI Intern</option>
                  <option value="Dev Intern">Dev Intern</option>
                  <option value="Research Intern">Research Intern</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-xs text-red-400">{errors.role.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Academic Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  College
                </label>
                <input
                  {...register("college")}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  placeholder="IIT Delhi"
                />
                {errors.college && (
                  <p className="mt-1 text-xs text-red-400">{errors.college.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Branch
                </label>
                <input
                  {...register("branch")}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  placeholder="Computer Science"
                />
                {errors.branch && (
                  <p className="mt-1 text-xs text-red-400">{errors.branch.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Year of Study
                </label>
                <select
                  {...register("year")}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                >
                  <option value="">Select year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduated">Graduated</option>
                </select>
                {errors.year && (
                  <p className="mt-1 text-xs text-red-400">{errors.year.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Internship Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  {...register("startDate")}
                  type="date"
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                />
                {errors.startDate && (
                  <p className="mt-1 text-xs text-red-400">{errors.startDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Duration (weeks)
                </label>
                <input
                  {...register("durationWeeks")}
                  type="number"
                  min={4}
                  max={52}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  placeholder="12"
                />
                {errors.durationWeeks && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.durationWeeks.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Document Uploads</h2>
            <p className="text-sm text-slate-400">
              Upload your Aadhaar, PAN card, and a passport-size photo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["aadhar", "pan", "photo"] as const).map((field) => (
                <label
                  key={field}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-700 p-6 cursor-pointer hover:border-indigo-500/50 transition-colors"
                >
                  <Upload className="h-6 w-6 text-slate-500" />
                  <span className="text-sm text-slate-400 capitalize">{field === "aadhar" ? "Aadhaar" : field === "pan" ? "PAN Card" : "Photo"}</span>
                  {files[field] && (
                    <span className="text-xs text-emerald-400 truncate max-w-full">
                      {files[field]!.name}
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileChange(field)}
                  />
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-500 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Onboarding"
            )}
          </button>
        </form>
      </main>

      <Footer />
    </div>
  );
}
