# Spec-CLI (System-First Specification)

A simple way to describe your software system in plain English so that AI can turn it into a full technical specification and working code.

## How it Works

Instead of writing user stories and technical tickets, you describe your system the way you'd explain it to a friend. The AI reads your descriptions and figures out the database schema, the API, the code structure, the tests — everything.

## Installation

```bash
# Run directly with npx
npx spec-cli init
```

## Commands

### `spec init`
Scaffolds a `.spec/` folder in your project with 8 descriptive templates:
- `what.md`: What is this system about? What does it manage?
- `how.md`: How should it be built? What technology?
- `who.md`: Who uses it? What can each person do?
- `when.md`: When does it do things automatically?
- `where.md`: Where does it live? How do people access it?
- `why.md`: Why does it exist? What rules must it follow?
- `upstream.md`: What does it receive from other systems?
- `downstream.md`: What does it send to other systems?

### `spec generate`
Reads all the files in `.spec/`, assembles a master prompt, and:
1. Writes it to `AGENTS.md` in your project root.
2. Copies it to your clipboard.

## Workflow

1. **Init**: Run `spec init` to get the templates.
2. **Describe**: Open the `.md` files and describe your system in plain English.
3. **Generate**: Run `spec generate`.
4. **Build**: Paste the prompt into an AI Agent (like Cursor or Claude Code) and watch it build your system.

---

ZeeSpec is a method for how to write a complete system specification for AI — in just **one hour**.

It’s not documentation. It’s a constraint system.

You answer 60 questions — one per minute — and at the end, you don’t have notes. You have a system where:
- Nothing important is undefined
- Nothing critical is assumed
- And AI has no room to guess

### The Rule

For every question:
- If you can’t answer it → your system is undefined
- If you skip it → AI will decide for you
- If you answer it clearly → AI becomes deterministic

---

## 🧠 The 5W1H Model

ZeeSpec breaks your system into 6 dimensions:
- **What** → What the system is
- **Where** → Where things happen
- **When** → When things happen
- **Who** → Who can act
- **Why** → Why rules exist
- **How** → How the system behaves

Each dimension has 10 questions.

### 🔵 WHAT — What the system is (10 min)
*Define what exists and what doesn’t.*
1. What does the system do?
2. What are the main things in the system?
3. What can exist in the system?
4. What cannot exist in the system?
5. What information must always be present?
6. What information is optional?
7. What states can each thing be in?
8. What changes are allowed?
9. What changes are not allowed?
10. What should never be stored?

### 🟢 WHERE — Where things happen (10 min)
*Define boundaries and limits.*
1. Where can the system be accessed from?
2. Where are actions performed (user vs system)?
3. Where is data allowed to go?
4. Where is data NOT allowed to go?
5. Where are system boundaries?
6. Where do external systems connect?
7. Where is access restricted?
8. Where can failures occur?
9. Where must the system always respond?
10. Where is behavior different based on location?

### 🟡 WHEN — When things happen (10 min)
*Define timing and triggers.*
1. When is something created?
2. When is something updated?
3. When is something deleted?
4. When does a process start?
5. When does a process stop?
6. When must the system respond immediately?
7. When can it respond later?
8. When should the system retry?
9. When should the system block actions?
10. When does something expire?

### 🟠 WHO — Who can act (10 min)
*Define ownership and access.*
1. Who can use the system?
2. Who can see what?
3. Who can create things?
4. Who can update things?
5. Who can delete things?
6. Who cannot access certain data?
7. Who approves important actions?
8. Who triggers key events?
9. Who is responsible for actions?
10. Who should never be allowed to act?

### 🔴 WHY — Why rules exist (10 min)
*Define intent and constraints.*
1. Why does this system exist?
2. Why does each feature exist?
3. Why are certain actions allowed?
4. Why are certain actions blocked?
5. Why is some data restricted?
6. Why are validations needed?
7. Why does timing matter?
8. Why are some actions irreversible?
9. Why are these constraints enforced?
10. Why should the system fail instead of guessing?

### 🟣 HOW — How the system behaves (10 min)
*Define behavior under all conditions.*
1. How does the system respond to user actions?
2. How does it behave when data is missing?
3. How does it handle invalid input?
4. How does it handle errors?
5. How does it behave when something fails?
6. How does it recover from failure?
7. How does it enforce rules?
8. How does it prevent unexpected behavior?
9. How does it behave under stress?
10. How does it stay consistent?

---

## 🔥 What You Get After 1 Hour

If you answer all 60 questions, you don’t just have notes. You have:
- A complete system definition
- A constraint model AI can follow
- A spec with no silent assumptions
- A system where missing decisions are impossible to ignore

### The Real Power
Most specs describe systems. ZeeSpec forces decisions. And once decisions are explicit:
- AI stops being creative.
- It starts being correct.

### The One Rule You Can’t Break
**If a question feels uncomfortable to answer — that’s the one you must answer.**
Because that discomfort? That’s the exact place where systems break.

---

> **Disclaimer**: While ZeeSpec is a powerful framework for alignment, the “1-hour” timeframe should be viewed as a goal for rapid prototyping rather than a guarantee for production-grade architecture. Complex systems often require deeper cross-functional deliberation that may exceed this sixty-minute sprint.
