---
name: jira-create-ticket
description: >-
  Create PROD Jira tickets: Story, Task, Bug, Sub-task or Epic. Every ticket gets the
  right fields (assignee, Team, Assigned Developer), a description in the house shape,
  testable acceptance criteria and a QA checklist that a technical or non-technical BA
  can follow. Use whenever a Jira ticket, sub-task, bug, follow-up or Epic is to be
  created ("open a ticket", "file a bug", "create sub-tasks", "make a follow-up for X",
  "add this to Jira"), and when another skill (finisher, wayfinder) reaches its
  create-ticket step.
---

<!-- Committed copy of the canonical user-level skill ~/.claude/skills/jira-create-ticket/SKILL.md (Richard's machine). Edit the canonical file first, then this copy. -->

# jira-create-ticket

This is the one place that owns ticket creation for PROD. It gathers what used to be
scattered across `jira-account.md`, `jira-ticket-pr-mapping.md`, `jira-qa-checklist.md`
and several memories. When those change, update this skill in the same edit.

Constants:

| | |
|---|---|
| cloudId | `728f0761-e732-4d56-b373-80e740aaac9c` |
| Project | `PROD` |
| MCP account | `dev@dotdirect.ca` (`5ff4c4319edf2800758695bd`) |
| Default assignee | Richard Qin, `712020:9c5e355d-8d02-42eb-8572-e55a0ae9d8e4` |
| Default reporter (intended) | richard@dotdirect.ca, `712020:f983e431-53ad-45ac-887f-b2ce57993d29` |
| Team field | `customfield_10001` = `"c494cc7a-57fc-49c0-908b-3442becb8b70"` (Development), plain id string |
| Assigned Developer field | `customfield_10783` = `{"accountId": "<assignee id>"}` |

## Steps

### 1. Account check
Call `atlassianUserInfo`. If the email is not `dev@dotdirect.ca`, stop and show the
block in `~/.claude/rules/jira-account.md`. Skip this if the account was already
confirmed earlier in the task.

### 2. Look before creating
- **Duplicates:** search for an existing ticket first.
  JQL `project = PROD AND text ~ "<2–3 key words>" ORDER BY created DESC`, plus the
  branch name or PR if there is one. If a match exists, update it instead (comment,
  QA checklist) and tell the user.
- **Follow-up on a Done ticket:** create a new Bug or Task and link it ("Relates").
  Never reopen a Done ticket (`jira-ticket-pr-mapping.md` rule 5).
- **Epic:** JQL `project = PROD AND issuetype = Epic AND statusCategory != Done`.
  If an existing Platform Epic covers the theme, add children to it instead.
- **Parent:** for a child of an Epic or a Sub-task, read the parent so the new ticket
  matches its scope and naming.

### 3. Choose the type and the split

| Work | Type |
|---|---|
| User-facing change, or a check a BA runs | Story |
| Technical work with no direct user-facing change | Task |
| Defect in shipped behaviour | Bug |
| A phase or slice of a larger ticket | Sub-task (parent = that ticket) |
| A workstream grouping several tickets | Epic |

Split into Sub-tasks **up front** (`jira-ticket-pr-mapping.md` rule 2) when the work
has phases, spans repos that merge or deploy at different times, or would be more
than about 600 changed lines (excluding generated files). Each Sub-task gets its own
AC and QA checklist and ships as one PR.

### 4. Write the summary
- A plain sentence, imperative or descriptive. Put the app at the end when it
  matters: `(www)`, `(www · server · admin)`.
- No `[www]` prefixes and no long parentheticals.
- Epic names: `Platform: <Theme>` for cross-cutting work; `<Area> – V3` (en dash) for
  www-rebuild features; otherwise a plain name.

### 5. Write the description (markdown, `contentFormat: "markdown"`)

A new ticket has no existing content to lose, so markdown is fine at creation. Later
edits follow the ADF rule in `jira-qa-checklist.md`.

**Story / Task / Sub-task**
```
<One or two sentences: what and why. "Part of PROD-####." if it has a parent or Epic.>

## Evidence            (optional: measurements, links, file:line — facts only)

## Scope
1. <what will be done>

## Acceptance criteria
* <testable, observable, one per bullet; numbers where a target exists>

## QA checklist
(template below)
```

**Bug**
```
## Problem
<what happens, where (URL / screen / record), who reported it, when>

## Steps to reproduce
1. …

## Expected / Actual
* Expected: …
* Actual: …

## Acceptance criteria
* The reported behaviour no longer occurs at <where>.
* <regression criterion: related records/pages unaffected>

## QA checklist
(template below — the Non-technical BA table starts by reproducing the original report)
```

**Epic**
- **Platform Epic:** one purpose sentence, then "Types of work that belong here"
  bullets, then "Individual checks are Stories under this epic."
- **Feature Epic:** Goal / Scope / Open items. Large Epics add Problem, Success
  criteria and Missing information.
- Data and evidence go in child tickets or comments, never in the Epic body.
- The QA checklist is an index: one row per child with key, status and
  ready-to-verify, plus any end-to-end check.

**QA checklist template.** The full rules are in `~/.claude/rules/jira-qa-checklist.md`.
```
## QA checklist
**Ready to verify:** No — not started
**Where:** <env + URL, Studio/admin URL, dataset — or "TBD — developer to fill in">
**Access needed:** <accounts / roles>

### Non-technical BA
| # | Steps | Expected result | Pass/Fail |
| --- | --- | --- | --- |
| 1 | <AC 1: concrete clicks and pages, no terminal> | <what good looks like on screen> | |

### Technical BA
* <command / query / DevTools check> — expected: <output>. Read-only; never prod writes.

### Not in scope / known gaps
* <what not to fail the ticket for, and which ticket covers it>

### Evidence to attach
* <screenshots, query output>. Report failures as a comment with page / test # / browser / screenshot.
```
At creation, write the steps from the AC only. Do not invent implementation details,
URLs or IDs; use `TBD — developer to fill in` (see the memory
`feedback-never-infer-an-identifier`).

### 6. Show the draft and get a yes
A new ticket appears on the team's board, so creating one is outward-facing. Show the
type, summary, parent/Epic and description, and ask "Create it?".

Skip the confirmation only when the user's own message already says to create it
*and* gives the content (e.g. "create a Bug for X with these AC"). Even then, show
what was created afterwards.

For several tickets, show them all in one draft and get one yes for the batch.
Creating is not a transition, so the one-per-ticket transition gate does not apply.

### 7. Create

```
createJiraIssue
  cloudId: 728f0761-e732-4d56-b373-80e740aaac9c
  projectKey: PROD
  issueTypeName: <Story | Task | Bug | Sub-task | Epic>
  summary: <step 4>
  description: <step 5>
  contentFormat: markdown
  parent: <PROD-#### for a Sub-task, or the Epic key for an Epic child>
  assignee_account_id: 712020:9c5e355d-8d02-42eb-8572-e55a0ae9d8e4   # unless the user named someone
  additional_fields:
    customfield_10001: "c494cc7a-57fc-49c0-908b-3442becb8b70"
    customfield_10783: { "accountId": "<same as assignee>" }
    # labels / priority / fixVersions only when asked or clearly implied
    #   (www-rebuild feature work: fixVersions [{ "name": "Website V3 – Q3 2026" }])
```

- **Do not pass `reporter`.** PROD's create screen rejects it ("Field 'reporter'
  cannot be set") and the whole call fails. The reporter then defaults to the MCP
  account (PakDeveloper). After creating, try once to set the intended reporter with
  `editJiraIssue` (`reporter: {"accountId": "712020:f983e431-…"}`). If Jira refuses,
  leave it and say so. That means a later @mention of the reporter notifies nobody,
  so name a real person when a decision is needed.
- **Never pass `transition`.** New tickets start in the workflow's first status. Any
  forward move goes through `jira-transition-gate.md`.
- If the Team or Assigned Developer field is refused, create without it, then set it
  with `editJiraIssue` and report the outcome.

### 8. After creating
1. **Re-read the ticket.** Confirm the type, parent, assignee, Team, Assigned
   Developer and that the description rendered (headings and the QA table).
2. **Links:** follow-ups relate to the original (`createIssueLink`, type "Relates");
   blockers use "Blocks". Mention a ticket key in a comment, never in a PR you are
   not delivering.
3. **Report back:** the key and URL `https://dotdirect.atlassian.net/browse/PROD-####`,
   plus anything left TBD or refused.
4. **Branch name for the work:** `<feat|fix|chore|…>/PROD-####-<slug>`, carrying the
   **delivered** ticket's key, never the Epic's. Allowed prefixes in pakfactory.com:
   `feat/ feature/ features/ fix/ bugfix/ hotfix/ chore/`.

## Never

- Create without showing the draft (except under the skip condition in step 6).
- Put an Epic key in a branch name, or another ticket's key in a PR title or body.
- Invent AC the user or source did not imply. If AC are unclear, write a draft,
  label it "(draft — confirm)" and say so.
- Transition the ticket as part of creating it.

## Related

- `~/.claude/rules/jira-account.md`: the account check and the field defaults.
- `~/.claude/rules/jira-qa-checklist.md`: the full QA checklist and unmet-AC rules.
- `~/.claude/rules/jira-ticket-pr-mapping.md`: sub-task splits and follow-ups.
- `~/.claude/rules/jira-transition-gate.md`: any forward move after creation.
- `finisher` (internalPortal-dataEngine) step 4d hands off to this skill.

## Where this skill lives

User-level: `~/.claude/skills/jira-create-ticket/SKILL.md`. It loads in every repo on
this machine. Cursor mirror: `internalPortal-dataEngine/.cursor/skills/jira-create-ticket/SKILL.md`,
symlinked into `Documents/.cursor/skills/` (pakFactory has no `.cursor/skills/`). It is not
committed to any repo; repos used by others or in the cloud need their own copy.
