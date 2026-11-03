// Two sample spec sets for the same fictional product, so people can see the gap.

const weakSpec = `# Tool Library App

We want to build a modern, user-friendly app for our neighbourhood tool library.

## Features

- Users should be able to browse tools easily
- Users can reserve tools and it should be fast
- Admins can manage the inventory, users, reservations etc.
- It should send notifications when needed
- The system should be secure and scalable
- We might add a waitlist later if possible
- It would be nice to have a map of pickup locations

## Tech

We will use React and Node.js with a Postgres database, deployed on AWS.
Tasks: build login, build catalog page, build reservation flow, deploy.
`

const strongSpec = `---
template: spec-kit/spec-template
status: draft
version: 0.3
---
# Feature Specification: Tool Library Reservations

**Feature Branch**: \`003-tool-reservations\` · **Related**: [plan.md](plan.md), [tasks.md](tasks.md)

## Overview

The Tool Library app lets members of a neighbourhood tool library find a tool, reserve it for a pickup window, and return it.
It is **not** an e-commerce store and it is **not** a social network: there is no buying, selling or messaging between members.

## Glossary

- **Member**: a person with an active library card.
- **Tool**: a physical item in the catalogue with a unique asset tag.
- **Reservation**: a hold on one Tool for one Member for a pickup window.
- **Pickup window**: a 2-hour slot during staffed opening hours.

## User Stories

### US1 — Find a tool (P1)

As a member, I want to search the catalogue so that I can see whether a tool is available.

**Acceptance Scenarios**
1. **Given** the catalogue has 500 tools, **When** a member searches "drill", **Then** matching tools are listed with availability in under 1 s (p95).
2. **Given** no tool matches, **When** a member searches, **Then** the member sees an empty state with a "suggest a tool" link.

### US2 — Reserve a tool (P1)

As a member, I want to reserve an available tool for a pickup window.

**Acceptance Scenarios**
1. **Given** a tool is available, **When** a member reserves it, **Then** a reservation is created and a confirmation is shown within 2 s.
2. **Given** two members reserve the last unit at the same time, **When** both submit, **Then** exactly one succeeds and the other sees "just taken".

## Functional Requirements

- **FR-001**: The system MUST let a member search tools by name, category and availability.
- **FR-002**: Search results MUST show at most 20 tools per page.
- **FR-003**: The system MUST let a member hold at most 3 active reservations.
- **FR-004**: A reservation MUST expire if the tool is not picked up within 30 minutes after the window ends.
- **FR-005**: The system MUST NOT allow a reservation for a tool flagged "under repair".
- **FR-006**: The system MUST notify the member by email 24 hours before the pickup window.
- **FR-007**: Supported tool categories are:
  - Power tools
  - Hand tools
  - Garden tools
  - Ladders
- **FR-008**: Staff MUST be able to mark a tool as returned, damaged or lost.

## Non-Functional Requirements

- **NFR-001**: Performance — catalogue search p95 < 1 s with 5,000 tools.
- **NFR-002**: Availability — 99.5% monthly uptime during opening hours.
- **NFR-003**: Accessibility — all member screens MUST meet WCAG 2.1 AA.
- **NFR-004**: Observability — every reservation state change MUST be written to an audit log.

## Security & Privacy

- **SR-001**: Only staff MAY see a member's phone number.
- **SR-002**: Member email addresses MUST be encrypted at rest.
- **SR-003**: Sessions MUST expire after 30 minutes of inactivity.

## Edge Cases

- **EC-001**: Member's card expires while a reservation is active → reservation is cancelled and the member is emailed.
- **EC-002**: Tool is reported damaged on return → tool status becomes "under repair"; future reservations are cancelled.
- **EC-003**: Email service is unavailable → notification is retried 3 times over 1 hour, then logged for staff.

## Assumptions

- Members already have library cards issued by staff at the front desk.
- One physical branch; multi-branch is a later feature.

## Dependencies

- Library card registry (upstream) — FR-003 depends on it to verify an active card. If it is unreachable, reservations are blocked with a clear message; search still works.
- Email service (downstream) — FR-006 depends on it; see EC-003 for failure behaviour.

## Constraints

- Scope is limited to one branch and up to 5,000 tools.
- Must run on the library's existing hosting budget.

## Out of Scope

- Payments, late fees and deposits.
- Member-to-member messaging.
- Native mobile apps (web only for this release).

## Success Criteria

- **SC-001**: 90% of members complete a reservation in under 2 minutes.
- **SC-002**: No-shows fall below 10% of reservations within 3 months.

## Open Questions

- **OQ-1**: [NEEDS CLARIFICATION: should staff be able to override the 3-reservation limit?]
- **OQ-2**: [NEEDS CLARIFICATION: is SMS required in addition to email?]

## Review & Acceptance Checklist

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Every FR has at least one acceptance scenario
- [ ] Definition of done: all acceptance scenarios pass as automated e2e tests
`

