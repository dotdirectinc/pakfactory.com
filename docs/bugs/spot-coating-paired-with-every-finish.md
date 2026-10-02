# Bug: Every Spot Coating paired with every Surface Finish

**Status:** Fixed — pakfactory.com-server #276 into `dev` + #751 into `www-new-release`
(2026-10-02); migration `20261002-spot-coating-pairs` applied on development
**Jira:** PROD-2783 · **Vault record:** BUG-0046
**Symptom:** The admin Spec System rules view showed *"Decides Spot Coating: all 5"* on every
Surface Finish and Surface Finish (non-paper) option, including Glitter, Pearlescent and Textured,
which the board frame sends to **No Spot Coating Option**.

## What happened

The board frame *Material <> Surface Finish (Lamination/Coating) <> Spot Coating* was right (the
generator's 2026-09-23 snapshot matched it line for line). The pairs went wrong in the
**relationship fill** (`pakfactory.com-server/scripts/lib/relationship-fill.ts`,
`compatibilityOn`).

The fill keeps a pair when each option *survives* the other being picked. Spot Coating is drawn to
three types in one frame (Surface Finish, Surface Finish (non-paper), Lamination), and any one of
them will do. With Gloss picked, the engine kept Spot UV **pending** on the still-unanswered
Anti-Scratch Lamination, so Gloss–Spot UV was written as compatible — and the same for every
finish. The fill already corrected this for materials ("judged as the product's only material"),
but not for other types.

## Fix

- **Fill (server #276):** when one option's type is drawn to the other's type in a frame, the
  frame's other target types leave the offer for that pair. The alternative set is the **type's**,
  built from all its rows in the frame: Matte Spot UV is drawn to no lamination, but its siblings
  are, and that is what keeps it off Anti-Scratch Lamination. Three new tests (the bug cases fail
  without the fix); `docs/relationship-fill.md` updated.
- **Data (#751):** migration `migrate:spot-coating-pairs` sets the pairs between the 5 Spot
  Coating options and Surface Finish / Surface Finish (non-paper) / Lamination to exactly the
  frame, on both ends. Ids are pinned and titles asserted. Development: 41 pairs removed, 0 added;
  `--verify` passes. Production: nothing to do.

| Finish | Spot coatings |
|---|---|
| Uncoated, Matte, Soft Touch, Anti-Scratch Lamination | Spot UV / Spot Gloss, Spot Glitter, Raised Spot UV, Textured Spot UV |
| Semi-Gloss | Raised Spot UV, Textured Spot UV |
| Gloss, Metallic Sheen, Holographic, Gloss (non-paper) | Matte Spot UV |
| Matte (non-paper), Soft Touch (non-paper) | Spot UV / Spot Gloss, Raised Spot UV |
| Glitter, Pearlescent, Textured | none |

A read-only query on the registry confirmed that Spot Coating is the only type drawn to more than
one non-material type in a frame, so no other pair changed.

## Root cause & prevention (the reusable lesson)

**"Pending" is a configurator answer; a stored pair means "goes with".** The engine was right to
keep Spot UV alive for a live configurator. Storing that answer as a pair was the bug.

- When a projection works around an engine semantic for one category, write down the general
  rule and check where else it applies.
- A fill re-run can undo a Sanity-side data fix. Fix the fill in the same change as the data.
