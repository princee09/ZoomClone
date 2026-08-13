"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Clock from "@/components/Clock";
import HomeActionButtons from "@/components/HomeActionButtons";
import MeetingCard from "@/components/MeetingCard";
import JoinMeetingModal from "@/components/JoinMeetingModal";
import ScheduleMeetingModal from "@/components/ScheduleMeetingModal";
import { getUpcomingMeetings, getRecentMeetings, joinMeeting } from "@/lib/api";
import type { Meeting } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [activeTab, setActiveTab] = useState<"upcoming" | "recent">("upcoming");
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileDropdown, setProfileDropdown] = useState(false);

  const fetchMeetings = useCallback(async () => {
    try {
      const [upcomingData, recentData] = await Promise.all([
        getUpcomingMeetings(),
        getRecentMeetings(),
      ]);
      setUpcoming(upcomingData);
      setRecent(recentData);
    } catch (err) {
      console.error("Failed to fetch meetings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleStartMeeting = async (meetingCode: string) => {
    try {
      await joinMeeting(meetingCode, "Klaus Schwarz");
      router.push(`/meeting/${meetingCode}?name=Klaus+Schwarz`);
    } catch (err) {
      console.error("Failed to start meeting:", err);
    }
  };

  const handleScheduled = () => {
    fetchMeetings();
  };

  const meetings = activeTab === "upcoming" ? upcoming : recent;

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 ml-[72px]">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-3 bg-white/80 backdrop-blur-md border-b" style={{ borderColor: "var(--zoom-sidebar-border)" }}>
          {/* Search placeholder */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F0F0F5] w-[320px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#747487" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="text-sm text-[var(--zoom-text-secondary)]">Search</span>
          </div>

          {/* Profile avatar */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdown(!profileDropdown)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-all hover:ring-2 hover:ring-[var(--zoom-blue)]/30"
              style={{ backgroundColor: "var(--zoom-blue)" }}
            >
              KS
            </button>
            {profileDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileDropdown(false)} />
                <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border z-50 py-1" style={{ borderColor: "var(--zoom-card-border)" }}>
                  <button className="w-full px-4 py-2.5 text-sm text-left text-[var(--foreground)] hover:bg-[#F0F0F5] transition-colors">
                    Profile
                  </button>
                  <button className="w-full px-4 py-2.5 text-sm text-left text-[var(--foreground)] hover:bg-[#F0F0F5] transition-colors">
                    Settings
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Dashboard content */}
        <main className="px-12 py-10 max-w-[960px]">
          {/* Clock */}
          <Clock />

          {/* Action buttons */}
          <HomeActionButtons
            onJoinClick={() => setJoinModalOpen(true)}
            onScheduleClick={() => setScheduleModalOpen(true)}
          />

          {/* Meetings section */}
          <div>
            {/* Tab toggle */}
            <div className="flex items-center gap-1 mb-5 border-b" style={{ borderColor: "var(--zoom-card-border)" }}>
              <button
                onClick={() => setActiveTab("upcoming")}
                className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeTab === "upcoming"
                    ? "text-[var(--zoom-blue)] border-[var(--zoom-blue)]"
                    : "text-[var(--zoom-text-secondary)] border-transparent hover:text-[var(--foreground)]"
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab("recent")}
                className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeTab === "recent"
                    ? "text-[var(--zoom-blue)] border-[var(--zoom-blue)]"
                    : "text-[var(--zoom-text-secondary)] border-transparent hover:text-[var(--foreground)]"
                }`}
              >
                Recent
              </button>
            </div>

            {/* Meeting list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-3 border-[var(--zoom-blue)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : meetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#D0D0D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p className="text-sm text-[var(--zoom-text-secondary)] font-medium">
                  {activeTab === "upcoming" ? "No upcoming meetings" : "No recent meetings"}
                </p>
                <p className="text-xs text-[var(--zoom-text-secondary)] mt-1">
                  {activeTab === "upcoming"
                    ? "Schedule a meeting to see it here"
                    : "Your past meetings will appear here"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {meetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    variant={activeTab}
                    onStart={activeTab === "upcoming" ? handleStartMeeting : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <JoinMeetingModal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} />
      <ScheduleMeetingModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onScheduled={handleScheduled}
      />
    </div>
  );
}
