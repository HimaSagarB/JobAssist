# Host JobAssist continuously

## Prepared deployment

This repository includes `railway.json` for the existing production Dockerfile. The container runs database migrations and the built-in seed before starting the server. `/api/health` checks PostgreSQL connectivity before deployment is treated as healthy.

This file prepares deployment; it does not create a hosted service. A Railway account, billing choice and verified deployment are still required. AI and job-source provider charges are separate from hosting.

## Required services

1. Create a Railway project with a persistent PostgreSQL service named `Postgres`.
2. Add the app from `HimaSagarB/JobAssist`, branch `main`, using the repository Dockerfile and `railway.json`.
3. Use exactly **one app replica in one region**. The application’s timers and job queue run in the process, so multiple replicas can duplicate scheduled work.
4. Disable service sleeping/serverless mode. An idle-sleeping service cannot reliably run background searches without visitors.
5. Attach a persistent volume at `/data` for backup/export files. Railway volumes are mounted as root; the documented platform option for this image is `RAILWAY_RUN_UID=0`. The default local/container user remains unchanged in the image.
6. Set a monthly usage budget/alert and review the resource limits before activating paid services. A hard spending limit can stop the app when exhausted; a budget does not guarantee uninterrupted service.

## Service variables

Set these **privately in Railway’s Variables UI**, not in the repository:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (adjust the service name if different) |
| `JOBASSIST_PASSWORD` | Your Argon2id login password hash |
| `JOBASSIST_SECRET` | Your existing encryption secret if migrating data, otherwise a new secure random secret |
| `JOBASSIST_DATA_DIR` | `/data` |
| `HOSTNAME` | `0.0.0.0` |
| `RAILWAY_RUN_UID` | `0` when using the persistent app volume as documented above |

Let Railway provide `PORT`; the server and internal PDF renderer use it. The container includes Chromium and its system libraries for PDFs. Do not use `npm run local:start` in the cloud: that command is intentionally bound to your laptop’s localhost.

Create a Railway HTTPS domain for the app. Set `JOBASSIST_PUBLIC_URL` to that exact HTTPS origin before connecting Google. The Google OAuth redirect is `<origin>/api/google/callback` and must be registered in your Google Cloud OAuth client.

## Credentials and local data

Never upload `.env`, `data/LOCAL-LOGIN.txt`, local PostgreSQL files, API keys or authentication state to GitHub. If migrating a populated database, take a private backup and migrate the logical data separately. Do not mount the laptop’s database directory into a cloud service.

For a fresh cloud setup, configure the profile, AI connection and job source after login. For an existing installation, preserve `JOBASSIST_SECRET` when transferring encrypted settings. General app exports exclude saved AI connections, so those must be re-entered separately unless a full database migration is performed.

Do not run the cloud and laptop agents simultaneously against the same database. After cutover, the cloud service owns the daily schedule.

## Acceptance checks before turning off the laptop

- Deployment succeeds and `/api/health` returns HTTP 200 over HTTPS.
- Login succeeds using your password.
- Import/review your resume, and generate/download a test PDF.
- Test the selected live AI connection and job source.
- Configure the daily agent’s query, country, limits, run time and timezone; confirm its next run in the UI.
- Confirm one manual discovery/draft run and verify persistence after a restart.
- Connect Google with the cloud redirect if email submission is required.
- Verify the cloud scheduler’s next daily run without depending on a browser visit.

The hosted workflow still prepares drafts for review. Email sending requires confirmation, and employer website forms remain manual.

## Current verification limit

The native production build and application workflow were verified locally. The hosted container and Railway resources still require an actual cloud build and acceptance checks; this document is not a claim that the app is already hosted.

## Official references

- https://docs.railway.com/config-as-code/reference
- https://docs.railway.com/deployments/healthchecks
- https://docs.railway.com/databases/postgresql
- https://docs.railway.com/volumes
- https://docs.railway.com/pricing/faqs
