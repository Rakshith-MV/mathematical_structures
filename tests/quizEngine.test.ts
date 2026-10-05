import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  determinePairRelation,
  generateQuizQuestions,
  isDerivable,
  findCounterexampleRefutation,
} from '../src/lib/quizEngine';
import { loadDomainData } from '../scripts/validate';
import { DomainData, Context, Property, Counterexample } from '../src/types';

describe('Quiz Engine', () => {
  const mockContext: Context = { id: 'ctx1', name: 'Context 1', assumptions: [], requiredProperties: [] };

  const propA: Property = { id: 'pA', name: 'A', domain: 'test', definition: 'def A' };
  const propB: Property = { id: 'pB', name: 'B', domain: 'test', definition: 'def B' };

  it('never asks about an edge whose truth is undetermined (unknown ≠ false)', () => {
    // pA and pB have NO statement and NO counterexample
    const domainData: DomainData = {
      domain: 'test',
      contexts: [mockContext],
      properties: [propA, propB],
      statements: [],
      counterexamples: [],
    };

    // determinePairRelation should return null because both directions are undetermined
    const relation = determinePairRelation(propA, propB, mockContext, domainData);
    expect(relation).toBeNull();

    // generateQuizQuestions must NOT include any questions for this domain
    const questions = generateQuizQuestions(domainData, 'ctx1', 10);
    expect(questions).toHaveLength(0);
  });

  it('rejects pair if forward is derivable but backward is neither derivable nor refuted by counterexample', () => {
    // pA => pB, but we don't know whether pB => pA is true or false (no backward CE, no backward implication)
    const domainData: DomainData = {
      domain: 'test',
      contexts: [mockContext],
      properties: [propA, propB],
      statements: [
        { id: 's1', kind: 'implies', from: ['pA'], to: ['pB'], context: 'ctx1', source: 't', verified: true },
      ],
      counterexamples: [],
    };

    const relation = determinePairRelation(propA, propB, mockContext, domainData);
    expect(relation).toBeNull(); // backward is undetermined!
  });

  it('accepts pair when pA => pB and pB has a counterexample refuting pB => pA', () => {
    const ce: Counterexample = {
      id: 'ce-b-not-a',
      name: 'Counterexample',
      description: 'Satisfies B fails A',
      satisfies: ['pB'],
      fails: ['pA'],
      source: 'test',
      verified: true,
    };

    const domainData: DomainData = {
      domain: 'test',
      contexts: [mockContext],
      properties: [propA, propB],
      statements: [
        { id: 's1', kind: 'implies', from: ['pA'], to: ['pB'], context: 'ctx1', source: 't', verified: true },
      ],
      counterexamples: [ce],
    };

    const relation = determinePairRelation(propA, propB, mockContext, domainData);
    expect(relation).not.toBeNull();
    expect(relation?.relation).toBe('implies');
    expect(relation?.backwardCE?.id).toBe('ce-b-not-a');

    const questions = generateQuizQuestions(domainData, 'ctx1', 10);
    expect(questions.length).toBeGreaterThanOrEqual(1);
    expect(questions[0].relation).toBe('implies');
    expect(questions[0].correctCounterexampleId).toBe('ce-b-not-a');
  });

  it('generates strictly determined questions on topology seed data', () => {
    const topologyDir = path.resolve(__dirname, '../data/topology');
    const data = loadDomainData(topologyDir);

    const questions = generateQuizQuestions(data, 'topological-spaces', 15);
    expect(questions.length).toBeGreaterThan(0);

    for (const q of questions) {
      // Check that relation is one of valid relations
      expect(['implies', 'implied-by', 'equivalent', 'neither']).toContain(q.relation);

      // Verify that the answer is rigorously supported
      if (q.relation === 'implies') {
        expect(isDerivable(q.propA.id, q.propB.id, q.context.id, data)).toBe(true);
        expect(findCounterexampleRefutation(q.propB.id, q.propA.id, q.context.id, data)).toBeDefined();
      } else if (q.relation === 'implied-by') {
        expect(isDerivable(q.propB.id, q.propA.id, q.context.id, data)).toBe(true);
        expect(findCounterexampleRefutation(q.propA.id, q.propB.id, q.context.id, data)).toBeDefined();
      } else if (q.relation === 'equivalent') {
        expect(isDerivable(q.propA.id, q.propB.id, q.context.id, data)).toBe(true);
        expect(isDerivable(q.propB.id, q.propA.id, q.context.id, data)).toBe(true);
      } else if (q.relation === 'neither') {
        expect(findCounterexampleRefutation(q.propA.id, q.propB.id, q.context.id, data)).toBeDefined();
        expect(findCounterexampleRefutation(q.propB.id, q.propA.id, q.context.id, data)).toBeDefined();
      }
    }
  });
});
