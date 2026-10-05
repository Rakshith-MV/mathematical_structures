export type Context = {
  id: string;
  name: string;
  assumptions: string[];
  requiredProperties?: string[]; // property IDs required by this context
};

export type Property = {
  id: string;
  name: string;
  domain: string;
  definition: string;        // LaTeX/markdown
  equivalentForms?: string[];// alternative characterizations
  examples?: string[];
  nonExamples?: string[];
  notes?: string;            // geometric / historical context
};

export type StatementKind = 'implies' | 'equivalent' | 'not-implies';

export type Statement = {
  id: string;
  kind: StatementKind;
  from: string[];            // property ids
  to: string[];              // property ids (for equivalent: all mutually equivalent)
  context: string;           // Context id
  name?: string;             // e.g. "Heine–Borel"
  proofSketch?: string;      // key idea + which lemma does the work
  keyLemma?: string;
  witness?: string;          // required for not-implies: Counterexample id
  source: string;            // textbook / paper reference
  verified: boolean;
  leanName?: string;         // optional Mathlib reference for future
};

export type Counterexample = {
  id: string;
  name: string;
  description: string;
  satisfies: string[];       // property ids
  fails: string[];           // property ids
  source: string;
  verified: boolean;
};

export type DomainData = {
  domain: string;
  contexts: Context[];
  properties: Property[];
  statements: Statement[];
  counterexamples: Counterexample[];
};

export type ValidationIssue = {
  type: 'error' | 'warning';
  message: string;
  domain?: string;
  entityId?: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  unverifiedCount: number;
};
