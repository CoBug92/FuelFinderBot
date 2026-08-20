import { config as loadEnv } from "dotenv";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { getImplementedBrands } from "./providers/index.js";
import type { Brand } from "./domain/types.js";

loadEnv();

export interface AppConfig {
  botToken: string;
  dataDir: string;
  stateFilePath: string;
  pollIntervalMs: number;
  logLevel: "debug" | "info" | "warn" | "error";
  enabledBrands: Brand[];
  searchLimit: number;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLogLevel(value: string | undefined): AppConfig["logLevel"] {
  switch (value) {
    case "debug":
    case "info":
    case "warn":
    case "error":
      return value;
    default:
      return "info";
  }
}

function parseEnabledBrands(rawValue: string | undefined): Brand[] {
  const implemented = new Set(getImplementedBrands());
  const requested = (rawValue ?? "gazpromneft")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as Brand[];

  const enabled = requested.filter((brand) => implemented.has(brand));

  if (enabled.length === 0) {
    throw new Error(
      `No implemented providers enabled. Supported now: ${[...implemented].join(", ")}`
    );
  }

  return enabled;
}

export function loadConfig(): AppConfig {
  const botToken = process.env.BOT_TOKEN?.trim() ?? "";

  if (!botToken) {
    throw new Error("BOT_TOKEN is required");
  }

  const dataDir = resolve(process.cwd(), process.env.DATA_DIR?.trim() || "data");
  mkdirSync(dataDir, { recursive: true });

  return {
    botToken,
    dataDir,
    stateFilePath: resolve(dataDir, "state.json"),
    pollIntervalMs: parsePositiveInteger(process.env.POLL_INTERVAL_MS, 180_000),
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    enabledBrands: parseEnabledBrands(process.env.ENABLED_PROVIDERS),
    searchLimit: parsePositiveInteger(process.env.SEARCH_LIMIT, 8)
  };
}
