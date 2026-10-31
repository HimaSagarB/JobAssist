# JobAssist security

JobAssist is a single-user application that stores professional profile data, application documents and optional service credentials. The default local launcher binds the web app to `127.0.0.1:3000`; the embedded database listens on `127.0.0.1:55432`.

## Authentication and access

- `JOBASSIST_PASSWORD` contains an Argon2id password hash. Initialization generates the local password; it does not store a plain password in `.env`.
- `JOBASSIST_SECRET` protects encrypted sessions and stored credentials. Keep it private and preserve it when moving the application.
- Sessions use HttpOnly cookies. Authentication is enforced by server actions and protected routes. Failed login attempts are rate-limited.
- Request-origin checks and a content security policy protect the browser-facing application. HTTPS is needed if deploying beyond localhost.

## Service credentials

AI keys, job-source keys and Google credentials are encrypted before database storage. Saved AI connections return only metadata and key-presence flags to the browser. They are excluded from exported data and retained locally during imports.

The selected AI connection is copied into the active settings. Removing its saved copy does not clear those active settings; clear the active key in Settings if you need to remove it as well. Changing the active endpoint clears its previous key.

Encrypted credentials retain versioned cryptographic labels for compatibility with existing local data. Changing a product name must not invalidate those credentials.

## External actions

Hosted AI receives the content needed for requested tasks. Connecting Gmail authorizes the chosen Google features. Sending application emails and replies requires confirmation. A daily discovery run prepares drafts and does not send applications.

Usage telemetry is disabled in code. Stored consent or legacy telemetry environment settings cannot enable a request. Update checks query releases from `HimaSagarB/JobAssist`.

## Files and backups

Never commit `.env`, the `data/` directory, database files, login details, authentication state, or exports containing personal data. Keep local backups private. Restoring encrypted data requires the same encryption secret.

The audit preserves existing migration history, database contents and encryption keys. New installations use `JOBASSIST_*` configuration names. The existing local database can retain its old internal name without affecting the application identity.

## Reporting security issues

Use the repository’s private vulnerability reporting feature **if enabled**, or contact the maintainer through an available private channel. Do not include API keys, passwords, resumes or private application data in a public issue. This repository does not advertise an unconfigured security email address.

## Validation scope

Tests check the implemented controls and application workflows; they do not establish that every deployment is secure. See [AUDIT.md](AUDIT.md) for this audit’s checks and remaining work. Third-party source notices are in [ATTRIBUTION.md](ATTRIBUTION.md).
