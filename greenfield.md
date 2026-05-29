# Most AI Projects Break at the Spec — Here's How to Fix It (Greenfield vs Brownfield)

**How to Write a Complete AI System Specification in 1 Hour — For Any Project**

*A practical guide to applying Spec-Driven Development for both new builds and legacy systems*

---

## The AI Specification Problem Nobody Talks About

AI coding assistants have changed how software gets built. You describe what you want, and working code appears. APIs, database schemas, tests — sometimes all in minutes.

But here's the uncomfortable truth most teams discover too late:
**AI doesn't leave gaps empty.**
**It fills them — and you don't notice until production.**

This is the core problem that **ZeeSpec** was created to solve. Built on the Zachman Framework and the 5W1H model (What, Where, When, Who, Why, How), ZeeSpec is a 60-question constraint system that forces every critical decision into the open — before a single line of code is generated.

But how you apply ZeeSpec changes dramatically depending on whether you're building something brand new (greenfield) or extending an existing system (brownfield). This article breaks down exactly how to use ZeeSpec for both scenarios.

---

## What Is ZeeSpec? A Quick Overview

ZeeSpec is not documentation. **It's a constraint system.**

In 60 questions — one per minute — you define every critical dimension of your system. The rule is simple:

- **If you can't answer a question** → your system is undefined
- **If you skip a question** → AI will decide for you
- **If you answer it clearly** → AI becomes deterministic

### The 6 Dimensions (10 Questions Each)

1. **WHAT** — What the system is (entities, states, boundaries)
2. **WHERE** — Where things happen (access, storage, infrastructure)
3. **WHEN** — When things happen (triggers, timing, expiry)
4. **WHO** — Who can act (roles, permissions, ownership)
5. **WHY** — Why rules exist (intent, constraints, validations)
6. **HOW** — How the system behaves (responses, failure, recovery)

The real power isn't in each dimension individually — it's in the intersections. Saying *"User PII lives in a private subnet, encrypted at rest, and is never exposed through public APIs"* is not documentation. It's a constraint AI can reliably follow.

---

## Greenfield vs Brownfield: At a Glance

Before diving into the how-to, it's worth understanding why greenfield and brownfield projects need fundamentally different approaches to specification.

| Dimension | Greenfield (New Build) | Brownfield (Legacy / Extension) |
| :--- | :--- | :--- |
| **The Starting Point** | Blank slate. No existing schemas, APIs, or legacy constraints. | Heavy constraints. Existing schemas, live APIs, technical debt. |
| **The Primary Danger** | **Underspecification** — AI invents relationships, storage, and abstractions you didn't ask for. | **Overwriting** — AI cheerfully refactors working code or generates destructive migrations. |
| **The Core Strategy** | Define everything from scratch. **Fill every dimension.** | Lock what exists. **Specify only the delta.** |
| **WHAT** | Define the complete domain model. | Define *only new* entities or modified fields. |
| **WHERE** | Design the ideal infrastructure. | **Lock** existing infrastructure entirely. |
| **WHEN** | Define all triggers for CRUD operations. | Define new triggers; surface existing conflicts. |
| **WHO** | Define roles and access completely. | Extend permissions relative to existing roles. |
| **WHY** | Encode your overarching business intent. | Protect existing logic from "helpful" AI refactors. |
| **HOW** | Outline error handling, recovery, consistency. | Outline migration paths & backward compatibility. |

---

## Applying ZeeSpec to Greenfield Projects

A greenfield project is an opportunity to define your system perfectly from the start. ZeeSpec works best here because you have no constraints forcing shortcuts — which means you must impose your own constraints deliberately.

### The Greenfield Mindset
Your goal in a greenfield ZeeSpec session is to **fill all 60 questions completely**. In greenfield, the risk isn't building the wrong system. **It's building a complete but incorrect one — because nothing existed to contradict it.**

### How to Run the 60 Questions: Greenfield Edition

