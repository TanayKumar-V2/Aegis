from fastapi import FastAPI

from app.routers import auth,patients,doctors,enteries,medications,flags,audit
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(title="Aegis")

app.add_middleware(
      CORSMiddleware,
      allow_origins=settings.allowed_cors_origins,
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(enteries.router)
app.include_router(medications.router)
app.include_router(flags.router)
app.include_router(audit.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
