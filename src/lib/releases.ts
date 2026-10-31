// Where JobAssist's releases are published, for the update check and its
// notice (update-check.ts, the sidebar). Safe to use in the browser.

export const RELEASES_REPOSITORY = "HimaSagarB/JobAssist";
/** The repository's page, for credits and support (the sidebar). */
export const REPOSITORY_URL = `https://github.com/${RELEASES_REPOSITORY}`;
/** Local setup and upgrade instructions for this project. */
export const UPGRADE_GUIDE_URL = `${REPOSITORY_URL}/blob/main/LOCAL-SETUP.md`;

/** A published release: its version, without the "v", and its page on GitHub. */
export type Release = { version: string; url: string };
