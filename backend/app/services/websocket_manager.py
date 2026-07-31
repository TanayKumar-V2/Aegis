from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, patient_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[patient_id].append(websocket)

    def disconnect(self, patient_id: str, websocket: WebSocket) -> None:
        connections = self.active_connections.get(patient_id)
        if not connections:
            return

        try:
            connections.remove(websocket)
        except ValueError:
            return

        if not connections:
            self.active_connections.pop(patient_id, None)

    async def broadcast_to_patient(self, patient_id: str, message: dict) -> None:
        connections = list(self.active_connections.get(patient_id, []))
        stale_connections: list[WebSocket] = []

        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                stale_connections.append(websocket)

        for websocket in stale_connections:
            self.disconnect(patient_id, websocket)


websocket_manager = ConnectionManager()
