import path from "node:path";

import { describe, expect, it } from "vitest";

import { EnvError, parseEnv } from "./env";

// A hash of "correct horse" (scripts/hash-password.ts).
const PASSWORD_HASH = "argon2id:m=19456,t=2,p=1:CLZW5wQoCjh3Q9CHBp_JWw:Ak2xS7TYlYYrhemlgBkVxFmWXfcMq_rjd0mJGZcZFfA";

const valid = {
  JOBASSIST_PASSWORD: PASSWORD_HASH,
  JOBASSIST_SECRET: "a".repeat(32),
  DATABASE_URL: "postgresql://postgres:postgres@db:5432/jobassist",
};

function problems(source: Record<string, string | undefined>): string[] {
  try {
    parseEnv(source);
  } catch (error) {
    if (error instanceof EnvError) return error.problems;
    throw error;
  }
  throw new Error("Expected parseEnv to throw");
}

describe("parseEnv", () => {
  it("accepts the required variables and fills in defaults", () => {
    expect(parseEnv(valid)).toEqual({
      ...valid,
      JOBASSIST_DATA_DIR: "/data",
      JOBASSIST_BACKUP_RETENTION_DAYS: 14,
      JOBASSIST_TELEMETRY: undefined,
    });
  });

  it("reads whether the usage ping is on", () => {
    // Unset or empty: not decided, so JobAssist asks (#172).
    expect(parseEnv({ ...valid, JOBASSIST_TELEMETRY: "" }).JOBASSIST_TELEMETRY).toBeUndefined();
    expect(parseEnv(valid).JOBASSIST_TELEMETRY).toBeUndefined();
    expect(parseEnv({ ...valid, JOBASSIST_TELEMETRY: "ON" }).JOBASSIST_TELEMETRY).toBe("on");
    expect(parseEnv({ ...valid, JOBASSIST_TELEMETRY: " Off " }).JOBASSIST_TELEMETRY).toBe("off");
    expect(problems({ ...valid, JOBASSIST_TELEMETRY: "false" })).toEqual(['JOBASSIST_TELEMETRY must be on or off (got "false").']);
  });

  it("reads the optional variables", () => {
    const env = parseEnv({
      ...valid,
      JOBASSIST_DATA_DIR: "/srv/jobassist",
      JOBASSIST_BACKUP_RETENTION_DAYS: "30",
      JOBASSIST_AI_PROVIDER: "local",
      JOBASSIST_AI_URL: "http://ollama:11434",
      JOBASSIST_AI_MODEL: "llama3.1:8b",
      JOBASSIST_AI_KEY: "sk-test",
    });
    expect(env).toMatchObject({
      JOBASSIST_DATA_DIR: "/srv/jobassist",
      JOBASSIST_BACKUP_RETENTION_DAYS: 30,
      JOBASSIST_AI_PROVIDER: "local",
      JOBASSIST_AI_URL: "http://ollama:11434",
      JOBASSIST_AI_MODEL: "llama3.1:8b",
      JOBASSIST_AI_KEY: "sk-test",
    });
  });

  it("reads the AI timeout in seconds", () => {
    expect(parseEnv({ ...valid, JOBASSIST_AI_TIMEOUT_SECONDS: " 300 " }).JOBASSIST_AI_TIMEOUT_SECONDS).toBe(300);
    expect(() => parseEnv({ ...valid, JOBASSIST_AI_TIMEOUT_SECONDS: "5m" })).toThrow(/whole number of seconds/);
    expect(() => parseEnv({ ...valid, JOBASSIST_AI_TIMEOUT_SECONDS: "1" })).toThrow(/at least 5/);
  });

  it("resolves a relative data directory", () => {
    const env = parseEnv({ ...valid, JOBASSIST_DATA_DIR: "./data" });
    expect(env.JOBASSIST_DATA_DIR).toBe(path.resolve("data"));
  });

  it("treats empty values as unset", () => {
    const env = parseEnv({ ...valid, JOBASSIST_AI_KEY: "", JOBASSIST_DATA_DIR: " " });
    expect(env.JOBASSIST_AI_KEY).toBeUndefined();
    expect(env.JOBASSIST_DATA_DIR).toBe("/data");
    expect(problems({ ...valid, JOBASSIST_PASSWORD: "" })).toEqual([
      expect.stringMatching(/^JOBASSIST_PASSWORD is not set\./),
    ]);
  });

  it("names every missing required variable", () => {
    expect(problems({})).toEqual([
      expect.stringMatching(/^JOBASSIST_PASSWORD is not set\. Set it to/),
      expect.stringMatching(/^JOBASSIST_SECRET is not set\. .*openssl rand/),
      expect.stringMatching(/^DATABASE_URL is not set\. /),
    ]);
  });

  it("wants a hash of the password, not the password itself", () => {
    expect(problems({ ...valid, JOBASSIST_PASSWORD: "correct horse" })).toEqual([
      expect.stringMatching(/^JOBASSIST_PASSWORD must be a hash of your password, not the password itself\. .*hash-password/),
    ]);
    expect(parseEnv({ ...valid, JOBASSIST_PASSWORD: ` ${PASSWORD_HASH}\n` }).JOBASSIST_PASSWORD).toBe(PASSWORD_HASH);
  });

  it("rejects a secret shorter than 32 characters", () => {
    expect(problems({ ...valid, JOBASSIST_SECRET: "short" })).toEqual([
      expect.stringMatching(/^JOBASSIST_SECRET is too short \(5 characters\)\./),
    ]);
  });

  it("never echoes secret values", () => {
    const messages = problems({
      JOBASSIST_PASSWORD: "hunter2",
      JOBASSIST_SECRET: "tiny-secret",
      DATABASE_URL: "mysql://root:db-password@db/jobassist",
    }).join("\n");
    expect(messages).not.toContain("hunter2");
    expect(messages).not.toContain("tiny-secret");
    expect(messages).not.toContain("db-password");
    expect(messages).toMatch(/DATABASE_URL must be a PostgreSQL connection string/);
  });

  it("rejects invalid optional values", () => {
    expect(
      problems({
        ...valid,
        JOBASSIST_BACKUP_RETENTION_DAYS: "two weeks",
        JOBASSIST_AI_PROVIDER: "gemini",
        JOBASSIST_AI_URL: "ftp://example.com",
      }),
    ).toEqual([
      'JOBASSIST_BACKUP_RETENTION_DAYS must be a whole number of days (got "two weeks").',
      'JOBASSIST_AI_PROVIDER must be one of local, openai, anthropic, mistral, lmstudio (got "gemini").',
      "JOBASSIST_AI_URL must be an http:// or https:// URL.",
    ]);
    expect(problems({ ...valid, JOBASSIST_BACKUP_RETENTION_DAYS: "0" })).toEqual([
      "JOBASSIST_BACKUP_RETENTION_DAYS must be at least 1.",
    ]);
  });
});

