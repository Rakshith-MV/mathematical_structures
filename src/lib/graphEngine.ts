import { Context, Property, Statement, DomainData } from '../types';

export interface EquivalenceClass {
  id: string; // generated ID e.g. "eq-compact-seq-compact"
  label: string; // e.g. "Compact ⇔ Sequentially Compact"
  memberIds: string[];
}

export interface PathStep {
  fromProperty: Property;
  toProperty: Property;
  statement: Statement;
}

export interface DeductionPath {
  steps: PathStep[];
  requiredContextIds: string[];
  requiredContextNames: string[];
}

export class DisjointSetEngine {
  parent: Map<string, string> = new Map();

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      return x;
    }
    const p = this.parent.get(x)!;
    if (p !== x) {
      const root = this.find(p);
      this.parent.set(x, root);
      return root;
    }
    return x;
  }

  union(x: string, y: string): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      this.parent.set(rootX, rootY);
    }
  }
}

/**
 * Checks if context A is weaker than or equal to context B
 * (e.g., topological-spaces is weaker than t1-spaces, which is weaker than hausdorff-spaces, which is weaker than metric-spaces).
 */
export function isContextApplicable(statementContextId: string, currentContextId: string, contexts: Context[]): boolean {
  if (statementContextId === currentContextId) return true;
  if (statementContextId === 'topological-spaces') return true;

  const currentCtx = contexts.find(c => c.id === currentContextId);
  const stmtCtx = contexts.find(c => c.id === statementContextId);

  if (!currentCtx || !stmtCtx) return false;

  // If stmt requires properties, currentCtx must have them in its requiredProperties
  const stmtReqs = stmtCtx.requiredProperties || [];
  const currReqs = currentCtx.requiredProperties || [];

  return stmtReqs.every(r => currReqs.includes(r));
}

/**
 * Computes equivalence classes of properties under the given context.
 */
export function computeEquivalenceClasses(
  properties: Property[],
  statements: Statement[],
  contextId: string,
  contexts: Context[]
): EquivalenceClass[] {
  const dsu = new DisjointSetEngine();
  for (const p of properties) {
    dsu.find(p.id);
  }

  const applicableStatements = statements.filter(s =>
    isContextApplicable(s.context, contextId, contexts) && s.kind === 'equivalent'
  );

  for (const s of applicableStatements) {
    const all = [...s.from, ...s.to];
    for (let i = 1; i < all.length; i++) {
      dsu.union(all[0], all[i]);
    }
  }

  // Group by root
  const groups = new Map<string, string[]>();
  for (const p of properties) {
    const root = dsu.find(p.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(p.id);
  }

  const propMap = new Map(properties.map(p => [p.id, p]));
  const eqClasses: EquivalenceClass[] = [];

  for (const members of groups.values()) {
    if (members.length > 1) {
      const names = members.map(m => propMap.get(m)?.name || m);
      eqClasses.push({
        id: `eq-${members.sort().join('-')}`,
        label: names.join(' ⇔ '),
        memberIds: members
      });
    }
  }

  return eqClasses;
}

/**
 * Computes transitive reduction for strict implication statements.
 * Returns:
 * - reductionStatements: statements that form the minimal DAG
 * - impliedStatements: statements that are redundant / transitively implied
 */
export function computeTransitiveReduction(
  _properties: Property[],
  statements: Statement[],
  contextId: string,
  contexts: Context[]
): { reductionStatements: Statement[]; impliedStatements: Statement[] } {
  const applicable = statements.filter(
    s => isContextApplicable(s.context, contextId, contexts) && s.kind === 'implies' && s.from.length === 1 && s.to.length === 1
  );

  const reductionStatements: Statement[] = [];
  const impliedStatements: Statement[] = [];

  for (const stmt of applicable) {
    const from = stmt.from[0];
    const to = stmt.to[0];

    // Check if there is an alternate path from 'from' to 'to' without using this statement
    const visited = new Set<string>();
    const queue: string[] = [from];
    visited.add(from);
    let alternateFound = false;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === to && curr !== from) {
        alternateFound = true;
        break;
      }

      for (const other of applicable) {
        if (other.id === stmt.id) continue;
        if (other.from.includes(curr)) {
          for (const nxt of other.to) {
            if (!visited.has(nxt)) {
              visited.add(nxt);
              queue.push(nxt);
            }
          }
        }
      }
    }

    if (alternateFound) {
      impliedStatements.push(stmt);
    } else {
      reductionStatements.push(stmt);
    }
  }

  return { reductionStatements, impliedStatements };
}

