# Supabase Auth + FastAPI Test Sandbox

This project is a minimal, end-to-end sandbox to validate Supabase Auth (email/password) with a FastAPI backend and a small React (Vite) UI. It exists to verify:

- Supabase Auth configuration (URLs, redirects, policies) is correct.
- JWTs issued by Supabase are accepted by the backend and applied to Row Level Security (RLS).
- Local development flow works consistently across browser, API, and database.

## Project Structure

- main.py: FastAPI backend with /signup, /login, /notes endpoints.
- schema.sql: RLS policies and notes table.
- frontend/: Vite React UI that calls the backend.

## Why We Are Doing This

Supabase Auth is sensitive to configuration details (redirect URLs, site URL, project URL). A small sandbox helps isolate issues quickly and confirm that:

- Auth requests reach Supabase correctly.
- Redirect URLs are whitelisted in Supabase.
- RLS policies are enforced using the user JWT.

## Local URLs and Where They Are Tested

- Frontend (Vite): http://localhost:5173
  - Login and signup form in the UI
- Backend (FastAPI): http://localhost:8000
  - Swagger: http://localhost:8000/docs
  - Endpoints:
    - POST /signup
    - POST /login
    - GET /notes
    - POST /notes

## Supabase Configuration (Required)

Set these in the Supabase Dashboard:

Auth > URL Configuration

- Site URL:
  - http://localhost:5173
- Redirect URLs (add all):
  - http://localhost:5173/\*
  - http://127.0.0.1:5173/*
  - http://localhost:8000/\*

Auth > Providers

- Email provider enabled (for email/password signup).
- If you require email confirmation, be sure to check the inbox to complete signup.

## Environment Variables

Create a .env in the project root:

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
APP_URL=http://localhost:5173

Notes:

- SUPABASE_ANON_KEY must be the public anon key (not service role).
- APP_URL is used as the default email redirect target for signup.

## Database Setup

Run schema.sql in Supabase SQL Editor to create:

- public.secret_notes table
- RLS policies for select and insert

## Run Locally

Backend:

- Activate venv
- Start server: uvicorn main:app --reload

Frontend:

- cd frontend
- npm install
- npm run dev

## Troubleshooting

- Error: "Invalid path specified in request URL"
  - The redirect URL is not in Supabase Redirect URLs.
  - Add the exact Origin URL used by the request.
- Login works but notes are empty
  - Verify RLS policies exist and JWT is being sent to PostgREST.
