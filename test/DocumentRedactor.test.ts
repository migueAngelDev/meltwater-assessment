import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { format, join, parse } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DocumentRedactor } from "../src/DocumentRedactor.js";

// Helpers to create temp .txt files so tests are self-contained and don't
// depend on the mocks/ folder.
function writeTempFile(content: string): string {
   const filePath = join(tmpdir(), `${randomUUID()}.txt`);
   writeFileSync(filePath, content, "utf-8");
   return filePath;
}

function redactedPathFor(originalPath: string): string {
   const parsed = parse(originalPath);
   return format({
      ...parsed,
      base: undefined,
      name: `${parsed.name}.redacted`,
   });
}

// Each test uses a unique key so runs never collide in the shared store.
function uniqueKey(): string {
   return randomUUID();
}

describe("DocumentRedactor", () => {
   let redactor: DocumentRedactor;

   beforeEach(() => {
      redactor = new DocumentRedactor();
   });

   // ── redact ──────────────────────────────────────────────────────────────

   describe("redact", () => {
      it("replaces a single bare keyword with XXXX", () => {
         const filePath = writeTempFile("I like beer on Fridays");
         const result = redactor.redact(uniqueKey(), "beer", filePath);
         expect(result).toBe("I like XXXX on Fridays");
      });

      it("replaces every occurrence of a keyword", () => {
         const filePath = writeTempFile(
            "beer and more beer and even more beer",
         );
         const result = redactor.redact(uniqueKey(), "beer", filePath);
         expect(result).toBe("XXXX and more XXXX and even more XXXX");
      });

      it("replaces a multi-word quoted phrase with a single XXXX", () => {
         const filePath = writeTempFile("I love the Boston Red Sox team");
         const result = redactor.redact(
            uniqueKey(),
            '"Boston Red Sox"',
            filePath,
         );
         expect(result).toBe("I love the XXXX team");
      });

      it("supports the full keyword string format from the spec", () => {
         const text =
            "Hello! Did world champions Boston Red Sox order Pepperoni Pizza or Cheese Pizza with their beer?";
         const keywords = `Hello world "Boston Red Sox", 'Pepperoni Pizza', 'Cheese Pizza', beer`;
         const filePath = writeTempFile(text);
         const result = redactor.redact(uniqueKey(), keywords, filePath);
         expect(result).toBe(
            "XXXX! Did XXXX champions XXXX order XXXX or XXXX with their XXXX?",
         );
      });

      it("only matches whole words, not substrings inside other words", () => {
         const filePath = writeTempFile(
            "The cat knocked over a category of items",
         );
         const result = redactor.redact(uniqueKey(), "cat", filePath);
         expect(result).toBe("The XXXX knocked over a category of items");
      });

      it("redacts matches that are adjacent to punctuation", () => {
         const filePath = writeTempFile("Do you like beer? Yes, beer.");
         const result = redactor.redact(uniqueKey(), "beer", filePath);
         expect(result).toBe("Do you like XXXX? Yes, XXXX.");
      });

      it("is case-sensitive", () => {
         const filePath = writeTempFile("Beer and BEER are not beer");
         const result = redactor.redact(uniqueKey(), "beer", filePath);
         expect(result).toBe("Beer and BEER are not XXXX");
      });

      it("prefers the longest matching phrase when phrases overlap", () => {
         const filePath = writeTempFile("The Boston Red Sox won");
         const result = redactor.redact(
            uniqueKey(),
            '"Red Sox", "Boston Red Sox"',
            filePath,
         );
         expect(result).toBe("The XXXX won");
      });

      it("leaves text unchanged when no keywords match", () => {
         const filePath = writeTempFile("I like beer on Fridays");
         const result = redactor.redact(uniqueKey(), "wine", filePath);
         expect(result).toBe("I like beer on Fridays");
      });

      it("writes the redacted content to a .redacted.txt file alongside the original", () => {
         const filePath = writeTempFile("I like beer on Fridays");
         redactor.redact(uniqueKey(), "beer", filePath);
         const outPath = redactedPathFor(filePath);
         expect(existsSync(outPath)).toBe(true);
         expect(readFileSync(outPath, "utf-8")).toBe("I like XXXX on Fridays");
      });
   });

   // ── unredact ─────────────────────────────────────────────────────────────

   describe("unredact", () => {
      it("recovers the original text using the key from redact", () => {
         const original = "I love the Boston Red Sox and a cold beer";
         const filePath = writeTempFile(original);
         const key = uniqueKey();
         redactor.redact(key, '"Boston Red Sox", beer', filePath);

         const recovered = redactor.unredact(key, redactedPathFor(filePath));
         expect(recovered).toBe(original);
      });

      it("throws a clear error for an unknown key", () => {
         const filePath = writeTempFile("XXXX and XXXX");
         expect(() => redactor.unredact("not-a-real-key", filePath)).toThrow(
            /unknown key/i,
         );
      });

      it("throws a clear error when the file contents don't match the key's document", () => {
         const filePath = writeTempFile("I like beer");
         const key = uniqueKey();
         redactor.redact(key, "beer", filePath);

         const wrongFile = writeTempFile("completely different text");
         expect(() => redactor.unredact(key, wrongFile)).toThrow(
            /does not match/i,
         );
      });
   });
});
