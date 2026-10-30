# Your local job assistant

Open http://localhost:3000. Your generated login password is in `data/LOCAL-LOGIN.txt`.

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