describe("job search variables (E14-4)", () => {
  it("reads the source and its keys", () => {
    expect(
      parseEnv({
        ...valid,
        JOBASSIST_JOBS_SOURCE: "jsearch",
        JOBASSIST_JSEARCH_KEY: "ak_test",
        JOBASSIST_JSEARCH_HOST: "rapidapi",
        JOBASSIST_ADZUNA_APP_ID: "app",
        JOBASSIST_ADZUNA_KEY: "adz",
        JOBASSIST_FREEHIRE_URL: "https://jobs.example/",
      }),
    ).toMatchObject({
      JOBASSIST_JOBS_SOURCE: "jsearch",
      JOBASSIST_JSEARCH_KEY: "ak_test",
      JOBASSIST_JSEARCH_HOST: "rapidapi",
      JOBASSIST_ADZUNA_APP_ID: "app",
      JOBASSIST_ADZUNA_KEY: "adz",
      JOBASSIST_FREEHIRE_URL: "https://jobs.example",
    });
    expect(parseEnv({ ...valid, JOBASSIST_JOBS_SOURCE: "freehire" }).JOBASSIST_JOBS_SOURCE).toBe("freehire");
  });

  it("reads whether the Bundesagentur für Arbeit is offered, and refuses choosing it while it's off (#223)", () => {
    expect(parseEnv(valid).JOBASSIST_JOBS_ARBEITSAGENTUR).toBeUndefined();
    expect(parseEnv({ ...valid, JOBASSIST_JOBS_ARBEITSAGENTUR: " OFF " }).JOBASSIST_JOBS_ARBEITSAGENTUR).toBe("off");
    expect(problems({ ...valid, JOBASSIST_JOBS_ARBEITSAGENTUR: "no" })).toEqual(['JOBASSIST_JOBS_ARBEITSAGENTUR must be on or off (got "no").']);
    expect(problems({ ...valid, JOBASSIST_JOBS_SOURCE: "arbeitsagentur", JOBASSIST_JOBS_ARBEITSAGENTUR: "off" })).toEqual([
      "JOBASSIST_JOBS_SOURCE is arbeitsagentur, but JOBASSIST_JOBS_ARBEITSAGENTUR is off. Choose another source, or remove one of the two.",
    ]);
  });

  it("rejects sources and hosts it doesn't know, without echoing keys", () => {
    expect(problems({ ...valid, JOBASSIST_JOBS_SOURCE: "linkedin", JOBASSIST_JSEARCH_HOST: "google", JOBASSIST_JSEARCH_KEY: "ak_secret" })).toEqual([
      'JOBASSIST_JOBS_SOURCE must be one of jsearch, adzuna, arbeitsagentur, freehire, off (got "linkedin").',
      'JOBASSIST_JSEARCH_HOST must be openwebninja or rapidapi (got "google").',
    ]);
  });
});
