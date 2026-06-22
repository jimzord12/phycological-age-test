# I004 — Landing + consent + eligibility / AI / age-metaphor choices

- **Status:** ✅ done
- **Phase:** B (client flow)
- **Depends on:** I003
- **Complexity:** 3

## Context

Entry screens set expectations honestly and capture consent before any data leaves the
device. No accounts, no manipulative urgency or social proof (PRD §7.1–§7.2, §5).

## Scope

**In:**
- Landing: title, concise explanation, estimated duration, non-clinical disclaimer, privacy
  summary, `Start assessment`, expandable `How scoring works`.
- Consent: adult confirmation checkbox; non-clinical acknowledgement; AI-analysis opt-in
  with the exact AI consent copy (PRD §7.2) shown adjacent; age-metaphor toggle (off by
  default); privacy-policy link; `Continue` disabled until required confirmations checked.
- Persist choices into `AssessmentState.consent` / `preferences` (I003).
- Eligibility is a single "I am 18 or older" confirmation; do not request date of birth.

**Out:** questionnaire items (I005), the privacy-policy document itself (I018).

## Acceptance criteria

- [x] User can reach the questionnaire without an account.
- [x] `Continue` is disabled until adult + non-clinical confirmations are checked.
- [x] Age metaphor defaults to off; AI opt-in shows privacy copy beside it.
- [x] No exact DOB requested; only `is_adult` stored (DOMAIN §15.3).
- [x] No urgency/social-proof patterns.

## References

PRD §7.1, §7.2, §5; DOMAIN §2, §15.3.
