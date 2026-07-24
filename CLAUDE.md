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
