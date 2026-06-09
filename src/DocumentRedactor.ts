import { readFileSync, writeFileSync } from "node:fs";
import { format, parse } from "node:path";
import { parseKeywords } from "./parseKeywords.js";
import { getRedaction, saveRedaction } from "./store.js";

const MASK = "XXXX";

function escapeRegExp(text: string): string {
   return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMatcher(phrases: string[]): RegExp | null {
   if (phrases.length === 0) return null;

   const sorted = [...phrases].sort((a, b) => {
      const wordDiff = b.split(/\s+/).length - a.split(/\s+/).length;
      return wordDiff !== 0 ? wordDiff : b.length - a.length;
   });

   const alternation = sorted.map((p) => `\\b${escapeRegExp(p)}\\b`).join("|");
   return new RegExp(alternation, "g");
}

export class DocumentRedactor {
   /**
    * Reads a .txt document, replaces every matched keyword/phrase with XXXX,
    * persists the original under the user-supplied key, and writes the redacted
    * version to <originalName>.redacted.txt next to the source file.
    *
    * The key is chosen by the caller — any string works. Using the same key
    * twice overwrites the previous record for that key.
    *
    */
   redact(key: string, keywordsString: string, documentPath: string): string {
      const originalText = readFileSync(documentPath, "utf-8");
      const matcher = buildMatcher(parseKeywords(keywordsString));
      const redactedText = matcher
         ? originalText.replace(matcher, MASK)
         : originalText;

      saveRedaction(key, { originalText, redactedText });

      const parsed = parse(documentPath);
      const outputPath = format({
         ...parsed,
         base: undefined,
         name: `${parsed.name}.redacted`,
      });
      writeFileSync(outputPath, redactedText, "utf-8");

      return redactedText;
   }

   /**
    * Reads a redacted .txt file, looks up the original under the given key,
    * validates that the file contents match what was stored at redaction time,
    * and returns the original text.
    */
   unredact(key: string, redactedDocumentPath: string): string {
      const redactedText = readFileSync(redactedDocumentPath, "utf-8");
      const record = getRedaction(key);

      if (!record) {
         throw new Error(`Unknown key: "${key}"`);
      }
      if (record.redactedText !== redactedText) {
         throw new Error(
            "Provided redacted file does not match the document associated with this key",
         );
      }

      return record.originalText;
   }
}