- **WHAT (10 min) — Define from scratch, no legacy constraints**  
  This is where you define your domain model. Be explicit about both what exists and what explicitly **does not exist**.
  - *What does the system do?* → Write one clear sentence. No and/or.
  - *What are the main entities?* → List them.
  - *What cannot exist?* → This is the most skipped question. Answer it.
  - *What should never be stored?* → PII, payment data, secrets — be specific.

- **WHERE (10 min) — Design your infrastructure before your code**  
  In greenfield, you're free to design the right infrastructure — not inherit the wrong one.
  - *Where is data allowed to go?* → Define data flow boundaries explicitly.
  - *Where are system boundaries?* → What is in scope and what is explicitly not?
  - *Where must the system always respond?* → Define SLA-critical paths.

- **WHEN (10 min) — Define triggers and timing**  
  ZeeSpec forces you to answer temporal questions before code is written.
  - *When is something created, updated, deleted?* → Answer all three for every entity.
  - *When should the system block actions?* → Define rate limits, locks, state gates.
  - *When does something expire?* → Tokens, sessions, records — be specific.

- **WHO (10 min) — Define roles before features**  
  It's far cheaper to define role boundaries in a spec than to retrofit them.
  - *Who can see what?* → Map every role to every entity's visibility.
  - *Who approves important actions?* → Define approval workflows explicitly.
  - *Who should never be allowed to act?* → Block lists are as important as allow lists.

- **WHY (10 min) — Encode intent as constraints**  
  If the machine doesn't know the why, it may implement technically correct behaviour that violates business intent.
  - *Why are certain actions blocked?* → Don't just say they are. Say why.
  - *Why are some actions irreversible?* → Define the logic behind immutability.
  - *Why should the system fail instead of guessing?* → This is ZeeSpec's core principle.

- **HOW (10 min) — Define behaviour under all conditions**  
  AI is excellent at happy-path code. The HOW dimension forces you to specify what happens when things go wrong.
  - *How does it behave when data is missing?* → Fail explicitly, never silently.
  - *How does it recover from failure?* → Define retry logic and fallback behaviour.
  - *How does it stay consistent?* → Define transaction boundaries and idempotency rules.

### Greenfield Prompt Template

```markdown
System: [Name]
Assumption: No existing infrastructure. Build from scratch.
WHAT: [entity list, relationships, what cannot exist, what is never stored]
WHERE: [infrastructure choices, data flow boundaries, external integrations]
WHEN: [triggers for all CRUD operations, expiry, blocking conditions]
WHO: [roles, visibility matrix, approval workflows, blocked actors]
WHY: [business rules as constraints, intent behind each restriction]
HOW: [error handling, recovery, consistency, stress behaviour]

Generate a complete system spec with no unstated assumptions.
```

---

## Applying ZeeSpec to Brownfield Projects

Brownfield is where ZeeSpec becomes even more critical — and more nuanced. You're not defining a system. You're defining a delta while protecting everything that already exists.

### The Brownfield Mindset
The biggest mistake engineers make when extending codebases is underestimating how much the machine will touch. You ask for a new feature. It refactors your existing service. You ask for a new endpoint. It redesigns your authentication model.

ZeeSpec for brownfield is about two things: **constraining the scope of change**, and making existing decisions explicit so they cannot be overridden.

### Step 0: Feed Context Before You Spec
Before you answer a single ZeeSpec question, dump your existing system context into the prompt:
1. Your current data schema (even a simplified version)
2. Existing API patterns and conventions
3. Current tech stack and infrastructure
4. Any constraints that are non-negotiable (e.g. "must work on PostgreSQL 14")

### How to Run the 60 Questions: Brownfield Edition

- **WHAT (10 min) — Spec only the delta**  
  The answer is either "unchanged" or "new/modified".
  - *What new entities are being added?* → List only the new ones.
  - *What existing entities are being changed?* → Name the fields changing, not the whole entity.
  - *What cannot exist in the new feature?* → Prevent scope creep by exclusion.

- **WHERE (10 min) — Lock existing infrastructure**  
  The WHERE answers are mostly locks, not designs.
  - *Where can the system be accessed?* → Same as existing — state it explicitly.
  - *Where is data allowed to go?* → Existing rules apply. List them.
  - *Where do external systems connect?* → List all existing integrations that must not break.

