from fastapi import FastAPI

from app.routers import auth,patients

app = FastAPI(title="Aegis")

app.include_router(auth.router)
app.include_router(patients.router)


@app.get("/health")
async def health():
    return {"status": "ok"}