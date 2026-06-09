/**
 * Tokenizes a keyword/phrase string such as:
 *   Hello world "Boston Red Sox", 'Pepperoni Pizza', 'Cheese Pizza', beer
 * into the list of phrases to redact:
 *   ["Hello", "world", "Boston Red Sox", "Pepperoni Pizza", "Cheese Pizza", "beer"]
 *
 * Quoted phrases (single or double quotes) are kept intact as a unit; everything
 * else is split on whitespace and/or commas.
 */
export function parseKeywords(input: string): string[] {
   const tokenPattern = /"([^"]*)"|'([^']*)'|[^\s,]+/g;
   const phrases: string[] = [];

   for (const match of input.matchAll(tokenPattern)) {
      const phrase = (match[1] ?? match[2] ?? match[0]).trim();
      if (phrase.length > 0) {
         phrases.push(phrase);
      }
   }

   return phrases;
}
