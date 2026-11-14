/** Deployment environment. Only "development" may use simulated adapters. */
export type ZentraEnv = "development" | "canton-test" | "production";

export const ZENTRA_ENV: ZentraEnv =
  (import.meta.env["VITE_ZENTRA_ENV"] as ZentraEnv | undefined) ?? "development";

export const IS_SIMULATED = ZENTRA_ENV === "development";

export const LINKS = {
  docs: "https://zentra-fi.gitbook.io/zentra-finance",
  github: "https://github.com/Zentraone-Fi",
  website: "https://zentraone.xyz/",
  telegram: "https://t.me/zentra_hq",
  linkedin: "https://www.linkedin.com/company/zentra-one/",
} as const;
