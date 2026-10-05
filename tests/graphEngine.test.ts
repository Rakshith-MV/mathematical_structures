import { describe, it, expect } from 'vitest';
import {
  computeEquivalenceClasses,
  computeTransitiveReduction,
  findAllPaths,
  isContextApplicable,
} from '../src/lib/graphEngine';
import { Context, Property, Statement, DomainData } from '../src/types';

describe('Graph Engine Algorithms', () => {
  const mockContexts: Context[] = [
    { id: 'topological-spaces', name: 'General', assumptions: [], requiredProperties: [] },
    { id: 't1-spaces', name: 'T1', assumptions: [], requiredProperties: ['t1'] },
    { id: 'hausdorff-spaces', name: 'Hausdorff', assumptions: [], requiredProperties: ['t2'] },
    { id: 'metric-spaces', name: 'Metric', assumptions: [], requiredProperties: ['metrizable'] },
  ];

  const mockProperties: Property[] = [
    { id: 'pA', name: 'Property A', domain: 'test', definition: 'def A' },
    { id: 'pB', name: 'Property B', domain: 'test', definition: 'def B' },
    { id: 'pC', name: 'Property C', domain: 'test', definition: 'def C' },
    { id: 'pD', name: 'Property D', domain: 'test', definition: 'def D' },
  ];

  describe('isContextApplicable', () => {
    it('allows general topological statements in any context', () => {
      expect(isContextApplicable('topological-spaces', 'metric-spaces', mockContexts)).toBe(true);
      expect(isContextApplicable('topological-spaces', 't1-spaces', mockContexts)).toBe(true);
    });

    it('does not allow metric space statements in general topological context', () => {
      expect(isContextApplicable('metric-spaces', 'topological-spaces', mockContexts)).toBe(false);
    });

    it('allows identical context', () => {
      expect(isContextApplicable('hausdorff-spaces', 'hausdorff-spaces', mockContexts)).toBe(true);
    });
  });

  describe('computeEquivalenceClasses', () => {
    it('collapses properties linked by equivalence statements in context', () => {
      const statements: Statement[] = [
        {
          id: 'eq1',
          kind: 'equivalent',
          from: ['pA'],
          to: ['pB', 'pC'],
          context: 'metric-spaces',
          source: 'test',
          verified: true,
        },
      ];

      // In metric-spaces, pA, pB, pC form one class
      const eqInMetric = computeEquivalenceClasses(mockProperties, statements, 'metric-spaces', mockContexts);
      expect(eqInMetric).toHaveLength(1);
      expect(eqInMetric[0].memberIds.sort()).toEqual(['pA', 'pB', 'pC']);

      // In topological-spaces, eq1 is not applicable
      const eqInGeneral = computeEquivalenceClasses(mockProperties, statements, 'topological-spaces', mockContexts);
      expect(eqInGeneral).toHaveLength(0);
    });
  });

  describe('computeTransitiveReduction', () => {
    it('separates reduction statements from redundant implied statements', () => {
      const statements: Statement[] = [
        { id: 's1', kind: 'implies', from: ['pA'], to: ['pB'], context: 'topological-spaces', source: 't', verified: true },
        { id: 's2', kind: 'implies', from: ['pB'], to: ['pC'], context: 'topological-spaces', source: 't', verified: true },
        { id: 's3_implied', kind: 'implies', from: ['pA'], to: ['pC'], context: 'topological-spaces', source: 't', verified: true },
      ];

      const { reductionStatements, impliedStatements } = computeTransitiveReduction(
        mockProperties,
        statements,
        'topological-spaces',
        mockContexts
      );

      expect(reductionStatements.map(s => s.id)).toEqual(['s1', 's2']);
      expect(impliedStatements.map(s => s.id)).toEqual(['s3_implied']);
    });
  });

  describe('findAllPaths', () => {
    it('finds paths from start to target and lists required context assumptions', () => {
      const domainData: DomainData = {
        domain: 'test',
        contexts: mockContexts,
        properties: mockProperties,
        counterexamples: [],
        statements: [
          { id: 's1', kind: 'implies', from: ['pA'], to: ['pB'], context: 'topological-spaces', source: 't', verified: true },
          { id: 's2', kind: 'implies', from: ['pB'], to: ['pD'], context: 'metric-spaces', source: 't', verified: true },
          { id: 's3', kind: 'implies', from: ['pA'], to: ['pC'], context: 'topological-spaces', source: 't', verified: true },
          { id: 's4', kind: 'implies', from: ['pC'], to: ['pD'], context: 'hausdorff-spaces', source: 't', verified: true },
        ],
      };

      const paths = findAllPaths('pA', 'pD', domainData);
      expect(paths.length).toBe(2);

      // Check routes
      const route1 = paths.find(p => p.steps.some(st => st.toProperty.id === 'pB'));
      const route2 = paths.find(p => p.steps.some(st => st.toProperty.id === 'pC'));

      expect(route1).toBeDefined();
      expect(route1?.requiredContextIds).toContain('metric-spaces');

      expect(route2).toBeDefined();
      expect(route2?.requiredContextIds).toContain('hausdorff-spaces');
    });

    it('returns empty array when no path exists', () => {
      const domainData: DomainData = {
        domain: 'test',
        contexts: mockContexts,
        properties: mockProperties,
        counterexamples: [],
        statements: [
          { id: 's1', kind: 'implies', from: ['pA'], to: ['pB'], context: 'topological-spaces', source: 't', verified: true },
        ],
      };

      const paths = findAllPaths('pB', 'pA', domainData);
      expect(paths).toEqual([]);
    });
  });
});
