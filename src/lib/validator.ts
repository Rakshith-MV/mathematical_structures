import { Counterexample, DomainData, ValidationResult, ValidationIssue } from '../types';

export class DisjointSet {
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

export function validateDomainData(data: DomainData): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const domain = data.domain;

  // 1. Check duplicate IDs
  const contextIds = new Set<string>();
  for (const c of data.contexts) {
    if (contextIds.has(c.id)) {
      errors.push({ type: 'error', message: `Duplicate context ID: "${c.id}"`, domain, entityId: c.id });
    }
    contextIds.add(c.id);
  }

  const propertyIds = new Set<string>();
  for (const p of data.properties) {
    if (propertyIds.has(p.id)) {
      errors.push({ type: 'error', message: `Duplicate property ID: "${p.id}"`, domain, entityId: p.id });
    }
    propertyIds.add(p.id);
  }

  const counterexampleIds = new Set<string>();
  const counterexampleMap = new Map<string, Counterexample>();
  for (const ce of data.counterexamples) {
    if (counterexampleIds.has(ce.id)) {
      errors.push({ type: 'error', message: `Duplicate counterexample ID: "${ce.id}"`, domain, entityId: ce.id });
    }
    counterexampleIds.add(ce.id);
    counterexampleMap.set(ce.id, ce);
  }

  const statementIds = new Set<string>();
  for (const s of data.statements) {
    if (statementIds.has(s.id)) {
      errors.push({ type: 'error', message: `Duplicate statement ID: "${s.id}"`, domain, entityId: s.id });
    }
    statementIds.add(s.id);
  }

  // 2. Validate Counterexamples reference existing properties
  for (const ce of data.counterexamples) {
    for (const pId of ce.satisfies) {
      if (!propertyIds.has(pId)) {
        errors.push({
          type: 'error',
          message: `Counterexample "${ce.id}" satisfies unknown property "${pId}"`,
          domain,
          entityId: ce.id
        });
      }
    }
    for (const pId of ce.fails) {
      if (!propertyIds.has(pId)) {
        errors.push({
          type: 'error',
          message: `Counterexample "${ce.id}" fails unknown property "${pId}"`,
          domain,
          entityId: ce.id
        });
      }
    }
    // Check if counterexample satisfies and fails the same property
    for (const pId of ce.satisfies) {
      if (ce.fails.includes(pId)) {
        errors.push({
          type: 'error',
          message: `Counterexample "${ce.id}" claims to both satisfy and fail property "${pId}"`,
          domain,
          entityId: ce.id
        });
      }
    }
  }

  // 3. Validate Statements reference existing contexts, properties, witnesses
  for (const s of data.statements) {
    if (!contextIds.has(s.context)) {
      errors.push({
        type: 'error',
        message: `Statement "${s.id}" references unknown context "${s.context}"`,
        domain,
        entityId: s.id
      });
    }

    for (const pId of s.from) {
      if (!propertyIds.has(pId)) {
        errors.push({
          type: 'error',
          message: `Statement "${s.id}" references unknown 'from' property "${pId}"`,
          domain,
          entityId: s.id
        });
      }
    }

    for (const pId of s.to) {
      if (!propertyIds.has(pId)) {
        errors.push({
          type: 'error',
          message: `Statement "${s.id}" references unknown 'to' property "${pId}"`,
          domain,
          entityId: s.id
        });
      }
    }

    // Check not-implies requirements
    if (s.kind === 'not-implies') {
      if (!s.witness) {
        errors.push({
          type: 'error',
          message: `Statement "${s.id}" is 'not-implies' but has no witness specified`,
          domain,
          entityId: s.id
        });
      } else {
        const ce = counterexampleMap.get(s.witness);
        if (!ce) {
          errors.push({
            type: 'error',
            message: `Statement "${s.id}" references unknown witness counterexample "${s.witness}"`,
            domain,
            entityId: s.id
          });
        } else {
          // Witness must satisfy all s.from and fail all s.to
          for (const fromId of s.from) {
            if (!ce.satisfies.includes(fromId)) {
              errors.push({
                type: 'error',
                message: `Statement "${s.id}" witness "${ce.id}" does not satisfy 'from' property "${fromId}"`,
                domain,
                entityId: s.id
              });
            }
          }
          for (const toId of s.to) {
            if (!ce.fails.includes(toId)) {
              errors.push({
                type: 'error',
                message: `Statement "${s.id}" witness "${ce.id}" does not fail 'to' property "${toId}"`,
                domain,
                entityId: s.id
              });
            }
          }
        }
      }
    }
  }

