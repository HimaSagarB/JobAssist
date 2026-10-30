# Attribution and project provenance

JobAssist is maintained by HimaSagarB and adapted from AienTech’s Dossier source (the supplied package identified itself as version 1.10.0). The initial copy arrived as an extracted source tree; this repository does not claim to preserve upstream Git history or an exact upstream commit identifier.

## Dossier foundation

The original foundation supplies the Next.js application, Prisma/PostgreSQL schema, authentication, profile management, resume parsing, document generation and editing, PDF rendering, job-search adapters, daily drafting agent, application tracking, Google integrations, and much of the test infrastructure.

Original repository: https://github.com/AienTech/dossier

## JobAssist contributions

- Search-plan screen, filters and daily-agent integration.
- Multiple named AI connections, encrypted credential storage, explicit activation and provider shortcuts.
- Persistent local PostgreSQL setup, initialization and production startup scripts.
- JobAssist branding, icons, colors and navigation/sign-in refinements.
- Local workflow verification, saved-connection browser coverage, and project-specific documentation.

## License and compatibility

The AGPL-3.0 license in LICENSE is retained. Existing third-party font licenses remain in src/fonts. Historical technical identifiers such as DOSSIER_* environment variables and the dossier database name remain for compatibility; they do not identify the current product name.

Legacy screenshots in .github/images and unused static assets were inherited from Dossier. They are not evidence of a JobAssist live run. JobAssist’s README uses docs/images/jobassist-ai-connections.png, captured from our own build.
