# Issue labels

How every GitHub issue is labelled, and what each level means.

## The rules

- Every issue gets exactly **one type, one priority and one size**.
- Bugs also get **one severity**.
- Labels go on when the issue is filed. Priority is re-checked when a
  session wraps up; severity and size change only if the facts change
  (e.g. a bug turns out to be worse, or the work turns out bigger).

| Group | Labels | Answers | Who decides |
|---|---|---|---|
| Type | `bug`, `enhancement`, `documentation` | "Is it broken, new, or docs?" | The facts |
| Severity (bugs only) | `severity: high` … `severity: very low` | "How much damage does it do when it happens?" | The facts; rarely changes |
| Priority | `priority: high` … `priority: someday` | "When will I work on it?" | Me; changes as I learn what matters |
| Size | `size: XS` … `size: XL` | "How big is it to do?" | My best guess, before starting |

Severity feeds priority but doesn't set it: a high-severity bug that almost
never happens can still be medium priority.

## Severity (bugs only)

| Level | Test | Example |
|---|---|---|
| `severity: high` | Ends or ruins a date night for many couples, **or** exposes privacy or security (camera, credentials) | #14 anyone could get TURN credentials |
| `severity: medium` | Breaks a feature, but there's a workaround (refresh, rejoin) | #6 ghost seat after editing the URL |
| `severity: low` | Annoying or rare; fixes itself or is easy to ignore | #55 unknown `/api/...` returns 200 |
| `severity: very low` | Cosmetic, or nobody would notice | #69 font flash on slow networks |

## Priority (every issue)

| Level | Meaning | Roadmap section |
|---|---|---|
| `priority: high` | Working on it now or next. **At most ~3 at a time**, or it stops meaning anything | Now |
| `priority: medium` | Soon, once the high ones are done | Next |
| `priority: low` | Wanted, but not soon | Later |
| `priority: someday` | Maybe never; kept so the idea isn't lost | Later → Someday |

## Size (every issue)

Size counts effort **and** unknowns: a small change that needs a concept
I haven't learned yet goes up a size.

| Size | Rough meaning | Example |
|---|---|---|
| `size: XS` | Under an hour; one file; I already know how | #69 preload the font |
| `size: S` | One session | #46 bring a cam to the front |
| `size: M` | 2–3 sessions | #7 socket reconnect with backoff |
| `size: L` | Needs a plan in `docs/plans/`, maybe several PRs | #35 screen share |
| `size: XL` | Too big to start: split it or brainstorm it first | #64 mini-games |

## Finding things

```sh
gh issue list --label "size: XS"                          # a quick win
gh issue list --label "size: S" --label "priority: medium" # small and useful
gh issue list --label bug --label "severity: high"         # anything on fire
```

On a tired day: pick from `size: XS` or `size: S`. An XL issue's first
step is always splitting it or a brainstorm, never code.
