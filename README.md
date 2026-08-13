# Zoom Clone — Fullstack Video Conferencing Application

This is a fullstack video conferencing application built as part of the Scaler AI Labs assignment. It replicates the core experience of Zoom — from the dashboard and meeting scheduling to real-time peer-to-peer video calls using WebRTC. Two or more people can join the same meeting room and see and hear each other through their real camera and microphone.

The application is intentionally scoped to what the assignment requires. There is no authentication system, no chat, no recording, and no breakout rooms. What exists is a clean, functional video conferencing flow from dashboard to call and back.

---

## What the application does

When you open the app, you land on a Zoom-style dashboard. From there you can start a meeting instantly, join an existing one by pasting a meeting ID or a link, or schedule a future meeting with a title, date, and duration.

When you enter a meeting room, your browser asks for camera and microphone permission. Once granted, your video feed appears on screen. If someone else joins the same meeting (by navigating to the same meeting code), a WebRTC peer connection is negotiated between both browsers through a Socket.IO signaling server running on the backend. After the connection is established, both participants see each other's live video and hear each other's audio directly, without any media passing through the server.

You can mute your microphone, turn off your camera, share your screen, view the participants list, remove participants (host only), and leave the meeting. All of these work in real time.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | Next.js 16.3 with the App Router, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Real-time signaling | Socket.IO (python-socketio on the server, socket.io-client in the browser) |
| Peer-to-peer media | WebRTC (browser-native RTCPeerConnection API) |
| Backend framework | FastAPI (Python 3.11+) |
| ORM | SQLAlchemy 2.0 with Pydantic v2 schemas |
| Database | SQLite |
| Package managers | npm for frontend, pip for backend |

---

## How the architecture works

There are two servers running side by side:

The **frontend** runs on port 3000 and is a standard Next.js application. Every page and component is written as a React component. The meeting room page is where the WebRTC logic lives.

The **backend** runs on port 8000 and handles two things at once. It serves a REST API built with FastAPI for everything related to meeting data — creating meetings, fetching participant lists, scheduling, ending meetings, and so on. It also runs a Socket.IO server for WebRTC signaling. Both live on the same port because `socketio.ASGIApp` wraps the FastAPI app and routes `/socket.io/*` requests to the signaling layer while forwarding everything else to FastAPI.

The **signaling flow** works like this: when a user joins a meeting room, their browser connects to the Socket.IO server and emits a `join_room` event with their meeting code and display name. The server keeps an in-memory map of who is in each room. It sends back a list of existing participants to the newcomer, and it broadcasts a `user-joined` event to everyone already in the room. Each browser then creates an `RTCPeerConnection` for every other participant and goes through the standard WebRTC offer-answer-ICE exchange, with the server acting as a relay. Once the ICE negotiation completes, media flows directly between browsers.

The **database** stores meeting metadata — titles, codes, participant names, host flags, mute states, scheduled times, and so on. SQLite is used as a file on disk, which is fine for a demo. The real-time media state (who is muted, who is sharing their screen) lives only in the signaling server's memory and does not touch the database.

---

## Project structure

```
ScalerAiLabsAssignmentZoomClone/
|
├── backend/
│   ├── main.py                  Entry point. Mounts Socket.IO around FastAPI.
│   ├── database.py              SQLAlchemy engine and session factory.
│   ├── models.py                ORM models: User, Meeting, Participant.
│   ├── schemas.py               Pydantic v2 schemas for request and response bodies.
│   ├── seed.py                  Populates the database with demo data on first run.
│   ├── requirements.txt         All Python dependencies.
│   ├── Procfile                 Tells Render how to start the server.
│   ├── runtime.txt              Pins the Python version for deployment.
│   ├── .env                     Local environment config (TURN server placeholders).
│   └── routers/
│       ├── meetings.py          REST endpoints for meeting operations.
│       ├── participants.py      REST endpoints for participant operations.
│       └── signaling.py        Socket.IO event handlers for WebRTC signaling.
│
└── frontend/
    ├── .env.local               Local environment config (API and socket URLs).
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx               Root HTML layout and font setup.
    │   │   ├── page.tsx                 Dashboard (home page).
    │   │   ├── globals.css              Brand color tokens and global styles.
    │   │   ├── join/[meetingCode]/      Join-by-link page.
    │   │   └── meeting/[meetingCode]/   Meeting room page.
    │   ├── components/
    │   │   ├── Sidebar.tsx              Left navigation bar.
    │   │   ├── Clock.tsx                Live clock on the dashboard.
    │   │   ├── HomeActionButtons.tsx    The four action buttons on the dashboard.
    │   │   ├── MeetingCard.tsx          Individual row in the meetings list.
    │   │   ├── JoinMeetingModal.tsx     Modal dialog for joining a meeting.
    │   │   ├── ScheduleMeetingModal.tsx Modal dialog for scheduling a meeting.
    │   │   └── meeting/
    │   │       ├── VideoTile.tsx        Renders a participant's video or avatar.
    │   │       ├── ControlBar.tsx       Bottom toolbar with all meeting controls.
    │   │       └── ParticipantsPanel.tsx Slide-in panel listing all participants.
    │   ├── hooks/
    │   │   ├── useSocket.ts            Singleton Socket.IO client with typed events.
    │   │   └── useWebRTC.ts           Full WebRTC engine: media, peers, signaling.
    │   └── lib/
    │       └── api.ts                  All REST API calls in one place.
    └── package.json
```