/**
 * Finds all paths from property A to property B.
 * Returns each route along with the context assumptions needed.
 */
export function findAllPaths(
  fromId: string,
  toId: string,
  data: DomainData,
  maxDepth: number = 6
): DeductionPath[] {
  if (fromId === toId) return [];

  const propMap = new Map(data.properties.map(p => [p.id, p]));
  const ctxMap = new Map(data.contexts.map(c => [c.id, c]));

  // Build directed edges from statements (implies and equivalent)
  type Edge = { from: string; to: string; statement: Statement };
  const edges: Edge[] = [];

  for (const s of data.statements) {
    if (s.kind === 'implies') {
      for (const u of s.from) {
        for (const v of s.to) {
          edges.push({ from: u, to: v, statement: s });
        }
      }
    } else if (s.kind === 'equivalent') {
      const all = [...s.from, ...s.to];
      for (let i = 0; i < all.length; i++) {
        for (let j = 0; j < all.length; j++) {
          if (i !== j) {
            edges.push({ from: all[i], to: all[j], statement: s });
          }
        }
      }
    }
  }

  const results: DeductionPath[] = [];

  function dfs(currentId: string, visited: Set<string>, currentSteps: PathStep[]) {
    if (currentSteps.length > maxDepth) return;

    if (currentId === toId) {
      const reqContextIds = Array.from(new Set(currentSteps.map(st => st.statement.context)));
      const reqContextNames = reqContextIds.map(cId => ctxMap.get(cId)?.name || cId);
      results.push({
        steps: [...currentSteps],
        requiredContextIds: reqContextIds,
        requiredContextNames: reqContextNames
      });
      return;
    }

    const availableEdges = edges.filter(e => e.from === currentId && !visited.has(e.to));
    for (const edge of availableEdges) {
      const fromProp = propMap.get(edge.from);
      const toProp = propMap.get(edge.to);
      if (!fromProp || !toProp) continue;

      visited.add(edge.to);
      currentSteps.push({
        fromProperty: fromProp,
        toProperty: toProp,
        statement: edge.statement
      });

      dfs(edge.to, visited, currentSteps);

      currentSteps.pop();
      visited.delete(edge.to);
    }
  }

  const visited = new Set<string>([fromId]);
  dfs(fromId, visited, []);

  // Sort paths: shortest first, then by fewest context requirements
  results.sort((a, b) => {
    if (a.steps.length !== b.steps.length) return a.steps.length - b.steps.length;
    return a.requiredContextIds.length - b.requiredContextIds.length;
  });

  return results;
}

/**
 * Builds Cytoscape graph elements (nodes and edges).
 */
