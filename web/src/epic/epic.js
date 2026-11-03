// The EPIC framework (Claudino et al., arXiv:2610.07534, Oct 2026).
// 4 categories → 10 quality dimensions → 40 practices.
// Practice labels are short paraphrases of the paper's descriptions.

export const PAPER = {
  title: 'The EPIC Framework for Spec-Driven Development',
  arxiv: '2610.07534',
  url: 'https://arxiv.org/abs/2610.07534',
  authors: 'Claudino, Xing, Zuo, Menezes, Sarma, Damevski, Feng',
}

export const CATEGORIES = [
  { id: 'E', name: 'Expressive',        blurb: 'Says exactly what is meant, and how it will be checked.' },
  { id: 'P', name: 'Precise',           blurb: 'Nothing assumed, nothing missing, every dependency declared.' },
  { id: 'I', name: 'Interpretable',     blurb: 'An agent can parse it: stable structure, IDs, shared vocabulary.' },
  { id: 'C', name: 'Compartmentalized', blurb: 'The what (spec) is kept apart from the how (plan) and the work (tasks).' },
]

export const DIMENSIONS = [
  { id: 'E1', cat: 'E', name: 'Unambiguity' },
  { id: 'E2', cat: 'E', name: 'Singularity' },
  { id: 'E3', cat: 'E', name: 'Verifiability' },
  { id: 'P1', cat: 'P', name: 'Dependency Control' },
  { id: 'P2', cat: 'P', name: 'Completeness' },
  { id: 'I1', cat: 'I', name: 'Conformance' },
  { id: 'I2', cat: 'I', name: 'Consistency' },
  { id: 'I3', cat: 'I', name: 'Comprehensibility' },
  { id: 'C1', cat: 'C', name: 'Scope Discipline' },
  { id: 'C2', cat: 'C', name: 'Implementation-Planning Information' },
]

export const PRACTICES = [
  // E1 Unambiguity
  { id: 'E1.1', dim: 'E1', text: 'Mark unresolved decisions with explicit clarification markers.' },
  { id: 'E1.2', dim: 'E1', text: 'Give settled behaviour explicit, measurable bounds and applicability conditions.' },
  { id: 'E1.3', dim: 'E1', text: 'Enumerate the items a requirement covers (e.g. supported formats, tables, roles).' },
  { id: 'E1.4', dim: 'E1', text: 'Use normative terms (MUST / MUST NOT / SHOULD) consistently.' },
  { id: 'E1.5', dim: 'E1', text: 'State explicit exclusions and verification boundaries.' },
  // E2 Singularity
  { id: 'E2.1', dim: 'E2', text: 'Keep the details of one capability together.' },
  { id: 'E2.2', dim: 'E2', text: 'Record design facts so each can be reviewed on its own.' },
  { id: 'E2.3', dim: 'E2', text: 'Give each risk or edge case its own entry.' },
  { id: 'E2.4', dim: 'E2', text: 'Keep definitions separate from scenarios.' },
  { id: 'E2.5', dim: 'E2', text: 'Record each security or privacy property separately.' },
  // E3 Verifiability
  { id: 'E3.1', dim: 'E3', text: 'State measurable outcomes.' },
  { id: 'E3.2', dim: 'E3', text: 'State how each requirement is checked.' },
  { id: 'E3.3', dim: 'E3', text: 'Identify the scenarios the checks must cover.' },
  { id: 'E3.4', dim: 'E3', text: 'State the conditions under which verification is complete.' },
  // P1 Dependency Control
  { id: 'P1.1', dim: 'P1', text: 'Declare assumptions and dependencies.' },
  { id: 'P1.2', dim: 'P1', text: 'State constraints and scope boundaries.' },
  { id: 'P1.3', dim: 'P1', text: 'Link dependencies to the requirements or tasks they affect.' },
  { id: 'P1.4', dim: 'P1', text: 'Define how dependencies are verified and what happens when they fail.' },
  // P2 Completeness
  { id: 'P2.1', dim: 'P2', text: 'Cover functional and user requirements within scope.' },
  { id: 'P2.2', dim: 'P2', text: 'Cover exceptional behaviour.' },
  { id: 'P2.3', dim: 'P2', text: 'Cover technical, operational and quality constraints.' },
  { id: 'P2.4', dim: 'P2', text: 'Record dependencies and delivery planning.' },
  { id: 'P2.5', dim: 'P2', text: 'Track unresolved specification items.' },
  // I1 Conformance
  { id: 'I1.1', dim: 'I1', text: 'Use standard structures that show where information belongs.' },
  { id: 'I1.2', dim: 'I1', text: 'Give requirements stable, unique identifiers.' },
  { id: 'I1.3', dim: 'I1', text: 'Declare the template or schema and enforce it.' },
  // I2 Consistency
  { id: 'I2.1', dim: 'I2', text: 'Use shared terminology and concept definitions.' },
  { id: 'I2.2', dim: 'I2', text: 'Use uniform notation.' },
  { id: 'I2.3', dim: 'I2', text: 'Align artifacts and trace requirements across them.' },
  { id: 'I2.4', dim: 'I2', text: 'Repeat section organization across related artifacts.' },
  // I3 Comprehensibility
  { id: 'I3.1', dim: 'I3', text: 'Organize sections by purpose.' },
  { id: 'I3.2', dim: 'I3', text: 'Link spec, plan and tasks, and explain how they relate.' },
  { id: 'I3.3', dim: 'I3', text: 'Give context: what the product is, and what it is not.' },
  // C1 Scope Discipline
  { id: 'C1.1', dim: 'C1', text: 'Describe required behaviour from the user’s perspective.' },
  { id: 'C1.2', dim: 'C1', text: 'Keep design, tech stack and task lists in separate plan/task artifacts.' },
  { id: 'C1.3', dim: 'C1', text: 'Make the transition to implementation traceable.' },
  // C2 Implementation-Planning Information
  { id: 'C2.1', dim: 'C2', text: 'Provide technical context and implementation foundations.' },
  { id: 'C2.2', dim: 'C2', text: 'State what each task is intended to produce.' },
  { id: 'C2.3', dim: 'C2', text: 'Trace requirements to implementation work.' },
  { id: 'C2.4', dim: 'C2', text: 'Specify data structures, interface contracts and their evolution.' },
]

// Paper's tertile cut-points on the 0–30 total.
export const TIERS = [
  { id: 'bottom', label: 'Bottom tertile', max: 18, note: 'Repos in this band spent 20.4% of commits on bug fixes.' },
  { id: 'middle', label: 'Middle tertile', max: 22, note: 'Between the paper’s top and bottom bands.' },
  { id: 'top',    label: 'Top tertile',    max: 30, note: 'Repos in this band spent 11.8% of commits on bug fixes.' },
]

export function tierFor(total) {
  return TIERS.find(t => total <= t.max) ?? TIERS[TIERS.length - 1]
}

export const RUBRIC = [
  'little or no evidence',
  'partial evidence',
  'mostly consistent evidence',
  'consistent evidence throughout',
]