const strongPlan = `# Implementation Plan: Tool Library Reservations

**Spec**: [spec.md](spec.md) · **Tasks**: [tasks.md](tasks.md)

This plan realises spec.md; tasks.md breaks it into ordered work.

## Technical Context

- **Language**: TypeScript 5
- **Frontend**: React 18 + Vite
- **Backend**: Node.js 20 with Fastify
- **Storage**: PostgreSQL 16
- **Testing**: Vitest (unit), Playwright (e2e), Pact (contract tests for the card registry)

## Architecture Decisions

- **Decision**: Use a database row lock for the last unit of a tool.
  **Rationale**: guarantees US2 scenario 2 (exactly one winner) without a queue.
  **Alternatives considered**: optimistic retries — rejected, poorer UX under contention.
- **Decision**: Email via a queue with retry.
  **Rationale**: satisfies EC-003 (3 retries over 1 hour).

## Data Model

\`\`\`ts
type Reservation = {
  id: string; toolId: string; memberId: string;
  window: { start: string; end: string };
  status: 'active' | 'picked_up' | 'returned' | 'expired' | 'cancelled';
}
\`\`\`

## Contracts

- \`POST /api/reservations\` → 201 Reservation | 409 just-taken | 422 limit-reached (FR-003)
- \`GET /api/tools?q=&category=&page=\` → 20 tools per page (FR-002)
- API is versioned under \`/api/v1\`; breaking changes require a new version.

## Dependencies

- Card registry: 2 s timeout, circuit breaker opens after 5 failures; verified by contract test.

## Edge Cases

- EC-001 handled by nightly job.
- EC-002 handled in the return flow.

## Phases

- Phase 1: Catalogue search (US1)
- Phase 2: Reservations (US2)
- Phase 3: Notifications and audit log
`

const strongTasks = `# Tasks: Tool Library Reservations

**Input**: [plan.md](plan.md), [spec.md](spec.md)

## Phase 1: Catalogue search (US1)

- [ ] T001 [US1] Create \`src/db/schema.sql\` with tools table (FR-001)
- [ ] T002 [US1] Create \`src/api/tools.ts\` search endpoint returning 20 per page (FR-002)
- [ ] T003 [US1] Create \`src/ui/Search.tsx\` with empty state (US1 scenario 2)
- [ ] T004 [US1] Add e2e test \`tests/search.spec.ts\` for NFR-001 p95 < 1 s

## Phase 2: Reservations (US2)

- [ ] T005 [US2] Create \`src/api/reservations.ts\` with row lock (FR-003, FR-005) — depends on T001
- [ ] T006 [US2] Add contract test \`tests/pact/card-registry.ts\` (FR-003) — depends on T005
- [ ] T007 [US2] Create \`src/jobs/expire.ts\` for FR-004 and EC-001
- [ ] T008 [US2] Add e2e test \`tests/reserve.spec.ts\` covering US2 scenarios 1–2

## Phase 3: Notifications and audit log

- [ ] T009 Create \`src/jobs/notify.ts\` email queue with retry (FR-006, EC-003)
- [ ] T010 Create \`src/audit/log.ts\` writing every state change (NFR-004)

## Definition of Done

- All tasks checked, all tests pass, no [NEEDS CLARIFICATION] markers left in spec.md.
`

export const SAMPLES = {
  weak: {
    label: 'Weak: one vague README',
    files: [{ name: 'README.md', text: weakSpec }],
  },
  strong: {
    label: 'Strong: spec + plan + tasks',
    files: [
      { name: 'specs/003-tool-reservations/spec.md', text: strongSpec },
      { name: 'specs/003-tool-reservations/plan.md', text: strongPlan },
      { name: 'specs/003-tool-reservations/tasks.md', text: strongTasks },
    ],
  },
}
