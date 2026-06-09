import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * XXXX is lossy: nothing in the redacted string alone can reconstruct what
 * was removed. So "unredacting with a key" requires persisting the original
 * alongside a key generated at redaction time.
 *
 * This stores records as JSON on disk (rather than purely in-memory) so the
 * CLI demo can redact in one process and unredact in another, the way a real
 * user would run it.
 */
export interface RedactionRecord {
   originalText: string;
   redactedText: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", ".data");
const dataFile = join(dataDir, "redactions.json");

function readAll(): Record<string, RedactionRecord> {
   if (!existsSync(dataFile)) return {};
   return JSON.parse(readFileSync(dataFile, "utf-8")) as Record<
      string,
      RedactionRecord
   >;
}

function writeAll(records: Record<string, RedactionRecord>): void {
   mkdirSync(dataDir, { recursive: true });
   writeFileSync(dataFile, JSON.stringify(records, null, 2), "utf-8");
}

export function saveRedaction(key: string, record: RedactionRecord): void {
   const records = readAll();
   records[key] = record;
   writeAll(records);
}

export function getRedaction(key: string): RedactionRecord | undefined {
   return readAll()[key];
}
