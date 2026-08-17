# Schedulo Frontend

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

### Supabase configuration

Create a Supabase project and add these values to `.env`:

```text
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

In Supabase Auth settings:

- enable Email provider for magic links;
- enable Google provider for OAuth;
- add `http://localhost:5173` to the allowed redirect URLs.

When a user authenticates, Schedulo asks them to create an organization. The organization type can be `School` or `College / institute`; the backend creates the first scheduling workspace for it.
