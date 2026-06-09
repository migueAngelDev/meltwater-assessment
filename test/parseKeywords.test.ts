import { describe, expect, it } from "vitest";
import { parseKeywords } from "../src/parseKeywords.js";

describe("parseKeywords", () => {
   it("splits bare words on whitespace", () => {
      expect(parseKeywords("Hello world beer")).toEqual([
         "Hello",
         "world",
         "beer",
      ]);
   });

   it("keeps double-quoted phrases intact", () => {
      expect(parseKeywords('"Boston Red Sox"')).toEqual(["Boston Red Sox"]);
   });

   it("keeps single-quoted phrases intact", () => {
      expect(parseKeywords("'Pepperoni Pizza'")).toEqual(["Pepperoni Pizza"]);
   });

   it("handles a mix of bare words, quoted phrases, and comma separators", () => {
      const input = `Hello world "Boston Red Sox", 'Pepperoni Pizza', 'Cheese Pizza', beer`;
      expect(parseKeywords(input)).toEqual([
         "Hello",
         "world",
         "Boston Red Sox",
         "Pepperoni Pizza",
         "Cheese Pizza",
         "beer",
      ]);
   });

   it("ignores stray commas and irregular whitespace", () => {
      expect(parseKeywords("  beer ,, wine ,   ")).toEqual(["beer", "wine"]);
   });

   it("returns an empty list for empty input", () => {
      expect(parseKeywords("")).toEqual([]);
      expect(parseKeywords("   ,, ")).toEqual([]);
   });
});
