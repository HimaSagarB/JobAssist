# JobAssist — verified local build

Updated 30 October 2026.

## Running

Production app: http://localhost:3000. Local PostgreSQL: 127.0.0.1:55432.
The Docker dependency for local startup is removed: a persistent embedded PostgreSQL installation lives in `data/postgres`. All 33 migrations applied. See LOCAL-SETUP.md for restart and configuration instructions. Login details are in data/LOCAL-LOGIN.txt.

## Added

- Search plan with persistent role, location, work arrangement and company filters, integrated before agent scoring.
- Saved AI connections with encrypted API keys, multiple accounts/endpoints, manual activation of one configuration for new tasks, and removal of saved copies.
- Shortcuts for OpenAI, Gemini, Groq and DeepSeek; native Anthropic, Mistral, Ollama and LM Studio formats plus custom OpenAI-compatible endpoints.
- Connection secrets are omitted from browser views and data exports. Saved connections remain local during imports. Active settings are separate from saved copies.
- Changing the active endpoint clears its key to prevent sending an old credential to a different host.
- Local initialization, database, migration and production startup commands.
- Browser tests work with the local Node runtime without requiring Yarn.

## Verified

- Production Webpack build and TypeScript: passed. Build emits an unpdf import.meta warning; real PDF parsing passed browser tests.
- ESLint: passed.
- 35 focused unit tests: passed.
- 17 browser tests: passed, covering sign-in, job discovery/scoring, agent drafts/dismissal, encrypted account storage/switching, tailored documents, PDF export, resume import (including PDF and Markdown), confirmed Gmail submission and reply.
- Production login and AI connections screen: passed separate smoke check.

Browser tests use isolated test data and fake AI, job-source and Google services. They do not certify live providers or hiring results. No real applications were submitted.

## Remaining user configuration and scope

Import and verify your resume, add a real API key/model, configure job preferences/source, and authorize Google for email sending. Provider quotas remain provider-controlled; switching is manual. The daily agent requires the computer/app to remain running. Employer website forms require manual submission; universal auto-apply is not implemented. Live AI document quality and real Gmail delivery remain unverified until credentials and your profile are configured.
