# Why I Created ZeeSpec: Spec-Driven Development for the AI Era

*ZeeSpec is a Zachman Framework–based spec-driven development framework built on the simple idea of 5W1H — What, Where, Who, When, Why, and How.*



ZeeSpec is a structured specification framework that closes that gap — forcing you to define your system across every critical dimension before the AI touches a line of code. Where it lives. Who can access it. When things happen. Why rules exist. The result is code that doesn’t just look right — it actually is right, because the AI had no room to guess.

I didn’t set out to invent a framework.

I was trying to get AI to stop being almost right.

## The Moment It Broke

Like most engineers, I started with user stories.

“As a member, I can borrow a book.”

Clean. Simple. Proven.

With AI coding assistants, it even felt like magic at first. A few lines in — working code out. APIs, database models, tests.

Until you look closer.

- The schema isn't quite right.
- The API exposes fields it shouldn't.
- There's logic no one explicitly asked for.

Nothing is obviously broken. But nothing is fully correct either.

The problem wasn’t that the AI misunderstood me.

It filled in what I didn’t define.

## The Real Problem

We are giving AI incomplete specifications and expecting complete systems.

User stories worked because humans compensate for gaps. They ask questions, apply judgment, and rely on experience.

AI does none of that.

It completes patterns.

And when the pattern is vague, the output becomes plausible — not correct.

## The Shift: From Stories to Systems

I stopped describing what the user wanted.

I started defining what the system is.

Not in paragraphs, but in structure:

- What data exists
- Where it lives
- Who can access it
- When things happen
- Why rules exist
- How processes flow

It felt heavier at first.

But the behavior changed immediately.

The AI stopped inventing.

## Where ZeeSpec Came From

ZeeSpec wasn’t designed. It accumulated.

Every time the AI made a mistake, I traced it back to an unstated assumption.

Then I made that assumption explicit.

- Invented relationships → define valid relationships
- Leaked data → define boundaries
- Wrong storage choice → define infrastructure

Over time, this stopped being a checklist.

It became a structure.

And more importantly, the gaps between definitions started to matter more than the definitions themselves.

## The Breakthrough: Intersections

Defining data is useful.

Defining infrastructure is useful.

But the real control comes from connecting them.

“User data exists” is vague.

“User PII lives in a private subnet, encrypted at rest, and is never exposed through public APIs” is not.

That’s no longer documentation.

That’s a constraint.

And constraints are something AI can reliably follow.

## The First Time It Worked

The first time I fed a complete spec into an AI system, something shifted.

The output wasn’t just convincing.

It was aligned.

- The schema matched expectations
- The APIs respected boundaries
- No extra abstractions appeared
- No phantom entities showed up

I wasn’t debugging hallucinations anymore.

I was reviewing implementation.

## The Unexpected Feature: Gap Detection

The real turning point came when something was missing.

If I defined credit card data but didn’t define where it should be stored, the system didn’t guess.

It stalled.

What used to be a silent assumption became a visible problem.

The absence of a definition wasn’t hidden anymore.

It was blocking.

## What ZeeSpec Really Is

ZeeSpec isn’t about writing better documents.

It’s about making system definition:

- complete enough that AI doesn't need to guess
- structured enough that gaps surface immediately
- constrained enough that outputs stay within bounds

It forces you to define the system before anything is generated from it.

## Why This Matters Now

AI can already generate production-grade code.

The limiting factor is no longer generation speed.

It’s specification precision.

And most teams are still operating with tools designed for human interpretation, not machine execution.

## The Real Goal

I didn’t create ZeeSpec to replace user stories.

I created it because I needed a way to make missing decisions impossible to ignore.

Because in an AI-generated system, what you don’t define doesn’t stay empty.

It gets filled.