import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.middleware.care_circle_permission import verify_patient_access
from app.models.user import User
from app.services.auth import decode_token
from app.services.websocket_manager import websocket_manager


router = APIRouter(tags=["realtime"])


@router.websocket("/ws/patients/{patient_id}/flags")
async def patient_flag_updates(websocket: WebSocket, patient_id: uuid.UUID) -> None:
    # MVP tradeoff: browser WebSockets authenticate with a JWT query parameter,
    # which may appear in server access logs. A short-lived one-time connection
    # ticket would be preferable if this channel is hardened for production.
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=1008, reason="Invalid or expired token")
        return

    try:
        user_id = uuid.UUID(payload.get("sub", ""))
    except (ValueError, AttributeError):
        await websocket.close(code=1008, reason="Invalid token subject")
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
        current_user = result.scalar_one_or_none()
        if not current_user:
            await websocket.close(code=1008, reason="User not found or inactive")
            return

        try:
            await verify_patient_access(patient_id, None, current_user, db)
        except Exception:
            await websocket.close(code=1008, reason="You do not have access to this patient")
            return

    patient_key = str(patient_id)
    await websocket_manager.connect(patient_key, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        websocket_manager.disconnect(patient_key, websocket)
