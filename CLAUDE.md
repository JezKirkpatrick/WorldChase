# WorldChase — Claude Session Rules

## DO THIS FIRST, EVERY SINGLE SESSION
```
git status
```
Run this on BOTH repos before touching anything. If there are uncommitted changes, commit and push them BEFORE starting any new work. This has caused Pulsar and other fixes to silently not deploy multiple times.

Also check KidsWorldChase:
```
cd C:\Users\kiwis\OneDrive\Desktop\Claude\KidsWorldChase && git status
```

## DEFINITION OF DONE
A fix is NOT done when the file is saved. A fix is done when it is **pushed to git**. Vercel deploys from git, not from disk. Always: edit → `git add` → `git commit` → `git push`.

## PROJECT
- **Live at:** https://www.worldchase.net
- **Local path:** `C:\Users\kiwis\OneDrive\Desktop\Claude\WorldChase`
- **GitHub:** https://github.com/JezKirkpatrick/WorldChase
- **Stack:** Next.js 14 App Router, Supabase (Postgres + Auth + RLS), Vercel
- **Owner:** Jez (non-technical) — email kiwis.2017@yahoo.com, display name "Biohazard"
- **Sister site:** KidsWorldChase at `C:\Users\kiwis\OneDrive\Desktop\Claude\KidsWorldChase`

## SUPABASE
- **Project ref:** `wqwmbqmjoaptacmvokfp` (URL: https://wqwmbqmjoaptacmvokfp.supabase.co)
- **SQL:** Use management API via curl, do NOT ask user to paste SQL into dashboard
- **Client rules:** Use `createServiceClient()` (service role) for any DB writes/RPCs. `createClient()` (anon) is for auth only. Using the wrong client silently fails — this has broken achievements and token adjustments before.

## RECURRING BUGS — ALREADY FIXED, DON'T REINTRODUCE
- `.single()` on queries that might return 0 rows → always use `.maybeSingle()`
- `createClient()` for `adjust_tokens` RPC → must use service role client
- Avatar borders not rendering in nav → GlobalNav uses `<Avatar>` component, never render manually
- Pulsar CSS and Avatar.tsx dot colours must match — both cyan (#00ffff), not white
- Street View rounds showing the wrong thing is a RECURRING symptom with THREE distinct root causes found so far — don't assume a new report is a regression of an old fix, check which one it actually is:
  1. (2026-07-30) Bad Street View coverage classification.
  2. (2026-08-03) AI echoed back the wrong `round_number`/`difficulty`/`street_view_only` in its JSON — fixed by forcing these three fields from the caller's known values right after `JSON.parse`, never trusting the model's copy. Still in place in `generateChallengeInline.ts`.
  3. (2026-08-18) Two-part fix, same underlying cause — the AI can pick coordinates that "pass" verification while showing the wrong scene: (a) `MapPanel.tsx`'s `loadOutdoorPanorama()` now checks `data.links.length > 0` before accepting a panorama, not just `status === 'OK'` — Google's `source: outdoor` tag is uploader-supplied and can mistag an indoor photo sphere (e.g. a museum gallery) near a real street as outdoor. (b) `generateChallengeInline.ts`'s `verifyStreetView()` now also checks the matched panorama's own distance from the requested coordinates (must be ≤75m) — a location like a pedestrian-only bridge (no car access) can return `status: OK` from a wide-radius search while the actual match is an unrelated street blocks away. Panoramas are resolved fresh from `location_lat`/`location_lng` on every page load (never cached/stored as a pano_id), so both checks are the only gate. Found first on KidsWorldChase (Round 1 showing an indoor Louvre gallery, then a real-but-wrong nearby street, for a "bridge over the Seine" briefing — manually corrected that live row to Pont Alexandre III), ported here since the code was identical — WC had the same latent bug, just undiscovered.
  4. (2026-08-24) Grading bug, not a content bug — found via a full manual 25-round KWC playthrough. `submit-answer/route.ts`'s AI-judge fallback prompt framed `location_name, location_country` as the "correct location," so a guess matching the general place name could pass even when the real graded answer (from `answer_keywords`) was a specific detail — a round whose real answer was "KM" (letters carved on Budapest's Zero Kilometre Stone) accepted "Danube Riverside Park, Hungary" instead. Fixed by rewriting the judge prompt to grade against `answer_keywords` as primary ground truth, location name as context only. Root cause #2: `generateChallengeInline.ts`'s `riddle_text` prompt only said "don't give away the answer," not "don't ask your own question" — the AI wrote a competing question in the flavour text ("how many lampposts") that didn't match `street_view_question`. Fixed the prompt, plus added a cheap pre-flight check in `tryGenerateOnce()` (no extra AI call, so no generation-timeout risk): reject the generation if `answer_keywords` is empty/malformed, or if a Street View round's `riddle_text` contains a "?" (it should be scene-setting only). Both fixes ported identically to KidsWorldChase.

## AVATAR / BORDERS
- All avatar rendering must go through `components/ui/Avatar.tsx`
- Never build a manual avatar renderer (no `BORDER_RING` dict, no `<img>` fallback, no emoji span)
- The Avatar component handles all border types: pulsar, fire, rainbow, galaxy, electric, etc.
- When adding `equipped_avatar` to any query, ALWAYS add `equipped_border` too

## COMMUNICATION
- Call the user "mate"
- Plain English — no jargon without explanation
- After a fix: one sentence on what broke, one sentence on what was done
- Don't apologise repeatedly for the same class of bug
