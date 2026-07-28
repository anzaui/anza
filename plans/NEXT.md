# Next after Phase 2 / issue #3

Phase 2 (client DSD adopt / hydration) and the SSG-SEO Mode A/B track are **done**. Issue [#3](https://github.com/aduki-org/anza/issues/3) is closable — see draft closing comment below.

---

## Recommended next phase

**Prefer: full element library documentation** (`library/src/elements/` → docs + web docs).

| Option | Why now / why later |
| ------ | ------------------- |
| **Element library docs** (CHANGELOG Planned) | Highest user-facing gap after SSG/hydration. Apps already use primitives/forms/overlay; docs still stop at core UI. Unlocks onboarding without more architecture. |
| **Bundlers / compilers** ([issue #2](https://github.com/aduki-org/anza/issues/2)) | Real for teams that wrap Anza in Vite/Rollup/etc., but Anza’s product bet is multi-file ESM + import maps. Treat as tooling DX after docs catch up. |
| **Mode B language packages** | Explicitly out of Phase 3 acceptance (contract + examples only). Optional later if demand appears. |

**Rationale:** SSG + adopt removed the SEO/hard-refresh blocker. The next bottleneck is discoverability of the shipped element set, not another delivery pipeline.

---

## Draft closing comment for issue #3

```markdown
## Closing — Phase 2 / SSR & Native DOM Hydration

Core scope from this issue and [plans/PHASE-II.md](https://github.com/aduki-org/anza/blob/main/plans/PHASE-II.md) is complete. Product shape evolved to **SSG / Mode B HTML + client DSD adopt** (not an Anza-owned Node SSR runtime, and not crawler UA detection — rejected in [SSG-SEO.md](https://github.com/aduki-org/anza/blob/main/plans/SSG-SEO.md)).

### Done
- Adopt existing open DSD (`this.shadowRoot || attachShadow`); no wipe on hard refresh
- Context rehydrate: refs, TagsCache, `on`, `watch`; attr → prop sync; one-shot mismatch fallback
- Soft-nav leaf swap vs full-load reuse (parent docks kept)
- Light-DOM DSD polyfill path
- Mode A SSG + Mode B HTML contract, goldens, Python/Go/Node examples
- Docs: `docs/ui/hydration.md`, `docs/ssg/contract.md` (+ web docs routes)
- Tests: `library/tests/core/ui/hydration.test.js`, `soft-nav.test.js`

### Explicitly out of scope (do not reopen for these)
- Mode B npm/language packages beyond the contract examples
- External bundler integration → [#2](https://github.com/aduki-org/anza/issues/2)
- Full `src/elements/` documentation → next phase ([plans/NEXT.md](https://github.com/aduki-org/anza/blob/main/plans/NEXT.md))

Closing this issue. Follow-ups belong in new issues or NEXT.md.
```
