import { Context, Property, Statement, Counterexample, DomainData } from '../types';
import { isContextApplicable } from './graphEngine';

export type ArrowRelation = 'implies' | 'implied-by' | 'equivalent' | 'neither';

export interface QuizQuestion {
  id: string;
  propA: Property;
  propB: Property;
  context: Context;
  relation: ArrowRelation; // 'implies' (A => B), 'implied-by' (B => A), 'equivalent' (A <=> B), 'neither'
  explanation: string;
  forwardCounterexample?: Counterexample;
  backwardCounterexample?: Counterexample;
  counterexampleChoices?: Counterexample[]; // choices for witness
  correctCounterexampleId?: string;
}

export interface MissingEdgePuzzle {
  id: string;
  hiddenStatement: Statement;
  fromProperty: Property;
  toProperty: Property;
  context: Context;
  options: Statement[]; // 4 multiple choice options
  correctOptionId: string;
}

/**
 * Checks if propA implies propB in the given context based on data statements.
 */
export function isDerivable(
  fromId: string,
  toId: string,
  contextId: string,
  data: DomainData
): boolean {
  if (fromId === toId) return true;

  const applicableStatements = data.statements.filter(
    s => isContextApplicable(s.context, contextId, data.contexts)
  );

  // BFS reachability
  const visited = new Set<string>([fromId]);
  const queue = [fromId];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === toId) return true;

    for (const s of applicableStatements) {
      if (s.kind === 'implies' && s.from.length === 1 && s.from[0] === curr) {
        for (const next of s.to) {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      } else if (s.kind === 'equivalent') {
        const all = [...s.from, ...s.to];
        if (all.includes(curr)) {
          for (const next of all) {
            if (next !== curr && !visited.has(next)) {
              visited.add(next);
              queue.push(next);
            }
          }
        }
      }
    }
  }

  return false;
}

/**
 * Finds a counterexample in data that satisfies propA (and context assumptions) and fails propB.
 */
export function findCounterexampleRefutation(
  fromId: string,
  toId: string,
  contextId: string,
  data: DomainData
): Counterexample | undefined {
  const ctx = data.contexts.find(c => c.id === contextId);
  const requiredProps = ctx?.requiredProperties || [];

  return data.counterexamples.find(ce => {
    const satisfiesContext = requiredProps.every(req => ce.satisfies.includes(req));
    return satisfiesContext && ce.satisfies.includes(fromId) && ce.fails.includes(toId);
  });
}

/**
 * Determines the exact arrow relation between A and B, or null if undetermined (unknown).
 */
export function determinePairRelation(
  propA: Property,
  propB: Property,
  context: Context,
  data: DomainData
): {
  relation: ArrowRelation;
  forwardCE?: Counterexample;
  backwardCE?: Counterexample;
} | null {
  const fwdDerivable = isDerivable(propA.id, propB.id, context.id, data);
  const bwdDerivable = isDerivable(propB.id, propA.id, context.id, data);

  const fwdCE = fwdDerivable ? undefined : findCounterexampleRefutation(propA.id, propB.id, context.id, data);
  const bwdCE = bwdDerivable ? undefined : findCounterexampleRefutation(propB.id, propA.id, context.id, data);

  // If forward is neither derivable nor refuted by counterexample, it is unknown!
  if (!fwdDerivable && !fwdCE) {
    return null;
  }

  // If backward is neither derivable nor refuted by counterexample, it is unknown!
  if (!bwdDerivable && !bwdCE) {
    return null;
  }

  if (fwdDerivable && bwdDerivable) {
    return { relation: 'equivalent' };
  } else if (fwdDerivable && !bwdDerivable) {
    return { relation: 'implies', backwardCE: bwdCE };
  } else if (!fwdDerivable && bwdDerivable) {
    return { relation: 'implied-by', forwardCE: fwdCE };
  } else {
    // neither implies
    return {
      relation: 'neither',
      forwardCE: fwdCE,
      backwardCE: bwdCE,
    };
  }
}

/**
 * Generates quiz questions for a given domain and context.
 * GUARANTEES: Never asks about a pair whose relation is undetermined by the data.
 */
