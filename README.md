# Zoom Clone — Fullstack Web Application

A functional clone of the Zoom web application built as a fullstack web app with a Next.js frontend and FastAPI backend. Users can instantly start meetings, join existing meetings by ID/link, and schedule future meetings — all with a pixel-accurate Zoom-inspired UI.

![Dashboard](https://img.shields.io/badge/Status-Working-brightgreen) ![Tech](https://img.shields.io/badge/Stack-Next.js%20%2B%20FastAPI%20%2B%20SQLite-blue)

---

## Tech Stack

| Layer           | Technology                                      |
| --------------- | ----------------------------------------------- |
| Frontend        | Next.js (App Router), React, TypeScript          |
| Styling         | Tailwind CSS v4                                  |
| Backend         | Python 3.11+, FastAPI                            |
| ORM             | SQLAlchemy (with Pydantic v2 schemas)            |
| Database        | SQLite (`zoom_clone.db`)                         |
| API             | REST, JSON over HTTP                             |
| Package Managers| npm (frontend), pip (backend)                    |
| Dev Servers     | Frontend: `http://localhost:3000`, Backend: `http://localhost:8000` |

---

## Setup Instructions

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.11+
- **pip**

### 1. Clone the repository

```bash
git clone <repository-url>
cd ScalerAiLabsAssignmentZoomClone
```

### 2. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Seed the database (creates tables + inserts demo data)
python seed.py

# Start the backend server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the Swagger UI.

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Assumptions

- **No authentication implemented** — a single default user ("Klaus Schwarz") is seeded and assumed for all operations per assignment instructions.
- **Video/audio is UI-only** — no real WebRTC streaming is implemented. The meeting room displays placeholder video tiles with participant names and initials.
- **Share Screen, Chat, Record** buttons in the meeting room are inert/non-functional (display toast messages).
- **Chat, Meetings, Contacts** sidebar nav items are visually present but non-functional (disabled state).
- **Search bar** in the header is a visual placeholder only.
- **Profile dropdown** (Settings, Profile) contains inert menu items.

---

## Database Schema

### ER Diagram

```
┌────────────┐       ┌─────────────────┐       ┌──────────────────┐
│   users     │       │    meetings      │       │  participants     │
├────────────┤       ├─────────────────┤       ├──────────────────┤
│ id (PK)    │───1:N─│ id (PK)         │───1:N─│ id (PK)          │
│ name       │       │ meeting_code (U) │       │ meeting_id (FK)  │
│ email (U)  │       │ title           │       │ display_name     │
│ avatar_    │       │ description     │       │ is_host          │
│  initials  │       │ host_id (FK)    │       │ is_muted         │
│ created_at │       │ meeting_type    │       │ video_on         │
└────────────┘       │ status          │       │ joined_at        │
                     │ scheduled_at    │       │ left_at          │
                     │ duration_minutes│       └──────────────────┘
                     │ invite_link     │
                     │ created_at      │
                     │ ended_at        │
                     └─────────────────┘
```

### Relationships

- **users** `1 — N` **meetings**: One host can have many meetings (`host_id` FK)
- **meetings** `1 — N` **participants**: One meeting has many participants (`meeting_id` FK)

### Table Details

**users**: Default user account. `email` is unique. `avatar_initials` stores display initials (e.g., "KS").

**meetings**: Core meeting entity. `meeting_code` is a unique 10-digit numeric ID. `meeting_type` is either `"instant"` or `"scheduled"`. `status` is `"upcoming"`, `"live"`, or `"ended"`.

**participants**: Tracks who joined each meeting. `is_host` indicates the meeting creator. `is_muted` and `video_on` track participant media state.

---

## API Endpoints

| Method | Path                                  | Purpose                                  |
| ------ | ------------------------------------- | ---------------------------------------- |
| POST   | `/api/meetings/instant`               | Create + start an instant meeting        |
| GET    | `/api/meetings/{meeting_code}`        | Fetch a meeting by code (join validation)|
| POST   | `/api/meetings/{meeting_code}/join`   | Register a participant joining           |
| POST   | `/api/meetings/scheduled`             | Create a scheduled meeting               |
| GET    | `/api/meetings/upcoming`              | List upcoming meetings (sorted ASC)      |
| GET    | `/api/meetings/recent`                | List ended meetings (sorted DESC)        |
| POST   | `/api/meetings/{meeting_code}/end`    | Mark a meeting as ended                  |
| GET    | `/api/meetings/{meeting_code}/participants` | List participants of a meeting     |
| PATCH  | `/api/participants/{participant_id}`  | Update participant mute state            |
| DELETE | `/api/participants/{participant_id}`  | Remove a participant                     |

All responses are JSON. See `http://localhost:8000/docs` for full Swagger documentation.

---

## Project Structure

```
ScalerAiLabsAssignmentZoomClone/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLAlchemy engine + session
│   ├── models.py            # ORM models (User, Meeting, Participant)
│   ├── schemas.py           # Pydantic v2 request/response schemas
│   ├── seed.py              # Database seeding script
│   ├── requirements.txt     # Python dependencies
│   └── routers/
│       ├── meetings.py      # Meeting endpoints
│       └── participants.py  # Participant endpoints
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── page.tsx             # Dashboard / Home
│   │   │   ├── globals.css          # Zoom brand colors + theme
│   │   │   ├── join/[meetingCode]/page.tsx    # Join via link
│   │   │   └── meeting/[meetingCode]/page.tsx # Meeting room
│   │   ├── components/
│   │   │   ├── Sidebar.tsx          # Left navigation
│   │   │   ├── Clock.tsx            # Live clock display
│   │   │   ├── HomeActionButtons.tsx # 4 circular action buttons
│   │   │   ├── MeetingCard.tsx      # Meeting list row
│   │   │   ├── JoinMeetingModal.tsx  # Join meeting dialog
│   │   │   ├── ScheduleMeetingModal.tsx # Schedule meeting dialog
│   │   │   └── meeting/
│   │   │       ├── VideoTile.tsx     # Participant video placeholder
│   │   │       ├── ControlBar.tsx    # Meeting toolbar
│   │   │       └── ParticipantsPanel.tsx # Side panel
│   │   └── lib/
│   │       └── api.ts               # Centralized API layer
│   └── package.json
└── README.md
```

---

## Features

- **Instant Meeting**: One-click meeting creation with automatic redirect to meeting room
- **Join Meeting**: Enter meeting ID or paste invite link, validates against backend
- **Schedule Meeting**: Set topic, date, time, and duration; auto-generates meeting ID
- **Meeting Room**: Dark-themed UI with video tiles, control bar, participants panel
- **Host Controls**: Mute/unmute and remove participants (wired to backend API)
- **Copy Invite Link**: One-click copy of shareable meeting link
- **Live Clock**: Real-time clock display on the dashboard
- **Responsive Meeting List**: Upcoming/Recent tabs with proper sorting