  // Count unverified statements & counterexamples
  let unverifiedCount = 0;
  for (const s of data.statements) {
    if (!s.verified) unverifiedCount++;
  }
  for (const ce of data.counterexamples) {
    if (!ce.verified) unverifiedCount++;
  }

  // If there are basic missing ID errors, skip deeper graph analysis to avoid crashing on missing nodes
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      unverifiedCount
    };
  }

  // 4. Check for cycles among strict `implies` edges once `equivalent` groups are collapsed.
  // Group by context: cycles should be checked per context.
  // If an implication holds in context C1, it also holds in any stronger context C2 that includes C1 assumptions.
  // For simplicity and correctness, check each context's implication graph.
  for (const ctx of data.contexts) {
    const dsu = new DisjointSet();
    for (const pId of propertyIds) {
      dsu.find(pId);
    }

    // Collapse equivalence classes in this context
    // Statements applicable in this context: those with s.context === ctx.id
    const applicableStatements = data.statements.filter(s => s.context === ctx.id);

    for (const s of applicableStatements) {
      if (s.kind === 'equivalent') {
        const allProps = [...s.from, ...s.to];
        for (let i = 1; i < allProps.length; i++) {
          dsu.union(allProps[0], allProps[i]);
        }
      }
    }

    // Build directed adjacency between equivalence classes for strict implies
    const adj = new Map<string, Set<string>>();
    for (const pId of propertyIds) {
      const root = dsu.find(pId);
      if (!adj.has(root)) adj.set(root, new Set());
    }

    for (const s of applicableStatements) {
      if (s.kind === 'implies' && s.from.length === 1) {
        const u = s.from[0];
        for (const v of s.to) {
          const rootU = dsu.find(u);
          const rootV = dsu.find(v);
          if (rootU !== rootV) {
            adj.get(rootU)!.add(rootV);
          }
        }
      }
    }

    // Detect cycles using DFS (white=0, gray=1, black=2)
    const color = new Map<string, number>();
    const parentMap = new Map<string, string>();
    let cycleFound: string[] | null = null;

    function dfs(u: string): boolean {
      color.set(u, 1);
      const neighbors = adj.get(u) || new Set();
      for (const v of neighbors) {
        if (color.get(v) === 1) {
          // cycle found
          cycleFound = [u, v];
          return true;
        }
        if (color.get(v) === undefined || color.get(v) === 0) {
          parentMap.set(v, u);
          if (dfs(v)) return true;
        }
      }
      color.set(u, 2);
      return false;
    }

    for (const node of adj.keys()) {
      if (!color.has(node) || color.get(node) === 0) {
        if (dfs(node)) break;
      }
    }

    if (cycleFound) {
      errors.push({
        type: 'error',
        message: `Cycle detected among strict 'implies' edges in context "${ctx.id}" involving equivalence classes around "${cycleFound[0]}" and "${cycleFound[1]}"`,
        domain,
        entityId: ctx.id
      });
    }
  }

  // 5. Transitive reduction check: Warn on any inferable edge that is also stored explicitly
  // (store only the transitive reduction; infer the rest)
  for (const ctx of data.contexts) {
    const applicableStatements = data.statements.filter(s => s.context === ctx.id);

    // Build reachability for implies / equivalent statements
    // We want to check: if there is an explicit statement A -> B (single from, single to),
    // is there an alternate path from A to B that does not use this statement?
    for (const stmt of applicableStatements) {
      if (stmt.kind === 'implies' && stmt.from.length === 1 && stmt.to.length === 1) {
        const from = stmt.from[0];
        const to = stmt.to[0];

        // Search for alternate path without using stmt.id
        const visited = new Set<string>();
        const queue: string[] = [from];
        visited.add(from);

        let alternatePathFound = false;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          if (curr === to && curr !== from) {
            alternatePathFound = true;
            break;
          }

          for (const s of applicableStatements) {
            if (s.id === stmt.id) continue; // skip this edge

            if (s.kind === 'implies') {
              if (s.from.includes(curr)) {
                for (const nxt of s.to) {
                  if (!visited.has(nxt)) {
                    visited.add(nxt);
                    queue.push(nxt);
                  }
                }
              }
            } else if (s.kind === 'equivalent') {
              const allProps = [...s.from, ...s.to];
              if (allProps.includes(curr)) {
                for (const nxt of allProps) {
                  if (nxt !== curr && !visited.has(nxt)) {
                    visited.add(nxt);
                    queue.push(nxt);
                  }
                }
              }
            }
          }
        }

        if (alternatePathFound) {
          warnings.push({
            type: 'warning',
            message: `Statement "${stmt.id}" (${from} ⇒ ${to}) in context "${ctx.id}" is redundant and can be inferred from other statements (prefer transitive reduction)`,
            domain,
            entityId: stmt.id
          });
        }
      }
    }
  }

  // 6. Contradiction check: Warn if a Counterexample refutes an implication that is derivable from stored edges
  for (const ctx of data.contexts) {
    const applicableStatements = data.statements.filter(s => s.context === ctx.id);

    // Build full transitive closure of implications in this context
    // Prop A -> Prop B
    const closure = new Map<string, Set<string>>();
    for (const p of data.properties) {
      closure.set(p.id, new Set([p.id]));
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (const s of applicableStatements) {
        if (s.kind === 'implies') {
          // If all s.from are in closure of some root X, then all s.to are also in closure of X
          for (const root of propertyIds) {
            const rootClosure = closure.get(root)!;
            const hasAllFrom = s.from.every(f => rootClosure.has(f));
            if (hasAllFrom) {
              for (const t of s.to) {
                if (!rootClosure.has(t)) {
                  rootClosure.add(t);
                  changed = true;
                }
              }
            }
          }
        } else if (s.kind === 'equivalent') {
          const allProps = [...s.from, ...s.to];
          for (const root of propertyIds) {
            const rootClosure = closure.get(root)!;
            const hasAny = allProps.some(p => rootClosure.has(p));
            if (hasAny) {
              for (const p of allProps) {
                if (!rootClosure.has(p)) {
                  rootClosure.add(p);
                  changed = true;
                }
              }
            }
          }
        }
      }
    }

    // Now check counterexamples against closure
    // A counterexample is only relevant to context ctx if it satisfies all of ctx.requiredProperties
    const required = ctx.requiredProperties || [];
    for (const ce of data.counterexamples) {
      const satisfiesContext = required.every(reqProp => ce.satisfies.includes(reqProp));
      if (!satisfiesContext) continue;

      for (const sat of ce.satisfies) {
        const satClosure = closure.get(sat);
        if (!satClosure) continue;
        for (const fail of ce.fails) {
          if (satClosure.has(fail)) {
            warnings.push({
              type: 'warning',
              message: `Potential contradiction in context "${ctx.id}": Counterexample "${ce.id}" satisfies "${sat}" but fails "${fail}", yet "${sat}" ⇒ "${fail}" is derivable from statements`,
              domain,
              entityId: ce.id
            });
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    unverifiedCount
  };
}