export function generateQuizQuestions(
  data: DomainData,
  contextId: string,
  count: number = 10
): QuizQuestion[] {
  const context = data.contexts.find(c => c.id === contextId) || data.contexts[0];
  const questions: QuizQuestion[] = [];
  const properties = data.properties;

  // Generate candidate pairs
  const candidates: {
    propA: Property;
    propB: Property;
    relation: ArrowRelation;
    forwardCE?: Counterexample;
    backwardCE?: Counterexample;
  }[] = [];

  for (let i = 0; i < properties.length; i++) {
    for (let j = i + 1; j < properties.length; j++) {
      const pA = properties[i];
      const pB = properties[j];

      const evaluated = determinePairRelation(pA, pB, context, data);
      if (evaluated !== null) {
        candidates.push({
          propA: pA,
          propB: pB,
          relation: evaluated.relation,
          forwardCE: evaluated.forwardCE,
          backwardCE: evaluated.backwardCE,
        });
      }
    }
  }

  // Shuffle candidates
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  for (const item of selected) {
    let explanation = '';
    let correctCE: Counterexample | undefined;

    if (item.relation === 'equivalent') {
      explanation = `${item.propA.name} is equivalent to ${item.propB.name} in ${context.name}. Both imply each other.`;
    } else if (item.relation === 'implies') {
      explanation = `${item.propA.name} implies ${item.propB.name}. The converse fails; e.g. witnessed by "${item.backwardCE?.name}".`;
      correctCE = item.backwardCE;
    } else if (item.relation === 'implied-by') {
      explanation = `${item.propB.name} implies ${item.propA.name}. The converse fails; e.g. witnessed by "${item.forwardCE?.name}".`;
      correctCE = item.forwardCE;
    } else {
      explanation = `Neither property implies the other in ${context.name}. Refuted by "${item.forwardCE?.name}" (${item.propA.name} ⇏ ${item.propB.name}) and "${item.backwardCE?.name}" (${item.propB.name} ⇏ ${item.propA.name}).`;
      correctCE = item.forwardCE || item.backwardCE;
    }

    // Pick 3 distractor counterexamples for the selection step
    const distractors = data.counterexamples
      .filter(ce => ce.id !== correctCE?.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const counterexampleChoices = correctCE
      ? [correctCE, ...distractors].sort(() => Math.random() - 0.5)
      : undefined;

    questions.push({
      id: `quiz-${item.propA.id}-${item.propB.id}-${context.id}`,
      propA: item.propA,
      propB: item.propB,
      context,
      relation: item.relation,
      explanation,
      forwardCounterexample: item.forwardCE,
      backwardCounterexample: item.backwardCE,
      counterexampleChoices,
      correctCounterexampleId: correctCE?.id,
    });
  }

  return questions;
}

/**
 * Generates missing-edge puzzles:
 * Hides one theorem edge and gives 4 options to identify which theorem was hidden.
 */
export function generateMissingEdgePuzzles(
  data: DomainData,
  contextId: string,
  count: number = 5
): MissingEdgePuzzle[] {
  const context = data.contexts.find(c => c.id === contextId) || data.contexts[0];
  const applicable = data.statements.filter(
    s => isContextApplicable(s.context, contextId, data.contexts) && s.from.length === 1 && s.to.length === 1
  );

  const shuffled = [...applicable].sort(() => Math.random() - 0.5).slice(0, count);
  const propMap = new Map(data.properties.map(p => [p.id, p]));
  const puzzles: MissingEdgePuzzle[] = [];

  for (const stmt of shuffled) {
    const fromProp = propMap.get(stmt.from[0]);
    const toProp = propMap.get(stmt.to[0]);
    if (!fromProp || !toProp) continue;

    // Pick 3 distractors from all statements
    const distractors = data.statements
      .filter(s => s.id !== stmt.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [stmt, ...distractors].sort(() => Math.random() - 0.5);

    puzzles.push({
      id: `puzzle-${stmt.id}`,
      hiddenStatement: stmt,
      fromProperty: fromProp,
      toProperty: toProp,
      context,
      options,
      correctOptionId: stmt.id,
    });
  }

  return puzzles;
}
