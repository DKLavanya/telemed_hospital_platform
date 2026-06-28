from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.endpoints import router as api_router
from app.models import models
from app.services.webrtc_signaling import signaling_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set CORS origins
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    allowed_origins = allowed_origins_env.split(",")
else:
    allowed_origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Mount main API endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)

# WebRTC signaling WebSocket endpoint
@app.websocket("/ws/signaling/{room_id}/{client_id}")
async def websocket_signaling_endpoint(
    websocket: WebSocket, 
    room_id: str, 
    client_id: str,
    token: str = Query(None)
):
    # Authenticate token query parameter
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await signaling_manager.connect(websocket, room_id, client_id)
    try:
        while True:
            # Client sends signal (SDP Offer/Answer or ICE Candidate)
            data = await websocket.receive_json()
            # Relay signal to other client in the room
            await signaling_manager.broadcast(
                room_id=room_id,
                message=data,
                exclude_client=client_id
            )
    except WebSocketDisconnect:
        await signaling_manager.disconnect(websocket, room_id, client_id)
    except Exception as e:
        logger.error(f"WebSocket error in room {room_id} for client {client_id}: {e}")
        await signaling_manager.disconnect(websocket, room_id, client_id)

@app.get("/")
def read_root():
    return {"status": "healthy", "service": settings.PROJECT_NAME}
