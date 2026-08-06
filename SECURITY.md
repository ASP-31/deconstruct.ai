# Security Policy

## Reporting a vulnerability

Please email `security@deconstruct.ai` (replace with the actual address before publishing) with a description of the issue and a reproducer. Do not file a public issue for security bugs.

## Threat model

Deconstruct.ai accepts user-uploaded project archives, parses their contents, sends them to the Google Gemini API, and renders the structured response in the browser.

The following controls are in place:

- Strict input validation: file type, MIME, and size caps; zip-bomb guard; path-traversal rejection; symlink-free extraction; per-entry and total byte caps.
- Untrusted-content fences: source code is wrapped in `<UNTRUSTED_CODE>` blocks and the system prompt explicitly instructs the model to ignore instructions found inside the data.
- Secret redaction: known API-key patterns are removed from the code payload before it leaves the server.
- Prompt-injection regex guard with explicit rejection of suspicious uploads.
- AI output is treated as untrusted: HTML-escaped, length-capped, and validated against an allow-list of file paths and line numbers.
- The Gemini API key is read on the server only via `server-only` modules; it is never exposed to the client.
- Strict Content-Security-Policy, plus X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP/CORP, and HSTS headers via Next.js config and middleware.
- Per-IP rate limiting on `/api/analyze`.
- Monaco Editor is loaded locally (no remote module fetches) and is configured read-only and DOM-read-only.
- Errors are logged server-side with secret redaction; clients receive only sanitized messages.

## Operational notes

- `next.config.ts` disables `x-powered-by` and source maps in production.
- `productionBrowserSourceMaps: false` ensures the original source is not shipped to clients.
- All dependencies are pinned to patched versions. Run `npm audit --omit=dev --audit-level=high` regularly.

## Out-of-scope

- Vulnerabilities in third-party APIs (Google Gemini).
- Denial of service via network bandwidth, which the hosting provider must mitigate.
