# JobAssist privacy

JobAssist stores your job-search information in your own PostgreSQL database. It is designed for one user. The running application, selected providers and optional integrations determine where data is processed.

## Stored information

- Professional profile: resume-derived information, skills, projects, education, experience and achievements.
- Job search: saved searches, preferences, postings, matches, agent candidates and drafts.
- Applications: generated documents, edit history, notes, status events and interviews.
- Optional Google integration: linked email threads, reply drafts, interview/calendar information and encrypted authorization credentials.
- Settings: active AI configuration, encrypted saved connections, job-source credentials and UI preferences.
- Background-task inputs and results, subject to the configured retention setting; login failure counters support throttling.

Local database files, backups and login details live under `data/`. `.env` holds the server configuration and encryption secret. Both locations are excluded from version control.

## External services

| Service | When used | Information involved |
| --- | --- | --- |
| Selected AI endpoint | Importing/analyzing content or generating/refining documents | Relevant profile, posting and document content plus the selected API credential |
| Selected job source | Searching for jobs | Search terms, location/filter information and any required API credential |
| Public employer/startup websites | Fetching postings or startup details | Requested URL and the JobAssist user agent |
| Google | After authorization of Gmail/Calendar features | Requested mailbox/calendar information; approved messages and attachments when sending |
| GitHub | Checking for application updates | Request for releases from the JobAssist repository |
| Claude connector | After enabling and authorizing the connector | Data requested through the permitted connector tools |

Saving several AI connections does not call all of them. New tasks use the selected connection; tasks already running may finish with the previous one. Provider policies, quotas and charges are determined by those services.

## Usage telemetry

JobAssist does **not** send install usage pings. There is no active telemetry destination or consent dialog. Previous consent cannot enable collection.

## Exports, imports and deletion

Settings includes data export/import and deletion tools. Exports contain sensitive profile and application information; keep them private. Task data and Google mailbox/account information are handled separately from the general export. Exporting the active API key is an explicit option; saved AI connections are excluded even then.

Saved AI connections belong to the local installation and survive a data import. Removing a saved connection does not clear its separate active configuration. Existing backups and files already downloaded are separate copies and must be managed separately.

Deleting an application removes its associated records in the application; it does not retract sent email, delete copies held by employers or remove content already processed by a provider. Google disconnect stops this app’s use of the connection; the mailbox and calendar still exist at Google.

## Retention and backups

Configure task retention and nightly backups in Settings. Scheduled cleanup requires the app to be running. Protect backups and the encryption secret together; losing the secret can make saved credentials unreadable.

## Startups

Startup discovery reads public hiring information and respects the implemented robots/rate-limit checks. The user agent links to this document. Review collected contact details and the application recipient before sending.

## Project notices

See [SECURITY.md](SECURITY.md), [AUDIT.md](AUDIT.md) and [ATTRIBUTION.md](ATTRIBUTION.md) for implementation safeguards, validation scope and third-party notices.
