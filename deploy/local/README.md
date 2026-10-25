# Machinery CRM — local-network deployment

## Important status

This folder documents the target deployment and provides environment settings. It is **not yet a complete offline backend installer**. The current application uses Supabase Auth and the Supabase API; pointing it at a LAN IP will only work after a compatible local Supabase stack is installed, configured, and populated with the project's migrations.

## Intended layout

- One always-on company PC/server hosts the application and a self-hosted Supabase stack.
- Other devices on the same LAN open the CRM in a browser.
- The server has a reserved LAN IP, for example `192.168.1.100`.
- The local database is backed up to a separate disk or network destination.
- Internet access is not required for normal in-office operation once images, dependencies, and the backend are hosted locally. Internet is still needed for updates and remote access unless separately configured.

## Setup sequence

1. Choose a supported Windows or Linux host with Docker Engine / Docker Desktop and persistent storage.
2. Deploy the official self-hosted Supabase Docker stack from the Supabase self-hosting guide. Do not expose its database, service-role key, or Studio dashboard to the office LAN unless access is restricted.
3. Apply every SQL migration from `supabase/migrations/` to the local database and verify row-level security.
4. Configure the frontend's `VITE_SUPABASE_URL` to the local API endpoint and `VITE_SUPABASE_ANON_KEY` to that local stack's publishable/anon key. These are build-time settings for Vite.
5. Build and host the frontend on the LAN, or package a desktop client configured to use the same local API endpoint.
6. Reserve the host's LAN IP in the router and permit only required ports through the host firewall.
7. Test sign-in, roles, all CRUD flows, file uploads if used, restarts, database restoration, and normal use with the internet disconnected.

## Moving to a domain later

Changing the frontend API URL alone is not a complete migration. Configure DNS and HTTPS, then decide whether the same server will be safely exposed through a reverse proxy/VPN or the service will be hosted on a public server. Update the frontend build's API URL and authentication redirect/site URL settings, and test session handling. Never expose PostgreSQL directly to the public internet.

## Why we are not providing a one-click Compose file yet

A production self-hosted Supabase deployment requires matching service versions, generated JWT/API keys, Kong routing, Auth settings, storage settings, and persistent volumes. A hand-written partial Compose file could appear to work while silently omitting authentication or data services. Use the official Supabase self-hosting Compose/configuration for the initial stack, then version the project's own overrides and deployment scripts alongside it.

## Security and operations checklist

- [ ] Strong unique secrets generated locally; never commit real values.
- [ ] Host has a reserved LAN address.
- [ ] Firewall only allows required application/API ports from the LAN.
- [ ] Database and storage volumes persist across restarts.
- [ ] Automated backups run and a restore has been tested.
- [ ] All migrations applied and RLS policies verified.
- [ ] No service-role key shipped to browser code or desktop clients.
- [ ] Remote access uses VPN or HTTPS reverse proxy with proper access controls.
