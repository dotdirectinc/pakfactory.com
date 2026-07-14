# Commit mode — one-app-per-commit ⇄ mix-commiter (toggle)

Two **mutually exclusive** commit-scope modes. Exactly one is active at a time, and
enabling one disables the other. The active mode is the single token stored in
**`.claude/commit-mode`** (at this worktree root) — that file is the single source of
truth. **Read it before staging or committing.**

| Active mode | `.claude/commit-mode` value | Effect on scoping |
|-------------|------------------------------|-------------------|
| **one-app-per-commit** | `one-app-per-commit` | [`single-app-commits-and-branches.md`](../../../.claude/rules/single-app-commits-and-branches.md) is **ENFORCED**: each branch and each commit stays scoped to one app/package. Cross-app work must be split before committing. |
| **mix-commiter** | `mix-commiter` | That rule is **SUSPENDED**: the user may edit and commit changes across multiple apps (e.g. `apps/blog` **and** `apps/studio`) in one branch and one commit. |

## Rules

1. **Mutual exclusion.** The two modes are never both active. The value in
   `.claude/commit-mode` decides which one applies; switching to one mode turns the
   other off. There is no "both" or "neither" state (an empty/missing file defaults to
   `one-app-per-commit`, the safe policy).
2. **mix-commiter active ⇒ one-app-per-commit paused.** When the value is
   `mix-commiter`, do **not** enforce or warn about cross-app branches/commits; allow
   multi-app staging and a single mixed commit. While set, this **overrides**
   `single-app-commits-and-branches.md` (and the matching `single-app` guidance in the
   management-root and `.cursor` rules).
3. **one-app-per-commit active ⇒ mix-commiter off.** When the value is
   `one-app-per-commit`, follow `single-app-commits-and-branches.md` exactly: one app
   per branch and per commit; split multi-app work before committing.
4. **Check before committing.** Always read `.claude/commit-mode` (or run the command
   below) before staging, so the correct policy is applied to that commit.
5. **Scope only.** This toggle relaxes **only** the one-app-per-commit / one-app-per-branch
   scoping. All other policies stay in force in both modes — notably
   [`confirm-approved-features.md`](../../../.claude/rules/confirm-approved-features.md)
   (confirm before changing shipped work) and the ADRs.

## Check / switch — command

From this worktree root:

```bash
# Check the current mode
./.claude/commit-mode.sh
# → commit mode: mix-commiter  →  one-app-per-commit is PAUSED (multi-app commits allowed)

# Switch modes (mutually exclusive — setting one clears the other)
./.claude/commit-mode.sh one    # enable one-app-per-commit (disables mix-commiter)
./.claude/commit-mode.sh mix    # enable mix-commiter       (pauses one-app-per-commit)
```

Current default committed in this repo: **mix-commiter**.
