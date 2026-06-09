import { DocumentRedactor } from "./DocumentRedactor.js";

const [command, ...rest] = process.argv.slice(2);
const redactor = new DocumentRedactor();

function usage(): never {
   console.error("Usage:");
   console.error(
      '  npm run demo -- redact <key> "<keywords>" <path/to/document.txt>',
   );
   console.error(
      "  npm run demo -- unredact <key> <path/to/document.redacted.txt>",
   );
   process.exit(1);
}

if (command === "redact") {
   const [key, keywords, documentPath] = rest;
   if (!key || !keywords || !documentPath) usage();

   const redactedText = redactor.redact(key, keywords, documentPath);
   console.log("Redacted text:\n");
   console.log(redactedText);
   console.log(`\nSaved under key: "${key}"`);
   console.log(
      `Redacted file written to: ${documentPath.replace(/\.txt$/, ".redacted.txt")}`,
   );
} else if (command === "unredact") {
   const [key, redactedPath] = rest;
   if (!key || !redactedPath) usage();

   console.log("Original text:\n");
   console.log(redactor.unredact(key, redactedPath));
} else {
   usage();
}