---

## Database schema

The database has three tables.

**users** stores the single default user for the application. Since there is no authentication, every action is attributed to this user. It holds a name, a unique email, avatar initials, and a timestamp.

**meetings** is the core table. Each row represents one meeting, whether instant or scheduled. A meeting has a unique ten-digit numeric code that acts as its public identifier, a title, an optional description, a reference to the host user, a type (instant or scheduled), a status (upcoming, live, or ended), an optional scheduled time, an optional duration in minutes, an invite link, a creation timestamp, and an optional end timestamp.

**participants** tracks who has joined each meeting. Each row links a meeting to a person by display name. It records whether they are the host, whether they are muted, whether their video is on, when they joined, and when they left.

The relationships are: one user can host many meetings, and one meeting can have many participants.

---

## API reference

All endpoints are prefixed with `/api`. Every response body is JSON. You can view interactive documentation by visiting `http://localhost:8000/docs` while the backend is running.

| Method | Path | What it does |
|--------|------|-------------|
| POST | `/api/meetings/instant` | Creates a new instant meeting and returns it. |
| GET | `/api/meetings/upcoming` | Returns all meetings with status "upcoming", sorted by scheduled time ascending. |
| GET | `/api/meetings/recent` | Returns all meetings with status "ended", sorted by end time descending. |
| GET | `/api/meetings/{meeting_code}` | Fetches a single meeting by its ten-digit code. Used to validate a meeting exists before joining. |
| POST | `/api/meetings/{meeting_code}/join` | Registers a new participant in a meeting. Takes a display name in the body. |
| POST | `/api/meetings/scheduled` | Creates a scheduled meeting. Takes title, optional description, scheduled time, and duration. |
| POST | `/api/meetings/{meeting_code}/end` | Marks a meeting as ended and records the end time. |
| GET | `/api/meetings/{meeting_code}/participants` | Returns the full list of participants for a meeting. |
| PATCH | `/api/participants/{participant_id}` | Updates a participant's mute state. |
| DELETE | `/api/participants/{participant_id}` | Removes a participant from a meeting. |

---

## Socket.IO signaling events

These are not REST endpoints. They are WebSocket events handled by the signaling server at `/socket.io/`.

**Client emits to server:**

`join_room` — sent when a user enters the meeting room. Payload includes meeting code, display name, host flag, and database participant ID. The server adds them to the room, sends back `existing-participants`, and broadcasts `user-joined` to others.

`offer`, `answer`, `ice_candidate` — standard WebRTC signaling messages. The server relays each one to the specific target socket ID without inspecting the content.

`media_state_changed` — sent when the user mutes or unmutes, or turns the camera on or off. The server updates the in-memory room state and broadcasts the change to everyone else in the room.

`screen_share_state` — sent when screen sharing starts or stops. Broadcast to the rest of the room.

`remove_participant` — sent by the host to force another participant to leave. The server checks that the requester is the host before emitting a `force-leave` event to the target.

**Server emits to client:**

`existing-participants` — list of everyone already in the room, sent only to the newcomer.

`user-joined` — sent to everyone except the newcomer when a new participant joins.

`user-left` — sent to everyone when a participant disconnects.

`offer`, `answer`, `ice-candidate` — relayed to the specific target peer.

`media-state-changed` — broadcast from the server when someone's mute or video state changes.

`screen-share-state` — broadcast when someone's screen share state changes.

`force-leave` — sent to a specific participant when the host removes them.

---

## Running the application locally

### What you need installed

- Node.js version 18 or higher
- npm (comes with Node.js)
- Python 3.11 or higher
- pip (comes with Python)

You can check your versions by running `node --version`, `python --version`, and `pip --version` in a terminal.

### Step 1 — Get the code

```bash
git clone <repository-url>
cd ScalerAiLabsAssignmentZoomClone
```

### Step 2 — Start the backend

Open a terminal and run:

```bash
cd backend
pip install -r requirements.txt
python seed.py
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
```

