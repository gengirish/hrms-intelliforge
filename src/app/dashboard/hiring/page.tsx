"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  Plus,
  Loader2,
  ArrowLeft,
  Users,
  ExternalLink,
  UserCheck,
  ChevronRight,
  X,
  MapPin,
  Clock,
  Link2,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CandidateDetailPanel } from "@/components/hiring/candidate-detail-panel";
import { CandidateStatusBadge } from "@/components/hiring/candidate-status-badge";
import { cn, formatDateIST } from "@/lib/utils";

interface JobPosting {
  id: string;
  slug: string;
  title: string;
  description: string;
  skills: string[];
  location: string | null;
  employmentType: string;
  duration: string | null;
  interviewLink: string | null;
  isActive: boolean;
  createdAt: string;
  candidateCount: number;
  avgScore: number | null;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  coverNote: string | null;
  interviewScore: number | null;
  interviewStatus: string;
  reportUrl: string | null;
  convertedToIntern: boolean;
  createdAt: string;
}

export default function HiringPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [panelBusy, setPanelBusy] = useState<{
    status?: boolean;
    convert?: boolean;
    delete?: boolean;
    contact?: boolean;
  }>({});

  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    skills: "",
    location: "",
    employmentType: "FULL_TIME",
    duration: "",
    salaryInfo: "",
    applicationEmail: "",
  });

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setJobs(data.jobs);
    } catch {
      toast.error("Failed to load job postings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  async function loadCandidates(jobId: string) {
    setCandidatesLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCandidates(data.candidates);
    } catch {
      toast.error("Failed to load candidates");
    } finally {
      setCandidatesLoading(false);
    }
  }

  async function createJob() {
    if (!newJob.title || !newJob.description) {
      toast.error("Title and description are required");
      return;
    }

    setCreating(true);
    try {
      const skills = newJob.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newJob.title,
          description: newJob.description,
          skills,
          location: newJob.location || undefined,
          employmentType: newJob.employmentType,
          duration: newJob.duration || undefined,
          salaryInfo: newJob.salaryInfo || undefined,
          applicationEmail: newJob.applicationEmail || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create job posting");
        return;
      }

      toast.success("Job posting created");
      setShowCreateForm(false);
      setNewJob({ title: "", description: "", skills: "", location: "", employmentType: "FULL_TIME", duration: "", salaryInfo: "", applicationEmail: "" });
      await loadJobs();
    } catch {
      toast.error("Failed to create job posting");
    } finally {
      setCreating(false);
    }
  }

  async function convertToIntern(candidate: Candidate, jobId: string) {
    setConvertingId(candidate.id);
    try {
      const res = await fetch(`/api/jobs/${jobId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          role: selectedJob?.title ?? "Intern",
          startDate: new Date().toISOString(),
          durationWeeks: 12,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to convert candidate");
        return;
      }

      toast.success(`${candidate.name} converted to intern!`);
      await loadCandidates(jobId);
    } catch {
      toast.error("Failed to convert candidate");
    } finally {
      setConvertingId(null);
    }
  }

  function selectJob(job: JobPosting) {
    setSelectedJob(job);
    loadCandidates(job.id);
  }

  async function handleStatusChange(newStatus: string) {
    if (!selectedCandidate || !selectedJob) return;
    setPanelBusy((prev) => ({ ...prev, status: true }));
    try {
      const res = await fetch(
        `/api/jobs/${selectedJob.id}/candidates/${selectedCandidate.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewStatus: newStatus }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update status");
        return;
      }
      const data = await res.json();
      const updated = { ...selectedCandidate, ...data.candidate };
      setSelectedCandidate(updated);
      setCandidates((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
      toast.success(`Status updated to ${newStatus.toLowerCase()}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setPanelBusy((prev) => ({ ...prev, status: false }));
    }
  }

  async function handlePanelConvert() {
    if (!selectedCandidate || !selectedJob) return;
    setPanelBusy((prev) => ({ ...prev, convert: true }));
    try {
      await convertToIntern(selectedCandidate, selectedJob.id);
      setSelectedCandidate((prev) =>
        prev ? { ...prev, convertedToIntern: true } : prev
      );
    } finally {
      setPanelBusy((prev) => ({ ...prev, convert: false }));
    }
  }

  async function handleDeleteCandidate() {
    if (!selectedCandidate || !selectedJob) return;
    setPanelBusy((prev) => ({ ...prev, delete: true }));
    try {
      const res = await fetch(
        `/api/jobs/${selectedJob.id}/candidates/${selectedCandidate.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete candidate");
        return;
      }
      const removedId = selectedCandidate.id;
      setCandidates((prev) => prev.filter((c) => c.id !== removedId));
      setSelectedCandidate(null);
      toast.success("Candidate deleted");
    } catch {
      toast.error("Failed to delete candidate");
    } finally {
      setPanelBusy((prev) => ({ ...prev, delete: false }));
    }
  }

  async function handleContactCandidate(subject: string, message: string) {
    if (!selectedCandidate || !selectedJob) return;
    setPanelBusy((prev) => ({ ...prev, contact: true }));
    try {
      const res = await fetch(
        `/api/jobs/${selectedJob.id}/candidates/${selectedCandidate.id}/contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, message }),
        }
      );
      if (res.status === 503) {
        toast.error("Email service not configured. Contact your admin.");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to send email");
        return;
      }
      toast.success(`Email sent to ${selectedCandidate.name}`);
    } catch {
      toast.error("Failed to send email");
    } finally {
      setPanelBusy((prev) => ({ ...prev, contact: false }));
    }
  }

  function getScoreColor(score: number | null): string {
    if (score === null) return "text-slate-400";
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        </main>
        <Footer />
      </div>
    );
  }

  if (selectedJob) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 mx-auto max-w-5xl w-full px-4 py-8">
          <Breadcrumbs
            className="mb-4"
            items={[
              { label: "Home", href: "/" },
              { label: "Dashboard", href: "/dashboard" },
              { label: "Hiring", href: "/dashboard/hiring" },
              { label: selectedJob.title },
            ]}
          />
          <button
            onClick={() => {
              setSelectedJob(null);
              setCandidates([]);
            }}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </button>

          <div className="glass-card p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-white">{selectedJob.title}</h1>
                <p className="text-sm text-slate-400 mt-1">{selectedJob.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedJob.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex rounded-full bg-indigo-900/50 px-2.5 py-0.5 text-xs font-medium text-indigo-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {selectedJob.interviewLink && (
                  <a
                    href={selectedJob.interviewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-xs font-medium text-white transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Interview Link
                  </a>
                )}
                <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", selectedJob.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800")}>
                  {selectedJob.isActive ? "Active" : "Closed"}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                Candidates ({candidates.length})
              </h2>
            </div>

            {candidatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
              </div>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-12">
                No candidates yet. Share the interview link to start receiving applications.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/50">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Name</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Score</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium hidden md:table-cell">Applied</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => (
                      <tr
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for ${c.name}`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("a, button, input, select, textarea")) return;
                          setSelectedCandidate(c);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedCandidate(c);
                          }
                        }}
                        className="border-b border-slate-800 last:border-0 cursor-pointer hover:bg-slate-800/40 transition-colors focus:outline-none focus:bg-slate-800/40 focus:ring-1 focus:ring-inset focus:ring-brand-500/50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-white">{c.name}</p>
                            <p className="text-xs text-slate-500">{c.email}</p>
                            {(c.resumeUrl || c.githubUrl || c.portfolioUrl) && (
                              <div className="flex gap-2 mt-1">
                                {c.resumeUrl && (
                                  <a href={c.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium">Resume</a>
                                )}
                                {c.githubUrl && (
                                  <a href={c.githubUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300">GitHub</a>
                                )}
                                {c.portfolioUrl && (
                                  <a href={c.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300">Portfolio</a>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={cn("py-3 px-4 font-bold", getScoreColor(c.interviewScore))}>
                          {c.interviewScore !== null ? `${c.interviewScore}%` : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <CandidateStatusBadge status={c.interviewStatus} />
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs hidden md:table-cell">
                          {formatDateIST(c.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {c.reportUrl && (
                              <a
                                href={c.reportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 text-xs"
                              >
                                Report
                              </a>
                            )}
                            {!c.convertedToIntern && c.interviewStatus === "COMPLETED" && (
                              <button
                                onClick={() => convertToIntern(c, selectedJob.id)}
                                disabled={convertingId === c.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-2.5 py-1.5 text-xs font-medium text-white transition-colors"
                              >
                                {convertingId === c.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserCheck className="h-3 w-3" />
                                )}
                                Convert
                              </button>
                            )}
                            {c.convertedToIntern && (
                              <span className="text-xs text-emerald-400 flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                Converted
                              </span>
                            )}
                            <span className="text-xs text-slate-500 hidden sm:inline">View →</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
        {selectedCandidate && (
          <CandidateDetailPanel
            candidate={selectedCandidate}
            jobId={selectedJob.id}
            jobTitle={selectedJob.title}
            open={true}
            onClose={() => setSelectedCandidate(null)}
            onStatusChange={handleStatusChange}
            onConvert={handlePanelConvert}
            onDelete={handleDeleteCandidate}
            onContact={handleContactCandidate}
            busy={panelBusy}
          />
        )}
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 mx-auto max-w-5xl w-full px-4 py-8">
        <Breadcrumbs className="mb-4" />
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Hiring Pipeline</h1>
              <p className="text-sm text-slate-400">Manage job postings and candidates</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Job
          </button>
        </div>

        {showCreateForm && (
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Create Job Posting</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Job Title"
                value={newJob.title}
                onChange={(e) => setNewJob((p) => ({ ...p, title: e.target.value }))}
                className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm"
              />
              <textarea
                placeholder="Job Description"
                value={newJob.description}
                onChange={(e) => setNewJob((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm resize-none"
              />
              <input
                type="text"
                placeholder="Skills (comma-separated): React, Node.js, Python"
                value={newJob.skills}
                onChange={(e) => setNewJob((p) => ({ ...p, skills: e.target.value }))}
                className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Location (e.g. Hyderabad / Remote)"
                  value={newJob.location}
                  onChange={(e) => setNewJob((p) => ({ ...p, location: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm"
                />
                <select
                  value={newJob.employmentType}
                  onChange={(e) => setNewJob((p) => ({ ...p, employmentType: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors text-sm"
                >
                  <option value="FULL_TIME">Full-Time</option>
                  <option value="PART_TIME">Part-Time</option>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Duration (e.g. 3–6 Months)"
                  value={newJob.duration}
                  onChange={(e) => setNewJob((p) => ({ ...p, duration: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm"
                />
                <input
                  type="text"
                  placeholder="Salary / Stipend Info"
                  value={newJob.salaryInfo}
                  onChange={(e) => setNewJob((p) => ({ ...p, salaryInfo: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm"
                />
                <input
                  type="email"
                  placeholder="Application Email"
                  value={newJob.applicationEmail}
                  onChange={(e) => setNewJob((p) => ({ ...p, applicationEmail: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors text-sm"
                />
              </div>
              <button
                onClick={createJob}
                disabled={creating}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors inline-flex items-center gap-2"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Job
              </button>
            </div>
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Briefcase className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No job postings yet.</p>
            <p className="text-xs text-slate-500 mt-1">Create your first job posting to start hiring.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => selectJob(job)}
                className="w-full glass-card p-5 text-left hover:ring-1 hover:ring-indigo-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white truncate">{job.title}</h3>
                      <span className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold shrink-0",
                        job.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"
                      )}>
                        {job.isActive ? "Active" : "Closed"}
                      </span>
                      {job.employmentType && job.employmentType !== "FULL_TIME" && (
                        <span className="inline-flex rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
                          {job.employmentType === "INTERNSHIP" ? "Internship" : job.employmentType === "PART_TIME" ? "Part-Time" : "Contract"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{job.description}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </span>
                      )}
                      {job.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {job.duration}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {job.candidateCount} candidates
                      </span>
                      {job.avgScore !== null && (
                        <span>Avg score: {job.avgScore}%</span>
                      )}
                      <span>{formatDateIST(job.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Link
                      href={`/careers/${job.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-500 hover:text-indigo-400 transition-colors p-1"
                      title="View public page"
                    >
                      <Link2 className="h-4 w-4" />
                    </Link>
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
