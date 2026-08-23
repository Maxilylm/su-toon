# TOON Converter

> Convert JSON to Token-Oriented Object Notation and back, with a side-by-side token estimate.

**[Live demo](https://toon-mlx.vercel.app)**

Stuffing JSON into an LLM prompt wastes tokens on braces, quotes, and repeated keys. TOON encodes the same data using indentation and tabular arrays instead — a uniform array of objects becomes a header row like `employees [4] {name, role, age}` followed by pipe-delimited rows, so each key is written once rather than once per element. This app converts in both directions and shows an estimated token count for each panel so you can see the difference on your own data. The converter is hand-written TypeScript with no dependencies; everything runs in the browser.

## Features

- JSON to TOON conversion with tabular encoding for uniform object arrays
- TOON back to JSON via a hand-written indentation-aware parser
- Estimated token count per panel and a percentage-saved badge
- Built-in sample document to try the format immediately
- Copy buttons for both panels and inline parse-error messages

## Stack

- Vite 8 with React 19 and TypeScript
- No runtime dependencies beyond React — the converter and parser are plain TypeScript
- Frontend-only; no backend or API calls

Token counts are approximated at four characters per token, so treat them as a relative comparison rather than an exact tokenizer result.

## Running locally

```bash
npm install
npm run dev
```

---

Part of a series of 91 small web apps. [Browse them all](https://lorenzoylosada.vercel.app).