The `seed.py` script creates the SQLite database file and fills it with a default user and some demo meetings. You only need to run it once. If you run it again it will add duplicate data, so skip it after the first time.

The important thing here is that the start command is `uvicorn main:socket_app`, not `uvicorn main:app`. The `socket_app` object is the Socket.IO ASGI wrapper that sits in front of FastAPI. If you run `main:app` instead, the WebSocket connections will not work and video calls will fail.

Once started, you can visit `http://localhost:8000/docs` to explore the API.

### Step 3 — Start the frontend

Open a second terminal and run:

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

### Step 4 — Test a video call

Open `http://localhost:3000` in two separate browser windows (or one normal window and one incognito window). In one, click "New Meeting". Copy the invite link from the top of the meeting room. Paste it in the other window. Both windows will ask for camera and microphone permission. Grant it in both. Within a few seconds the WebRTC connection will be established and you will see both video feeds.

---

## Environment variables

### backend/.env

This file is only used for local development. The current contents are commented-out TURN server placeholders. You do not need to change anything here to run the app locally. STUN works fine on localhost.

If you later add a TURN server for production use, you would uncomment those lines and fill in the credentials.

### frontend/.env.local

This file tells the frontend where the backend is. For local development it is already set correctly:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

Do not change these for local development.

---

## Deploying to production

The recommended setup is to deploy the backend to Render and the frontend to Vercel. Both have free tiers.

Vercel cannot host the backend because it is a serverless platform and Socket.IO requires a persistent server process with WebSocket support. Render, Railway, and Fly.io all support this.

### Backend on Render

Create a new Web Service on Render and point it at the `backend` folder of your repository. Set the build command to `pip install -r requirements.txt` and the start command to `uvicorn main:socket_app --host 0.0.0.0 --port $PORT`. Add a 1 GB persistent disk mounted at `/data` so the SQLite database survives restarts.

Set these environment variables in the Render dashboard:

| Variable | Value |
|----------|-------|
| `ALLOWED_ORIGINS` | The Vercel URL of your frontend, e.g. `https://your-app.vercel.app` |
| `DATABASE_URL` | `/data/zoom_clone.db` |
| `PYTHON_VERSION` | `3.11.9` |

### Frontend on Vercel

Import the repository into Vercel, set the root directory to `frontend`, and add these environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Your Render backend URL, e.g. `https://zoom-clone-backend.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | Same as above |

After both are deployed, go back to Render and update `ALLOWED_ORIGINS` to your actual Vercel URL, then trigger a redeploy.

---

## Known limitations

**Single user account.** There is no authentication. The app assumes a single user named Klaus Schwarz for all operations. Anyone who opens the app is treated as this user.

**SQLite on a single instance.** SQLite is a file-based database and does not support concurrent writes from multiple processes. This means you cannot run more than one backend instance at the same time. For production at scale you would migrate to PostgreSQL, which Render also offers for free.

**No TURN server configured.** Google's public STUN servers are configured by default. STUN works for most users on home networks and mobile connections. However, users behind a corporate firewall or a symmetric NAT will not be able to establish a peer-to-peer connection without a TURN server. TURN acts as a media relay for these cases. Services like Metered.ca and Cloudflare Calls offer free TURN allocations.

**In-memory room state.** The signaling server keeps room state in a Python dictionary. This means if the backend process restarts, all active WebRTC sessions drop. This is expected behavior for a demo and can be addressed with a Redis adapter for python-socketio in a production setup.

**Mesh topology.** Every participant connects directly to every other participant. This works well for small meetings of two to four people. For larger meetings, a media server (SFU) such as mediasoup or LiveKit would be needed to avoid each participant uploading their video stream once per peer.

**Chat, recording, and screen share audio.** The Share Screen button initiates a real screen share using the browser's `getDisplayMedia` API and replaces the video track in all active peer connections. However, system audio is not captured. The Chat and Record buttons display an alert message indicating they are not available.

---

## Features summary

- Start an instant meeting with one click and get redirected to the meeting room immediately
- Join any meeting by entering a ten-digit meeting code or pasting an invite link
- Schedule a future meeting with a custom title, description, date, time, and duration
- View upcoming and recently ended meetings on the dashboard
- Real peer-to-peer video and audio via WebRTC between all participants in a meeting
- Toggle your microphone on and off; the change is reflected instantly for everyone else
- Toggle your camera on and off; others see your initials avatar when the camera is off
- Share your screen; it takes over the featured tile in the layout for all participants
- View the participants panel listing everyone currently in the meeting
- Host can mute or remove any participant
- Copy the invite link to your clipboard with one click
- Clean disconnection on leave: tracks are stopped, peer connections are closed, and the socket is disconnected
