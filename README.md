# Machinery CRM

Phase 1 foundation for a heavy-equipment CRM.

**Stack:** React 18, TypeScript, Vite, Tailwind CSS, Supabase Postgres/Auth with row-level security.

## Phase 1 features

- Authentication and profile foundation
- Accounts and account ownership
- Equipment assets and locations
- Opportunity pipeline
- Dashboard shell and shared UI

Quotes, rentals, servicing, spare parts, and integrations are future phases.

## Project layout

- `client/` — React frontend
- `supabase/migrations/` — database schema and security policies
- `supabase/seed/` — optional development seed
- `shared/` — shared TypeScript database types

## Local development

1. Create a local environment file from `client/.env.example`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or the compatible publishable key).
3. From `client/`, run `npm install`, then `npm run dev`.
4. Run `npm run build` to check TypeScript and create the production bundle.

Do not commit `.env.local`, service-role keys, or Supabase secret keys. Only publishable/legacy anon keys belong in browser configuration, and RLS must remain enabled.

## Database

The Supabase project has been created in Central EU (Frankfurt). The initial schema was applied with security hardening:
- new profiles always start with the least-privileged `viewer` role;
- user-editable metadata cannot assign roles;
- profile reads are self/admin scoped;
- regular clients can update profile display fields only;
- row-level security is enabled for all application tables;
- the role helper lives in a non-exposed schema.

The schema and frontend still require integration testing before deployment.

## Local-network / offline deployment

The desktop shell is built with Tauri, while CRM data and authentication are provided by Supabase. For office-only operation, a compatible backend must run on a company server on the local network; building a desktop installer alone does not make the app offline.

1. Follow `deploy/local/README.md` to prepare the local backend and apply all migrations.
2. Copy `client/.env.example` to `client/.env.local` and set `VITE_SUPABASE_URL` to the local API URL (for example, `http://192.168.1.100:8000`) and `VITE_SUPABASE_ANON_KEY` to that backend's anon key.
3. Build the desktop installer using `npm run desktop:dist` from `client/`.
4. Install the same build on office PCs and test with the internet disconnected.

The API URL is currently a build-time setting. When the server IP or domain changes, rebuild the frontend/installer with the new URL. Runtime editing of the endpoint and a complete self-hosted backend bootstrap are not implemented yet. Never put the service-role key in the frontend or installer.
