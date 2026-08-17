# Schedulo Frontend

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

### Authentication configuration

The FastAPI backend owns authentication and signs JWT access tokens. Add these values to `.env`:

```text
VITE_API_URL=http://localhost:8000
```

Google OAuth is configured on the backend with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `API_PUBLIC_URL`, and `FRONTEND_ORIGIN`.

When a user authenticates, Schedulo asks them to create an organization. The organization type can be `School` or `College / institute`; the backend creates the first scheduling workspace for it.
