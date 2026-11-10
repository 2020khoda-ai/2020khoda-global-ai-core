# Candidate v0.3 — Local Test Results

Execution date: 2026-11-10
Runtime: Node.js 22
Scope: isolated local SQLite fixture only

- `node --check src/index.js`: PASS
- `npm test`: 5 tests passed, 0 failed

Test cases:
1. Public submission stays pending and does not create CRM rows — PASS
2. Draft list and approval require Admin authorization — PASS
3. Admin approval atomically registers one lead and one pipeline row — PASS
4. Admin can reject a pending draft without creating CRM rows — PASS
5. Invalid public lead data is rejected before draft creation — PASS

Limitations:
- These tests do not establish Cloudflare D1 integration.
- No live D1 rows were written.
- No Worker or Pages deployment was triggered.
- Full form/API regression and deployed-source parity remain pending.
