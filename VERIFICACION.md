# Verificación de NEXO

Lista de pasos para verificar NEXO antes de dar un cambio por terminado o hacer commit. Es un documento normal del proyecto (no una skill de Claude Code): se sigue a mano o se le pide a Claude que lo siga.

Run the steps **in order** from the repo root (`/home/user/Delirio` or wherever the repo lives).
Stop at the first failing **cheap** step, fix it, and start again from step 1: there is no point paying for E2E on a build that does not compile.
Record the command, the result and the duration of every step for the final report.

## 0. Scope the change

```bash
git status --short && git diff --stat HEAD
```

Read `RELIABILITY.md` and pick out only the items whose **trigger** matches the files in the diff. Those items are mandatory extra checks for this change; the rest do not apply.

## 1. Cheap: types (≈5 s)

```bash
npx tsc -b
```

TypeScript `strict` with `noUnusedLocals`/`noUnusedParameters` is the project's linter; there is no ESLint. Any output is a failure.

## 2. Cheap: production build (≈1 s)

```bash
npx vite build
```

Then the single-file preview build, because the artifact preview is shipped from it:

```bash
npx vite build --mode artifact
```

Fail if either errors, or if `dist-artifact/index.html` exceeds 15 MB (artifact limit is 16 MB).

## 3. Cheap: property-based tests (≈5 s)

```bash
npx vitest run
```

Deterministic (every `fc.assert` has a fixed seed). A failure prints the seed and the shrunk counterexample: put both in the report. Never "fix" by changing the seed.

## 4. Expensive: E2E flows (≈30–60 s)

```bash
npx playwright test --trace off
```

The config builds the app and serves it on port 4173 by itself. Retries are 0 on purpose. If a test fails, re-run **only that test** once with `--trace on` to diagnose; a test that passes on the second run is **flaky**: find the cause, or delete the test and write down why. Never add retries, `test.skip` or `test.fixme` to get green. Failure screenshots are in `test-results/`.

## 5. Run the real app and use it

Tests are not enough: start the built app and drive it.

```bash
npx vite preview --port 4180 --strictPort
```

Run that in the background, then:

```bash
node scripts/smoke.cjs
```

The smoke run opens every section at 1180×820 (iPad Air 11" landscape), 1180×760 (Safari with toolbar) and 820×1180 (portrait), and fails on console errors, horizontal page scroll, content outside the stage, a section that needs scrolling at 1180×820, or music that does not actually start playing. Screenshots land in `verify-output/smoke/`. **Open at least the four landscape screenshots and look at them**: the script cannot judge overlap, legibility or whether the screen still looks like the reference.

When the change touches something the smoke run does not exercise (a form, a game, the composer, settings), drive that flow by hand too, with a short Playwright snippet or in the browser, and say exactly what you did.

Stop the preview server afterwards (`pkill -f "vite preview --port 4180"`).

## 6. Evidence report (always, even when everything passed)

End with this table and nothing vaguer:

| # | Step | Command | Result | Time | Evidence |
|---|------|---------|--------|------|----------|
| 1 | Types | `npx tsc -b` | PASS/FAIL | … | error lines, if any |
| 2 | Build | `npx vite build` (+ artifact) | … | … | bundle and artifact size |
| 3 | Properties | `npx vitest run` | … | … | N tests; seed + counterexample on failure |
| 4 | E2E | `npx playwright test` | … | … | N tests; failing test + screenshot path |
| 5 | Real app | preview + `scripts/smoke.cjs` + manual flow | … | … | screenshots looked at; manual steps done |
| R | RELIABILITY items | (per item) | … | | which items applied and how each was checked |

Then: **Failed** (what, where, why), **Not run** (and why), **Not covered** (what this change touches that no check exercised). Do not write "all good" if any row is not PASS. Never claim a physical iPad test: these runs are Chromium at iPad sizes.

## Notes

- Playwright uses the preinstalled Chromium (`@playwright/test` is pinned to 1.63.0 to match it). Never run `playwright install`.
- Media playback in headless Chromium needs `--autoplay-policy=no-user-gesture-required` (the smoke script sets it).
- After a successful run, append an entry to `CAMBIOS.md` (America/Bogota time) if the change was not logged yet.
