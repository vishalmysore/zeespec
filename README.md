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

ZeeSpec is a method for how to write a complete system specification for AI — in just one** hour.

It’s not documentation.

It’s a constraint system.

You answer 60 questions — one per minute — and at the end, you don’t have notes.

You have a system where:

nothing important is undefined
nothing critical is assumed
and AI has no room to guess

The Rule
For every question:

If you can’t answer it → your system is undefined
If you skip it → AI will decide for you
If you answer it clearly → AI becomes deterministic

🧠 The 5W1H Model
ZeeSpec breaks your system into 6 dimensions:

What → What the system is
Where → Where things happen
When → When things happen
Who → Who can act
Why → Why rules exist
How → How the system behaves
Each dimension has 10 questions.

🔵 WHAT — What the system is (10 min)
Define what exists and what doesn’t.

What does the system do?
What are the main things in the system?
What can exist in the system?
What cannot exist in the system?
What information must always be present?
What information is optional?
What states can each thing be in?
What changes are allowed?
What changes are not allowed?
What should never be stored?

🟢 WHERE — Where things happen (10 min)
Define boundaries and limits.

Where can the system be accessed from?
Where are actions performed (user vs system)?
Where is data allowed to go?
Where is data NOT allowed to go?
Where are system boundaries?
Where do external systems connect?
Where is access restricted?
Where can failures occur?
Where must the system always respond?
Where is behavior different based on location?

🟡 WHEN — When things happen (10 min)
Define timing and triggers.

When is something created?
When is something updated?
When is something deleted?
When does a process start?
When does a process stop?
When must the system respond immediately?
When can it respond later?
When should the system retry?
When should the system block actions?
When does something expire?

🟠 WHO — Who can act (10 min)
Define ownership and access.

Who can use the system?
Who can see what?
Who can create things?
Who can update things?
Who can delete things?
Who cannot access certain data?
Who approves important actions?
Who triggers key events?
Who is responsible for actions?
Who should never be allowed to act?

🔴 WHY — Why rules exist (10 min)
Define intent and constraints.

Why does this system exist?
Why does each feature exist?
Why are certain actions allowed?
Why are certain actions blocked?
Why is some data restricted?
Why are validations needed?
Why does timing matter?
Why are some actions irreversible?
Why are these constraints enforced?
Why should the system fail instead of guessing?

🟣 HOW — How the system behaves (10 min)
Define behavior under all conditions.

How does the system respond to user actions?
How does it behave when data is missing?
How does it handle invalid input?
How does it handle errors?
How does it behave when something fails?
How does it recover from failure?
How does it enforce rules?
How does it prevent unexpected behavior?
How does it behave under stress?
How does it stay consistent?

🔥 What You Get After 1 Hour
If you answer all 60 questions:

You don’t just have notes.

You have:

A complete system definition
A constraint model AI can follow
A spec with no silent assumptions
A system where missing decisions are impossible to ignore
The Real Power
Most specs describe systems.

ZeeSpec forces decisions.

And once decisions are explicit:

AI stops being creative.
It starts being correct.

The One Rule You Can’t Break
If a question feels uncomfortable to answer — that’s the one you must answer.

Because that discomfort?

That’s the exact place where systems break.


**Disclaimer: While ZeeSpec is a powerful framework for alignment, the “1-hour” timeframe should be viewed as a goal for rapid prototyping rather than a guarantee for production-grade architecture. Complex systems often require deeper cross-functional deliberation that may exceed this sixty-minute sprint.
