# Aegis local container stack

The repository includes a local Postgres, FastAPI, and Next.js stack.

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Database: PostgreSQL on localhost:5432

The backend container runs `alembic upgrade head` before starting FastAPI. The
default JWT secret is development-only; set `JWT_SECRET_KEY` in a local `.env`
file or in the shell before starting Compose.

To run the containers against the existing Neon database, use the ignored
backend environment file explicitly:

```bash
docker compose --env-file backend/.env up -d --build
```

This uses `DATABASE_URL` from `backend/.env`; never commit that file or print
its contents.

To stop the stack while preserving database data:

```bash
docker compose down
```

To remove the local database volume as well:

```bash
docker compose down -v
```

## Continuous integration

`.github/workflows/ci.yml` runs on pushes and pull requests. It checks the
frontend lint/build, compiles the backend and runs backend tests when present,
then validates the Compose file and builds both service images.

Dependabot is configured to propose weekly dependency updates for the frontend
and backend.

## Render + Vercel deployment

`render.yaml` defines the Render FastAPI service and managed PostgreSQL
database. Create a Render Blueprint from the repository, then set `CORS_ORIGINS`
to the deployed Vercel URL (for example, `https://aegis-frontend.vercel.app`).
Render runs migrations from the backend Dockerfile before starting the API and
uses `/health` for deployment health checks.

In Vercel, import the repository with the project root set to `frontend/` and
add this Production environment variable:

```text
NEXT_PUBLIC_API_URL=https://<your-aegis-api>.onrender.com
```

Because `NEXT_PUBLIC_API_URL` is embedded during the Next.js build, redeploy
Vercel after changing it. Keep `JWT_SECRET_KEY` and `DATABASE_URL` only in
Render; they must never be added to Vercel or committed to Git.
