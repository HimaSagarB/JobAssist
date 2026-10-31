# JobAssist local setup

Open http://localhost:3000. Your generated login password is in `data/LOCAL-LOGIN.txt`.

## One-command daily routine

After the initial install/build, run this from any terminal folder:

```sh
npm --prefix ~/Desktop/Projects/JobAssist run daily
```

It starts the local database and production app if needed, reuses them if already running, and opens `http://localhost:3000/daily` on macOS. Sign in normally if asked. After authentication the daily page checks your setup, starts at most one search per local calendar day, and opens the agent review queue. A run already in progress is reused.

Before your first search, import/review your resume, save and activate an AI connection, choose a job source, and set keywords/country in Settings → Job agent. Turn on **Prepare drafts** and set a draft limit there if you want tailored documents generated automatically. For this manual daily workflow the unattended daily schedule can stay off.

Keep the terminal and laptop awake until search and drafting finish, then review the results. Ctrl+C stops only services the command itself started; services reused from another terminal stay under that terminal’s control. Your data remains on disk.

Opening the command twice does not spend another search on the same day. A failed scan that already began counts as today's attempt; use **Run now** in the agent after the normal cooldown to retry. Searches still use the configured source, first results page, filters and scoring/draft caps. This is not a search of every job website.

Application emails require a separate confirmation and connected Gmail. Employer website forms remain manual. The command does not automatically submit applications.

After pulling code changes, stop the app and rebuild it with `npm run local:prepare` and `npm run build -- --webpack` before using the command again. An older app occupying port 3000 is reported rather than stopped automatically. `npm run daily -- --no-open` starts/checks the services without opening a browser or triggering a search.

## Activate your real workflow

1. Import your resume on Profile and review the extracted facts, skills, projects and dates.
2. Open AI connections. Save one or more accounts, then choose **Use this connection**. In Settings → AI provider, test the connection. Each account keeps its encrypted key; switching is manual and affects new tasks. Provider quotas and charges still apply.
3. Configure Search plan with roles and locations. Choose a job source in Settings → Job search, or paste a JD directly into New application.
4. Generate and review the tailored resume, cover letter and application email. Download PDFs if applying on an employer website.
5. To send directly, configure your Google OAuth client in Settings → Google and connect Gmail. Review the recipient and documents, then confirm sending. The app tracks the email and replies.
6. Configure the daily agent only after your profile, provider and job search are tested. The computer and app must remain running for scheduled discovery.

Employer website forms still require manual submission. Email submission requires a valid application email address and a connected Google account. Live AI quality must be checked using your profile; automated browser tests use fake services.

## Restart after closing the app or restarting the computer

From this folder, in one terminal:

```sh
npm run local:db
```

In another terminal:

```sh
npm run local:start
```

Stop each with Ctrl+C. Database files persist in `data/postgres`. Keep `.env` and `data` private and backed up; `.env` contains the encryption secret needed to read saved keys.

## Rebuild after code changes

```sh
npm run local:prepare
npm run build -- --webpack
```

For a fresh copy, install dependencies (`npm install` and `npm install --prefix tools/local-db`), install Chromium (`npx playwright install chromium`), run `npm run local:init`, start the database, then prepare and build. Node 24 with crypto.argon2 support is required. Initialization refuses to overwrite an existing `.env`.

Saved connection credentials stay on this installation and are excluded from exports, including exports with the active API key. Removing a saved connection does not erase the separate active settings; clear those in Settings → AI provider if needed.

## Provider endpoint references

- Gemini: https://ai.google.dev/gemini-api/docs/openai
- Groq: https://console.groq.com/docs/overview
- DeepSeek: https://api-docs.deepseek.com/

Endpoint presets are conveniences, not live-provider certification. Choose a model supported by your account and run Test connection.
