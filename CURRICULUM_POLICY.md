# Kallimni curriculum publishing gates

**Status: specification only; NOT an active automated publisher.**

1. Generate at most one proposed lesson per day. An empty day is acceptable.
2. Reject malformed JSON, missing fields, duplicate lesson/phrase IDs, and incompatible schemas.
3. Verify every Arabic phrase, English translation, transliteration, gender form, quiz answer, and cultural note using independent trustworthy evidence. A model checking its own answer is not independent verification.
4. Reject unverifiable or ambiguous claims; hold religious or sensitive cultural instruction for expert review.
5. Test app compatibility, offline fallback, progress preservation, and catalog versioning.
6. Publish only after every critical gate passes; otherwise hold without modifying the live catalog.
7. Record provenance and test results, allow rollback, and avoid storing learner personal data in public GitHub.
8. Never use paid AI APIs, publish automatically, or modify Atlas without explicit authorization and a verified implementation.

The existing local prototype contains two finite example candidate lessons, not a perpetual AI generation system. No daily job is enabled in this repository.
