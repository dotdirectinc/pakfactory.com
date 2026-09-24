# `@pakfactory/sanity/customization-rules`

One implementation of the customization rules, shared by the three readers that need them
(**PROD-2557**, **PROD-2558**).

| Reader | Asks |
|---|---|
| **Studio** | what an editor is about to change |
| **www** | what a customer can pick |
| **admin** | what the rules currently say |

Three copies of this logic is how they drift. That is the whole reason this package exists —
it is not a utility, it is the single answer all three call.

## What it computes from

Three Sanity fields and nothing else:

| Field | Ticket | Means |
|---|---|---|
| `customizationType.availabilityDecidedBy` | PROD-2532 | `product` — each product lists which of these it offers. `customization` — the material or process it goes on decides instead |
| `customizationOption.compatibleCustomizations` | PROD-2534 | one flat list of option ↔ option pairs, **read from both ends** |
| `product.availableCustomizations` | PROD-2529 | what a standard product offers, option by option |
| `customizationType.dependsOn` | PROD-2558 | which customizations are picked **before** this type and decide what is left in it |
| `product.customizationExceptions` | PROD-2595 | where one product disagrees with the rules: `add` an option they leave out, or `remove` one they include, each with a reason. Only for options another customization decides |

`types.ts` mirrors those fields and **is deliberately not the documents**. Each caller projects
its own GROQ into these shapes, which keeps the rules independent of how each app fetches and
keeps the tests free of Sanity altogether.

## Modules

| Import | Answers |
|---|---|
| `…/customization-rules` | `eligibleOptions` — which options can appear at all; `offersForProduct` — what one product offers; `buildCompatibilityIndex` |
| `…/customization-rules/dependencies` | `buildDependencyGraph` — expands `dependsOn` into the type-id graph the rules take |
| `…/customization-rules/resolve` | `resolveForProduct` — what a product can actually offer once the rules settle and its exceptions apply; `derivedBecause` says which partner keeps each derived option, `exceptions` what each exception did |
| `…/customization-rules/selections` | `resolveWithSelections` — what survives after the customer has chosen |

Consumed **source-level** through `workspace:*` — there is no build artifact, so a change here
reaches Studio, www and admin without a publish step.

## The four things that are easy to get wrong

**1. Two axes, opposite empties.** The registry and Sanity disagree on what an empty list means,
on purpose:

- registry `value_works_on` empty → **no restriction** (fails open)
- Sanity `compatibleCustomizations` empty → **compatible with nothing** (fails closed, PROD-2534)
- Sanity `dependsOn` empty → **nothing narrows this type**, a warning rather than an error

**2. Direction is not in `compatibleCustomizations`.** That field is one flat list read from both
ends, so it can say Spot UV and Matte go together and **cannot** say which decides the other.
`dependsOn` carries the direction. Without it the caller has to supply the order, and every
caller has to agree.

**3. `dependsOn` takes a CATEGORY or a TYPE, and the rules take neither.** The board states it
both ways — *"Material dictates Printing Method"* is all sixteen material types (naming them one
by one would be wrong the day a seventeenth arrives), while *"Colour System depends on Printing
Method"* is a single type. The rules want type ids, because that is what an option belongs to.
`dependencies.ts` is the one place that knows both, so the expansion lives there rather than in
each caller.

**4. Resolution is a fixpoint, not one pass.** Removing an option can remove the option that
depended on it:

> Colour System works on Offset · Offset works on Paperboard · the product offers no
> Paperboard → Offset goes → the Colour System option that only paired with Offset goes one
> pass later.

Read **ALL-OF across dependencies, ANY-OF within one**: an option must find a compatible partner
in *every* entry of `dependsOn`, and any one partner within an entry is enough. Flattening that
to "any pair anywhere" keeps an option alive on the strength of a relationship from a different
axis entirely.

## Exceptions: one product, both directions

`product.customizationExceptions` is data, so it takes effect on publish and changes one product.
Encoding the same carve-out as a rule would change every product on that material.

- **Remove** is taken out **before** the rules settle, so what depended on it cascades out too.
- **Add** is **pinned**: the rules never take it back, and what depends on it can pair with it.
- Each exception is judged against the rules alone: `added`, `removed`, or `redundant`. An
  add also reports **why** the rules left the option out (`rulesSaid`).
- An `add` is never blocked. Sanity cannot tell a pairing that is physically impossible from
  one nobody has drawn — both are a missing pair — so Studio warns on every add instead.

## A selection can invalidate an earlier selection

Pick Offset, then change the material to one Offset does not work on. Silently dropping the
Offset choice produces a spec the customer never agreed to; silently keeping it produces one
that cannot be made. So `resolveWithSelections` **removes it and reports it** (`InvalidatedSelection`),
and the caller decides what to say. An invalidated choice leaves its type *unanswered* — it does
not empty the product.

## Where the data comes from

Crystal's Miro board and Notion are the source of truth. The board is loaded into the spec
registry (`pakfactory.com-backend`, Supabase project `vregjwafwbglmwhzorpw`) as approved
changesets, and the registry fills these Sanity fields once via
`scripts/relationship-fill.mts` — including `dependsOn`, which is derived from
`value_works_on` rows rather than authored by hand. See
`pakfactory.com-backend/docs/spec-studio-alignment.md` § 2a and
`scripts/lib/depends-on.ts`.

After that one-time fill, **Sanity owns the rules** and this package computes from it
(decision 2026-09-18); the registry keeps the history.

## Tests

58 tests, no Sanity, no network. They use **Node's built-in runner**, not vitest — vitest
reports "No test suite found" for these files, which is a runner mismatch and not a failure:

```bash
cd packages/sanity
node --import tsx --test 'src/customization-rules/*.test.ts'
# or
pnpm --filter @pakfactory/sanity test
```
