"use client";

import { Loader2, Users } from "lucide-react";
import { InternListPanel } from "@/components/dashboard/intern-list-panel";
import { InternDetailPanel } from "@/components/dashboard/intern-detail-panel";
import { useDashboardData } from "@/components/dashboard/use-dashboard-data";

export default function DashboardPage() {
  const {
    bootState,
    interns,
    selectedIntern,
    setSelectedIntern,
    detailLoading,
    actionLoading,
    stipendEdit,
    setStipendEdit,
    isSavingStipend,
    showDeactivated,
    setShowDeactivated,
    nameFilter,
    setNameFilter,
    statusFilter,
    setStatusFilter,
    joinFrom,
    setJoinFrom,
    joinTo,
    setJoinTo,
    attendanceSummary,
    attendanceLoading,
    activeTab,
    enrollModalOpen,
    setEnrollModalOpen,
    learningSyncLoading,
    notifications,
    notificationsLoading,
    perfScores,
    perfReview,
    analyticsLoading,
    reviewLoading,
    docVerifications,
    mentorOptions,
    mentorSaving,
    stats,
    filteredInterns,
    loadInternDetail,
    syncLearningProgress,
    triggerVerification,
    reviewDocument,
    regenerateReview,
    sendForEsign,
    handleAction,
    saveStipend,
    saveInternMentor,
    handleTabChange,
    handleEnrolled,
  } = useDashboardData();

  if (bootState === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (bootState === "forbidden") {
    return (
      <div className="flex items-center justify-center py-24 px-4">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <Users className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Admin access required</h1>
          <p className="text-sm text-slate-400 mt-2">
            Sign in with an account that has admin privileges.
          </p>
        </div>
      </div>
    );
  }

  if (bootState === "error") {
    return (
      <div className="flex items-center justify-center py-24 px-4">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <Users className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Unable to load dashboard</h1>
          <p className="text-sm text-slate-400 mt-2">
            Please refresh the page or try again later.
          </p>
        </div>
      </div>
    );
  }

  if (selectedIntern) {
    return (
      <InternDetailPanel
        intern={selectedIntern}
        detailLoading={detailLoading}
        onBack={() => setSelectedIntern(null)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        perfScores={perfScores}
        actionLoading={actionLoading}
        onAction={(action) => handleAction(action, selectedIntern.id)}
        onSendForEsign={() => sendForEsign(selectedIntern.id)}
        stipendEdit={stipendEdit}
        onStipendChange={setStipendEdit}
        isSavingStipend={isSavingStipend}
        onSaveStipend={() => saveStipend(selectedIntern.id)}
        docVerifications={docVerifications}
        onTriggerVerification={(docType, url) =>
          triggerVerification(selectedIntern.id, docType, url)
        }
        onReviewDocument={(id, action) =>
          reviewDocument(id, action, selectedIntern.id)
        }
        mentorOptions={mentorOptions}
        mentorSaving={mentorSaving}
        onSaveMentor={saveInternMentor}
        learningSyncLoading={learningSyncLoading}
        onSyncLearningProgress={() => syncLearningProgress(selectedIntern.id)}
        enrollModalOpen={enrollModalOpen}
        onEnrollModalOpenChange={setEnrollModalOpen}
        onEnrolled={handleEnrolled}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        analyticsLoading={analyticsLoading}
        perfReview={perfReview}
        reviewLoading={reviewLoading}
        onRegenerateReview={() => regenerateReview(selectedIntern.id)}
      />
    );
  }

  return (
    <InternListPanel
      stats={stats}
      attendanceSummary={attendanceSummary}
      attendanceLoading={attendanceLoading}
      interns={interns}
      filteredInterns={filteredInterns}
      showDeactivated={showDeactivated}
      onShowDeactivatedChange={setShowDeactivated}
      nameFilter={nameFilter}
      onNameFilterChange={setNameFilter}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      joinFrom={joinFrom}
      onJoinFromChange={setJoinFrom}
      joinTo={joinTo}
      onJoinToChange={setJoinTo}
      onSelectIntern={loadInternDetail}
    />
  );
}