export function buildCytoscapeElements(params: {
  data: DomainData;
  activeContextId: string;
  showImpliedArrows: boolean;
  expandedEquivalenceClasses: Set<string>; // IDs of expanded equivalence classes
  highlightedPathStatementIds?: Set<string>;
  highlightedNodeIds?: Set<string>;
  unlockedNodeIds?: Set<string>; // For explore / fog of war mode
  unlockedStatementIds?: Set<string>; // For explore mode
  isExploreMode?: boolean;
}) {
  const {
    data,
    activeContextId,
    showImpliedArrows,
    expandedEquivalenceClasses,
    highlightedPathStatementIds = new Set(),
    highlightedNodeIds = new Set(),
    unlockedNodeIds = new Set(),
    unlockedStatementIds = new Set(),
    isExploreMode = false,
  } = params;

  const elements: any[] = [];
  const propMap = new Map(data.properties.map(p => [p.id, p]));

  // 1. Equivalence classes
  const eqClasses = computeEquivalenceClasses(data.properties, data.statements, activeContextId, data.contexts);
  const memberToEqClass = new Map<string, EquivalenceClass>();

  for (const eq of eqClasses) {
    for (const m of eq.memberIds) {
      memberToEqClass.set(m, eq);
    }
  }

  // 2. Nodes
  for (const prop of data.properties) {
    const eq = memberToEqClass.get(prop.id);
    const isInsideEq = !!eq;
    const isExpanded = eq ? expandedEquivalenceClasses.has(eq.id) : false;

    const isUnlocked = !isExploreMode || unlockedNodeIds.has(prop.id);
    const isHighlighted = highlightedNodeIds.has(prop.id);

    // If it belongs to an equivalence class that is collapsed, we don't add individual node
    // unless expanded. We will add the compound/meta node for the equivalence class instead.
    if (isInsideEq && !isExpanded) {
      // Handled in compound node loop below
      continue;
    }

    elements.push({
      group: 'nodes',
      data: {
        id: prop.id,
        label: isUnlocked ? prop.name : '???',
        rawName: prop.name,
        isUnlocked,
        isHighlighted,
        domain: prop.domain,
        definition: prop.definition,
        type: 'property',
        parent: isInsideEq && isExpanded ? eq.id : undefined,
      },
      classes: `${isHighlighted ? 'highlighted' : ''} ${!isUnlocked ? 'locked' : ''}`,
    });
  }

  // Add equivalence class compound / meta nodes
  for (const eq of eqClasses) {
    const isExpanded = expandedEquivalenceClasses.has(eq.id);
    const anyUnlocked = !isExploreMode || eq.memberIds.some(m => unlockedNodeIds.has(m));

    if (isExpanded) {
      // Parent compound node for expanded members
      elements.push({
        group: 'nodes',
        data: {
          id: eq.id,
          label: `Equivalence Class (${eq.memberIds.length})`,
          type: 'compound-parent',
          isExpanded: true,
          eqClassId: eq.id,
        },
        classes: 'compound-parent',
      });
    } else {
      // Collapsed meta node representing the entire class
      const memberNames = eq.memberIds
        .map(m => (isExploreMode && !unlockedNodeIds.has(m) ? '???' : propMap.get(m)?.name || m))
        .join(' ⇔ ');

      elements.push({
        group: 'nodes',
        data: {
          id: eq.id,
          label: memberNames,
          rawName: eq.label,
          type: 'equivalence-meta',
          memberIds: eq.memberIds,
          isExpanded: false,
          eqClassId: eq.id,
          isUnlocked: anyUnlocked,
        },
        classes: `equivalence-node ${!anyUnlocked ? 'locked' : ''}`,
      });
    }
  }

  // 3. Edges: Transitive reduction & context status
  const { impliedStatements } = computeTransitiveReduction(
    data.properties,
    data.statements,
    activeContextId,
    data.contexts
  );

  const impliedSet = new Set(impliedStatements.map(s => s.id));

  // Determine edge endpoints respecting collapsed equivalence classes
  function resolveNodeId(pId: string): string {
    const eq = memberToEqClass.get(pId);
    if (eq && !expandedEquivalenceClasses.has(eq.id)) {
      return eq.id;
    }
    return pId;
  }

  // Keep track of added edge endpoints to avoid duplicate multi-edges between collapsed classes
  const addedEdges = new Set<string>();

  for (const stmt of data.statements) {
    const isApplicableInActive = isContextApplicable(stmt.context, activeContextId, data.contexts);
    const isImplied = impliedSet.has(stmt.id);

    // If it is an implied arrow and user turned off implied arrows, skip
    if (isApplicableInActive && isImplied && !showImpliedArrows) {
      continue;
    }

    // Explore mode lock check
    const isUnlocked = !isExploreMode || unlockedStatementIds.has(stmt.id);

    // Process from and to
    for (const fromProp of stmt.from) {
      for (const toProp of stmt.to) {
        const source = resolveNodeId(fromProp);
        const target = resolveNodeId(toProp);

        // If both endpoints collapsed into same meta node, skip self-loop on meta node
        if (source === target && stmt.kind !== 'equivalent') {
          continue;
        }

        const edgeKey = `${stmt.id}-${source}-${target}`;
        if (addedEdges.has(edgeKey)) continue;
        addedEdges.add(edgeKey);

        const isHighlighted = highlightedPathStatementIds.has(stmt.id);
        const isStrongerContext = !isApplicableInActive;

        let edgeClass = stmt.kind; // 'implies' | 'equivalent' | 'not-implies'
        if (isStrongerContext) edgeClass += ' greyed-context';
        if (isImplied) edgeClass += ' implied-arrow';
        if (isHighlighted) edgeClass += ' highlighted-edge';
        if (!isUnlocked) edgeClass += ' locked-edge';

        elements.push({
          group: 'edges',
          data: {
            id: edgeKey,
            statementId: stmt.id,
            source,
            target,
            label: isStrongerContext
              ? `[Requires ${stmt.context}]`
              : stmt.kind === 'not-implies'
              ? '✗'
              : (stmt.name || ''),
            kind: stmt.kind,
            context: stmt.context,
            isStrongerContext,
            isImplied,
            isHighlighted,
            isUnlocked,
            statement: stmt,
          },
          classes: edgeClass,
        });
      }
    }
  }

  return elements;
}
