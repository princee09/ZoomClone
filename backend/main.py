"""FastAPI application entry point with Socket.IO integration.

Architecture:
- FastAPI handles all REST endpoints (/api/*)
- python-socketio handles WebRTC signaling (/socket.io/*)
- socketio.ASGIApp wraps both and is the ASGI callable exposed to uvicorn

The Socket.IO ASGI app mounts the FastAPI app as its internal WSGI/ASGI
fallback, so all REST routes remain available on the same port (8000).
CORS for REST is handled by FastAPI's CORSMiddleware.
Socket.IO CORS is configured via cors_allowed_origins on AsyncServer.
"""

import os

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# CORS origins — set ALLOWED_ORIGINS env var in production (comma-separated)
# e.g. ALLOWED_ORIGINS=https://your-app.vercel.app
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS: list[str] = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

from database import Base, engine
from routers import meetings, participants
from routers import signaling as signaling_module

# ---------------------------------------------------------------------------
# Create SQLAlchemy tables on startup
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# FastAPI app (REST only)
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Zoom Clone API",
    description="Backend API for the Zoom Clone application",
    version="2.0.0",
)

# CORS for REST endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST routers
app.include_router(meetings.router)
app.include_router(participants.router)


@app.get("/")
def root() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "message": "Zoom Clone API is running"}


# ---------------------------------------------------------------------------
# Socket.IO server — async mode for uvicorn/ASGI
# ---------------------------------------------------------------------------
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=ALLOWED_ORIGINS,
    logger=False,
    engineio_logger=False,
)

# Register all Socket.IO event handlers from signaling module
signaling_module.register_handlers(sio)

# ---------------------------------------------------------------------------
# The Socket.IO ASGI app intercepts /socket.io/* requests itself and
# forwards everything else to FastAPI.  uvicorn must be pointed at
# socket_app (not app) for WebSocket + REST to coexist on port 8000.
# ---------------------------------------------------------------------------
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    static_files={},
    socketio_path="/socket.io",
)
