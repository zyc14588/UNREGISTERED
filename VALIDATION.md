# Validation Report

- Pack version: **2.0.0**
- Skill count: **25**
- Existing sandbox/campaign skills: **15**
- New custom-rules design skills: **10**
- Directory/name regex check: **PASS**
- Required `SKILL.md` frontmatter check: **PASS**
- OpenCode-recognized frontmatter fields only: **PASS**
- Description length (1–1024): **PASS**
- Manifest ↔ skill directory parity: **PASS**
- Bundled probability script smoke tests: **PASS**

## Probability Script Smoke Tests

Verified modes:

- `sum` — exact enumeration for NdS + bonus ≥ target
- `pool` — exact success-count distribution
- `highest` — exact fail / partial / full distribution

The script uses only the Python standard library.
