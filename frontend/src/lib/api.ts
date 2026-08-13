/**
 * Centralized API layer — all fetch calls to the backend go through here.
 * Pages/components MUST use these functions, not inline fetch calls.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Meeting {
  id: number;
  meeting_code: string;
  title: string;
  description: string | null;
  host_id: number;
  meeting_type: "instant" | "scheduled";
  status: "upcoming" | "live" | "ended";
  scheduled_at: string | null;
  duration_minutes: number | null;
  invite_link: string;
  created_at: string;
  ended_at: string | null;
}

export interface Participant {
  id: number;
  meeting_id: number;
  display_name: string;
  is_host: boolean;
  is_muted: boolean;
  video_on: boolean;
  joined_at: string;
  left_at: string | null;
}

export interface JoinMeetingResponse {
  participant_id: number;
  meeting: Meeting;
}

// ── API Functions ────────────────────────────────────────────────────────────

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

/** Create an instant meeting */
export async function createInstantMeeting(title?: string): Promise<Meeting> {
  const response = await fetch(`${API_BASE}/api/meetings/instant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(title ? { title } : {}),
  });
  return handleResponse<Meeting>(response);
}

/** Get a meeting by its code */
export async function getMeeting(meetingCode: string): Promise<Meeting> {
  const response = await fetch(`${API_BASE}/api/meetings/${meetingCode}`);
  return handleResponse<Meeting>(response);
}

/** Join a meeting */
export async function joinMeeting(meetingCode: string, displayName: string): Promise<JoinMeetingResponse> {
  const response = await fetch(`${API_BASE}/api/meetings/${meetingCode}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ display_name: displayName }),
  });
  return handleResponse<JoinMeetingResponse>(response);
}

/** Schedule a meeting */
export async function scheduleMeeting(data: {
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
}): Promise<Meeting> {
  const response = await fetch(`${API_BASE}/api/meetings/scheduled`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Meeting>(response);
}

/** List upcoming meetings */
export async function getUpcomingMeetings(): Promise<Meeting[]> {
  const response = await fetch(`${API_BASE}/api/meetings/upcoming`);
  return handleResponse<Meeting[]>(response);
}

/** List recent/past meetings */
export async function getRecentMeetings(): Promise<Meeting[]> {
  const response = await fetch(`${API_BASE}/api/meetings/recent`);
  return handleResponse<Meeting[]>(response);
}

/** End a meeting */
export async function endMeeting(meetingCode: string): Promise<Meeting> {
  const response = await fetch(`${API_BASE}/api/meetings/${meetingCode}/end`, {
    method: "POST",
  });
  return handleResponse<Meeting>(response);
}

/** Get participants for a meeting */
export async function getParticipants(meetingCode: string): Promise<Participant[]> {
  const response = await fetch(`${API_BASE}/api/meetings/${meetingCode}/participants`);
  return handleResponse<Participant[]>(response);
}

/** Update a participant's mute state */
export async function updateParticipant(participantId: number, data: { is_muted: boolean }): Promise<Participant> {
  const response = await fetch(`${API_BASE}/api/participants/${participantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Participant>(response);
}

/** Remove a participant */
export async function removeParticipant(participantId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/participants/${participantId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
}
