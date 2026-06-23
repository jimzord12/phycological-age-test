# I014 — Security hardening (CSP, escaping, limits)

- **Status:** ✅ done
- **Phase:** D (cross-cutting)
- **Depends on:** I002, I008
- **Complexity:** 3

## Context

Defense-in-depth across the app surface (PRD §11). Model and user text are untrusted.

## Scope

**In:**

- Strict Content Security Policy; HTTPS enforced in production.
- Escape all user-generated and model-generated text on render; never render model output as
  raw HTML.
- Server-side validation of content type, payload shape, item/option/version IDs, and word
  limits (shared with I002/I011); reject unknown questions and duplicate answers.
- Request-size limits; dependency scanning + lockfile in CI; CSRF protection if/when
  cookie-based state is introduced.
- Confirm no provider secret appears in rendered HTML, JS bundles, source maps, or API
  responses.

**Out:** business logic already covered by I002/I011 (this issue adds the hardening layer
and tests).

## Acceptance criteria

- [x] CSP active; user/model text escaped; model output never rendered as HTML.
- [x] Server validates payloads and word limits; rejects unknown/duplicate answers.
- [x] Request-size limits enforced; dependency scan + lockfile wired in CI.
- [x] No provider secret in any client artifact (verified by test/scan).
- [ ] Injected HTML/script in narrative is shown escaped (E2E covered in I015).

## References

PRD §11, §15.4, §10.
