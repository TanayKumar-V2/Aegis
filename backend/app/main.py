from fastapi import FastAPI

from app.routers import auth,patients,enteries,medications,flags,audit
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Aegis")

app.add_middleware(
      CORSMiddleware,
      allow_origins=[
          "http://localhost:3000",
          "http://127.0.0.1:3000",
      ],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(enteries.router)
app.include_router(medications.router)
app.include_router(flags.router)
app.include_router(audit.router)

@app.get("/health")
async def health():
    return {"status": "ok"}