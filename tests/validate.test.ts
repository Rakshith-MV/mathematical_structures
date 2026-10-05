import { describe, it, expect } from 'vitest';
import path from 'path';
import { loadDomainData } from '../scripts/validate';
import { validateDomainData } from '../src/lib/validator';
import { DomainData } from '../src/types';

describe('Domain Data Validation', () => {
  it('passes cleanly on seed topology data with 0 errors and accurate unverified count', () => {
    const topologyDir = path.resolve(__dirname, '../data/topology');
    const data = loadDomainData(topologyDir);
    const result = validateDomainData(data);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.unverifiedCount).toBe(32); // 26 statements + 6 counterexamples
  });

  it('fails when a statement references an unknown property', () => {
    const data: DomainData = {
      domain: 'test-domain',
      contexts: [{ id: 'ctx1', name: 'Context 1', assumptions: [] }],
      properties: [{ id: 'p1', name: 'Prop 1', domain: 'test', definition: 'def1' }],
      counterexamples: [],
      statements: [
        {
          id: 's1',
          kind: 'implies',
          from: ['p1'],
          to: ['p_nonexistent'],
          context: 'ctx1',
          source: 'test',
          verified: false,
        },
      ],
    };

    const result = validateDomainData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('unknown \'to\' property "p_nonexistent"'))).toBe(true);
  });

  it('fails when a statement references an unknown context', () => {
    const data: DomainData = {
      domain: 'test-domain',
      contexts: [{ id: 'ctx1', name: 'Context 1', assumptions: [] }],
      properties: [
        { id: 'p1', name: 'Prop 1', domain: 'test', definition: 'def1' },
        { id: 'p2', name: 'Prop 2', domain: 'test', definition: 'def2' },
      ],
      counterexamples: [],
      statements: [
        {
          id: 's1',
          kind: 'implies',
          from: ['p1'],
          to: ['p2'],
          context: 'unknown_ctx',
          source: 'test',
          verified: false,
        },
      ],
    };

    const result = validateDomainData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('unknown context "unknown_ctx"'))).toBe(true);
  });

  it('fails when not-implies statement lacks a witness', () => {
    const data: DomainData = {
      domain: 'test-domain',
      contexts: [{ id: 'ctx1', name: 'Context 1', assumptions: [] }],
      properties: [
        { id: 'p1', name: 'Prop 1', domain: 'test', definition: 'def1' },
        { id: 'p2', name: 'Prop 2', domain: 'test', definition: 'def2' },
      ],
      counterexamples: [],
      statements: [
        {
          id: 's1',
          kind: 'not-implies',
          from: ['p1'],
          to: ['p2'],
          context: 'ctx1',
          source: 'test',
          verified: false,
        },
      ],
    };

    const result = validateDomainData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('has no witness specified'))).toBe(true);
  });

  it('fails when not-implies witness does not fail the target property', () => {
    const data: DomainData = {
      domain: 'test-domain',
      contexts: [{ id: 'ctx1', name: 'Context 1', assumptions: [] }],
      properties: [
        { id: 'p1', name: 'Prop 1', domain: 'test', definition: 'def1' },
        { id: 'p2', name: 'Prop 2', domain: 'test', definition: 'def2' },
      ],
      counterexamples: [
        {
          id: 'ce1',
          name: 'Counterexample 1',
          description: 'desc',
          satisfies: ['p1'],
          fails: [], // Does not fail p2!
          source: 'test',
          verified: false,
        },
      ],
      statements: [
        {
          id: 's1',
          kind: 'not-implies',
          from: ['p1'],
          to: ['p2'],
          context: 'ctx1',
          witness: 'ce1',
          source: 'test',
          verified: false,
        },
      ],
    };

    const result = validateDomainData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('does not fail \'to\' property "p2"'))).toBe(true);
  });

  it('fails when a strict implies cycle exists', () => {
    const data: DomainData = {
      domain: 'test-domain',
      contexts: [{ id: 'ctx1', name: 'Context 1', assumptions: [] }],
      properties: [
        { id: 'p1', name: 'Prop 1', domain: 'test', definition: 'def1' },
        { id: 'p2', name: 'Prop 2', domain: 'test', definition: 'def2' },
        { id: 'p3', name: 'Prop 3', domain: 'test', definition: 'def3' },
      ],
      counterexamples: [],
      statements: [
        { id: 's1', kind: 'implies', from: ['p1'], to: ['p2'], context: 'ctx1', source: 't', verified: true },
        { id: 's2', kind: 'implies', from: ['p2'], to: ['p3'], context: 'ctx1', source: 't', verified: true },
        { id: 's3', kind: 'implies', from: ['p3'], to: ['p1'], context: 'ctx1', source: 't', verified: true },
      ],
    };

    const result = validateDomainData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('Cycle detected among strict \'implies\' edges'))).toBe(true);
  });

  it('warns when an inferable edge is stored explicitly (transitive reduction check)', () => {
    const data: DomainData = {
      domain: 'test-domain',
      contexts: [{ id: 'ctx1', name: 'Context 1', assumptions: [] }],
      properties: [
        { id: 'p1', name: 'Prop 1', domain: 'test', definition: 'def1' },
        { id: 'p2', name: 'Prop 2', domain: 'test', definition: 'def2' },
        { id: 'p3', name: 'Prop 3', domain: 'test', definition: 'def3' },
      ],
      counterexamples: [],
      statements: [
        { id: 's1', kind: 'implies', from: ['p1'], to: ['p2'], context: 'ctx1', source: 't', verified: true },
        { id: 's2', kind: 'implies', from: ['p2'], to: ['p3'], context: 'ctx1', source: 't', verified: true },
        { id: 's3_redundant', kind: 'implies', from: ['p1'], to: ['p3'], context: 'ctx1', source: 't', verified: true },
      ],
    };

    const result = validateDomainData(data);
    expect(result.valid).toBe(true); // Redundancy is a warning, not a fatal build error
    expect(result.warnings.some(w => w.message.includes('is redundant and can be inferred'))).toBe(true);
  });

  it('warns when a counterexample contradicts a derivable implication in its context', () => {
    const data: DomainData = {
      domain: 'test-domain',
      contexts: [{ id: 'ctx1', name: 'Context 1', assumptions: [] }],
      properties: [
        { id: 'p1', name: 'Prop 1', domain: 'test', definition: 'def1' },
        { id: 'p2', name: 'Prop 2', domain: 'test', definition: 'def2' },
      ],
      counterexamples: [
        {
          id: 'ce1',
          name: 'Contradictory CE',
          description: 'Claims p1 does not imply p2, but s1 proves p1 implies p2',
          satisfies: ['p1'],
          fails: ['p2'],
          source: 'test',
          verified: false,
        },
      ],
      statements: [
        { id: 's1', kind: 'implies', from: ['p1'], to: ['p2'], context: 'ctx1', source: 't', verified: true },
        { id: 's2', kind: 'not-implies', from: ['p1'], to: ['p2'], context: 'ctx1', witness: 'ce1', source: 't', verified: false },
      ],
    };

    const result = validateDomainData(data);
    expect(result.warnings.some(w => w.message.includes('Potential contradiction'))).toBe(true);
  });
});
