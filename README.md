# Meltwater Technical Exercise

Small CLI in TypeScript for redacting and unredacting classified documents.

## Setup

```sh
npm install
npm test
```

## Running the demo

There's a sample document in `mocks/document.txt` so you can try it right after cloning.

```sh
# Redact: pick any key you want, pass the keywords and the file
npm run demo -- redact mykey 'Hello world "Boston Red Sox", "Pepperoni Pizza", "Cheese Pizza", beer' mocks/document.txt

# Unredact: same key + the redacted file that was created above
npm run demo -- unredact mykey mocks/document.redacted.txt
```

`redact` writes `document.redacted.txt` in the same folder as the original. The key is whatever you want — a word, a number, a UUID. Using the same key twice overwrites the previous record.

## Project layout

```
src/
  parseKeywords.ts      parses the keyword string (quoted phrases + bare words)
  DocumentRedactor.ts   the main class: redact() and unredact()
  store.ts              persists { key → original/redacted text } to .data/redactions.json
  cli.ts                thin CLI wrapper
mocks/
  document.txt          sample document for the demo
test/
  parseKeywords.test.ts
  DocumentRedactor.test.ts
```

---

## Part 1 — Redaction

**Parsing the keyword string.** I noticed the format mixes a few things at once — bare words, single-quoted phrases, double-quoted phrases, separated by spaces or commas or both. I handled all of that with one regex that tries quoted chunks first and falls back to any word-like run of characters. That way a phrase like `"Boston Red Sox"` stays together as a single unit instead of being split into three separate keywords.

**Things the spec didn't specify that I had to decide:**

_One XXXX per phrase._ I read "insert XXXX at the locations where the text was removed" as one replacement per match, not one per word. So `"Boston Red Sox"` becomes `XXXX`, not `XXXX XXXX XXXX`. I think this is the right call for a censorship tool — it hides more about what was removed. It can be changed if needed, but for now this felt like the more defensible choice.

_Case-sensitive matching._ `beer` redacts `beer` but not `Beer`. I understood that if you're explicitly listing classified keywords you know how they appear in the document, so case-sensitive made sense to me. If that assumption is wrong it's a one-flag change.

_Whole-word matching._ I noticed early on that without word boundaries, a keyword like `cat` would also redact `category`, which breaks any real document. I used `\b` to avoid that. Substring matching would be simpler to implement but I think it makes the tool impractical, so I ruled it out.

_Longest phrase wins on overlaps._ I analyzed what happens when you have both `"Red Sox"` and `"Boston Red Sox"` in the keyword list — without sorting, the regex could match the shorter phrase first and leave `Boston XXXX` in the text instead of `XXXX`. I sort phrases by word count before building the regex so the longer ones always get priority.

---

## Part 2 — Unredaction

When I read Part 2 I immediately noticed a problem: `XXXX` is lossy. Once "Boston Red Sox" is replaced, nothing in the redacted string can tell you what was there. That means unredacting with a key isn't something you can do purely from the text — you have to have stored the original somewhere.

So what I implemented is: when you redact, you pick your own key and the system saves `{ key → { originalText, redactedText } }` to disk. When you unredact, you pass the same key and the redacted file. The system looks up the record, checks that the file contents match what was stored (if they don't, you get a clear error instead of silently returning the wrong document), and returns the original.

I also noticed that the spec's signature `unredact(key, redactedText)` implies the key + redacted text alone should be enough to recover the original without stored state. That would only work if the redacted output encoded the original somehow — like embedding an encrypted token instead of a literal `XXXX`. But that conflicts with the actual `XXXX` requirement. I went with the store-based approach because I think it's more honest about what's actually happening. I'd rather have that conversation openly than pretend the design is something it isn't.

One thing I think can still be improved: right now `store.ts` is backed by a local JSON file, which is fine for the demo but obviously wouldn't scale. That said, given the scope of this exercise I think it's a reasonable starting point — and it's the same persistence layer Part 3 asks about, just in a simpler form.

---

## Part 3 — How I'd think about building this for real

**Storage.** I'd keep it relational. Something like:

```
documents(id, redacted_text, original_text_ref, created_at)
document_keywords(document_id, keyword)
```

One row per redacted keyword per document. `original_text_ref` should point to a separate, more restricted store — the classified originals shouldn't live in the same place as the redacted copies. A document store like MongoDB would also work if you model the keywords as an indexed array field; it depends on what the rest of the stack looks like.

**Search.** The query "which documents had keyword X redacted?" maps naturally to an index on `document_keywords.keyword`. For a reasonable dataset that's enough. If the volume grows or you need richer queries — fuzzy matching, full-text search over the redacted content, filters by date or classification level — I'd put Elasticsearch in front of the same data.

**API.** I'd expose something like:

- `POST /documents` — submit the file + keywords, get back the redacted text and key
- `GET /documents/:id` — fetch the redacted version
- `GET /search?keyword=X` — find documents that had X redacted
- `POST /unredact` — `{ key }` → original text

**What I'd push back on if this went to a design review:** auth and audit logging need to be part of the design from the start, not added later. These are classified documents — who can search and who can unredact are different permission levels, and every access should be logged. That changes the schema and the API surface in ways that are painful to retrofit.