- **WHEN (10 min) — Define new triggers without breaking existing ones**  
  Every new trigger is a potential conflict. Surface them now.
  - *When is the new entity created?* → Define the trigger and any conflicts.
  - *When should the system block actions?* → Include existing blocking rules that must still apply.

- **WHO (10 min) — Extend roles, don't replace them**  
  Define the new role relative to existing ones to prevent wholesale refactoring.
  - *Who can use the new feature?* → Name the existing roles it applies to.
  - *Who cannot access it?* → Explicitly exclude roles that should not have access.

- **WHY (10 min) — Protect existing intent**  
  Justifies the new feature while protecting existing logic.
  - *Why does this new feature exist?* → One sentence. No ambiguity.
  - *Why are existing constraints still valid?* → Restate them. Don't assume context carries over.
  - *Why should the system fail instead of guessing?* → The machine must not silently adapt to legacy inconsistencies.

- **HOW (10 min) — Define migration and backward compatibility**  
  How does the new feature arrive safely in a live system?
  - *How does it handle existing data that doesn't match the new schema?*
  - *How does it maintain backward compatibility with existing API consumers?*
  - *How does it roll back if something goes wrong?*

### Brownfield Prompt Template

```markdown
Existing system context:
[Paste schema / API patterns / tech stack / non-negotiable constraints]
New feature: [Name]

WHAT (delta only): [new entities, changed fields, what is explicitly excluded]
WHERE (locked): [existing infra must not change — list it explicitly]
WHEN (delta + conflicts): [new triggers, existing triggers that must still fire]
WHO (extend, don't replace): [new role permissions relative to existing roles]
WHY: [business justification + restatement of existing constraints]
HOW: [migration path, backward compatibility, rollback plan]

Generate only the delta. Do not refactor existing components.
```

---

## What Happens When Answers Conflict?

As you define the 60 questions, you will inevitably hit contradictions. You might state in the **WHO** section that *Only Admins can delete users*, but state in the **WHEN** section that *Unverified accounts are deleted automatically after 30 days*.

If two answers contradict:
**Stop. Resolve it before proceeding.**

ZeeSpec treats conflicts as **design failures, not edge cases**. A conflict in the specification is a guarantee of a bug in the generated code. Do not rely on "common sense" to resolve it during implementation—the machine does not have any.

---

## ZeeSpec's Secret Weapon: Gap Detection

One of ZeeSpec's most powerful features applies equally to both scenarios. When a dimension is left undefined, **ZeeSpec doesn't silently accept the gap. It surfaces it.** 

A missing WHERE definition doesn't produce guessed code — it produces a visible gap that blocks progress. **Blocking is better than wrong.**

- **In greenfield**, you discover undefined entities before they become phantom tables.
- **In brownfield**, you discover conflicts between new and existing behaviour before they become production incidents.

---

## Practical Tips for Both Scenarios

1. **The uncomfortable question is the important one**  
   If a question feels uncomfortable to answer, that is the one you must answer. That discomfort is the exact location of your system's future failure.
2. **Answers don't need to be long — they need to be clear**  
   *"User PII is never returned in list endpoints"* is a perfect answer. Paragraphs of explanation are not constraints. Decisions are.
3. **In brownfield, paste first — then spec**  
   An AI that doesn't know your schema will design around it, not with it.
4. **Use ZeeSpec to review AI output, not just generate it**  
   Does the generated code match every answer? Any deviation is a constraint violation.
5. **ZeeSpec scales to team size**  
   Assign dimensions to domain owners: WHO to a security engineer, WHERE to infrastructure, WHY to a product manager.

---

### Conclusion: Stop Describing. Start Constraining.

The gap between AI-generated code that *looks* right and code that *is* right comes down to specification precision. User stories produce plausible systems. **ZeeSpec produces correct ones.**

- **Greenfield:** fill all 60 answers and give AI no room to invent.
- **Brownfield:** lock what exists, spec only the delta, and give AI no room to overwrite.

AI doesn't fail because it's wrong.  
**It fails because it was allowed to decide.**

ZeeSpec removes that freedom.