# BMPC Document Retrieval Request System

Working React MVP for Barbaza Multi-Purpose Cooperative document retrieval requests.

## What Is Included

- Role-aware dashboard for requestors, approvers, archivists, executives, and admin users.
- Request submission with agreement confirmation and approval routing.
- Approval queue with approve, reject, and clarification actions.
- Archivist processing for physical and electronic documents.
- Return, access revocation, deletion confirmation, closure, and incident handling.
- Request details with processing, closure, incident, and audit trail sections.
- Reports with export-ready filtered tables.
- Admin user and settings views.
- Supabase SQL schema with tables, seed reference data, helper functions, triggers, indexes, and RLS policies.

## Run Locally

```bash
npm start
```

Open http://localhost:3000.

If PowerShell blocks `npm`, use:

```bash
npm.cmd start
```

## Build

```bash
npm.cmd run build
```

## Supabase

This project is configured for the local Supabase API at `http://127.0.0.1:54321`.

Start the local Supabase stack:

```bash
supabase start
```

If PowerShell blocks `supabase`, use:

```bash
supabase.cmd start
```

Copy `.env.example` to your local environment file and set the Supabase anon key from:

```bash
supabase status
```

Apply the full database schema in the Supabase SQL Editor:

```txt
supabase/schema.sql
```

The schema creates the document retrieval tables, reference data, request routing tables, processing/closure/incident/audit tables, helper functions, triggers, indexes, and RLS policies.

The current UI uses in-memory demo data so the full workflow can be reviewed immediately. The Supabase schema and client config are ready for wiring persistent CRUD/auth calls into the existing screens.
