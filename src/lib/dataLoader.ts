import { DomainData, Context, Property, Statement, Counterexample } from '../types';

// Load all JSON files in the data/ directory statically via Vite's import.meta.glob
const dataModules = import.meta.glob<any>('/data/**/*.json', { eager: true });

export function getAvailableDomains(): string[] {
  const domains = new Set<string>();
  for (const path in dataModules) {
    const parts = path.split('/');
    // e.g. ["", "data", "topology", "properties.json"]
    const domainIdx = parts.indexOf('data') + 1;
    if (domainIdx > 0 && domainIdx < parts.length - 1) {
      domains.add(parts[domainIdx]);
    }
  }
  return Array.from(domains);
}

export function loadDomainFromModules(domain: string): DomainData {
  let contexts: Context[] = [];
  let properties: Property[] = [];
  let statements: Statement[] = [];
  let counterexamples: Counterexample[] = [];

  for (const [filePath, moduleObj] of Object.entries(dataModules)) {
    if (filePath.includes(`/data/${domain}/`)) {
      const data = (moduleObj as any).default || moduleObj;
      if (filePath.endsWith('contexts.json')) {
        contexts = data;
      } else if (filePath.endsWith('properties.json')) {
        properties = data;
      } else if (filePath.endsWith('statements.json')) {
        statements = data;
      } else if (filePath.endsWith('counterexamples.json')) {
        counterexamples = data;
      }
    }
  }

  return {
    domain,
    contexts,
    properties,
    statements,
    counterexamples,
  };
}
