"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import JoinMeetingModal from "@/components/JoinMeetingModal";

export default function JoinPage() {
  const params = useParams();
  const meetingCode = params.meetingCode as string;
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar />
      <div className="flex-1 ml-[72px] flex items-center justify-center">
        <JoinMeetingModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          prefillCode={meetingCode}
        />
        {!modalOpen && (
          <div className="text-center">
            <p className="text-[var(--zoom-text-secondary)] mb-4">
              Join modal was closed.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-6 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--zoom-blue)" }}
            >
              Open Join Modal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
