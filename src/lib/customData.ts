import { DomainData, Context, Property, Statement, Counterexample } from '../types';

/**
 * User-authored data created through the in-app Editor.
 *
 * Entries live in localStorage as a per-domain overlay on top of the
 * built-in JSON under data/<domain>/. An overlay entry whose id matches a
 * built-in entry replaces it (an edit); `deleted` hides built-in entries.
 */

export type EntityKind = 'properties' | 'statements' | 'counterexamples' | 'contexts';

export type DomainOverlay = {
  contexts: Context[];
  properties: Property[];
  statements: Statement[];
  counterexamples: Counterexample[];
  deleted: Record<EntityKind, string[]>;
};

export type CustomDataStore = {
  version: 1;
  domains: Record<string, DomainOverlay>;
};

const STORAGE_KEY = 'theorem_graph_custom_data_v1';

export const ENTITY_KINDS: EntityKind[] = ['properties', 'statements', 'counterexamples', 'contexts'];

export function emptyOverlay(): DomainOverlay {
  return {
    contexts: [],
    properties: [],
    statements: [],
    counterexamples: [],
    deleted: { contexts: [], properties: [], statements: [], counterexamples: [] },
  };
}

export function loadCustomData(): CustomDataStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === 1 && parsed.domains) {
        for (const d of Object.keys(parsed.domains)) {
          parsed.domains[d] = { ...emptyOverlay(), ...parsed.domains[d] };
          parsed.domains[d].deleted = { ...emptyOverlay().deleted, ...parsed.domains[d].deleted };
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load custom data', e);
  }
  return { version: 1, domains: {} };
}

export function saveCustomData(store: CustomDataStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save custom data', e);
  }
}

function mergeList<T extends { id: string }>(base: T[], overrides: T[], deleted: string[]): T[] {
  const overrideMap = new Map(overrides.map(o => [o.id, o]));
  const deletedSet = new Set(deleted);
  const baseIds = new Set(base.map(b => b.id));
  const merged = base
    .filter(b => !deletedSet.has(b.id))
    .map(b => overrideMap.get(b.id) ?? b);
  for (const o of overrides) {
    if (!baseIds.has(o.id) && !deletedSet.has(o.id)) merged.push(o);
  }
  return merged;
}

export function applyOverlay(base: DomainData, overlay: DomainOverlay | undefined): DomainData {
  if (!overlay) return base;
  return {
    domain: base.domain,
    contexts: mergeList(base.contexts, overlay.contexts, overlay.deleted.contexts),
    properties: mergeList(base.properties, overlay.properties, overlay.deleted.properties),
    statements: mergeList(base.statements, overlay.statements, overlay.deleted.statements),
    counterexamples: mergeList(base.counterexamples, overlay.counterexamples, overlay.deleted.counterexamples),
  };
}

export function upsertEntity<T extends { id: string }>(overlay: DomainOverlay, kind: EntityKind, entity: T): DomainOverlay {
  const list = overlay[kind] as { id: string }[];
  const idx = list.findIndex(e => e.id === entity.id);
  const nextList = idx >= 0 ? list.map((e, i) => (i === idx ? entity : e)) : [...list, entity];
  return {
    ...overlay,
    [kind]: nextList,
    deleted: { ...overlay.deleted, [kind]: overlay.deleted[kind].filter(id => id !== entity.id) },
  };
}

export function removeEntity(overlay: DomainOverlay, kind: EntityKind, id: string, isBuiltIn: boolean): DomainOverlay {
  const list = overlay[kind] as { id: string }[];
  return {
    ...overlay,
    [kind]: list.filter(e => e.id !== id),
    deleted: {
      ...overlay.deleted,
      [kind]: isBuiltIn && !overlay.deleted[kind].includes(id) ? [...overlay.deleted[kind], id] : overlay.deleted[kind],
    },
  };
}

/** Drop the overlay's edit/deletion of a built-in entry, restoring the JSON version. */
export function revertEntity(overlay: DomainOverlay, kind: EntityKind, id: string): DomainOverlay {
  const list = overlay[kind] as { id: string }[];
  return {
    ...overlay,
    [kind]: list.filter(e => e.id !== id),
    deleted: { ...overlay.deleted, [kind]: overlay.deleted[kind].filter(d => d !== id) },
  };
}

export function overlayChangeCount(overlay: DomainOverlay | undefined): number {
  if (!overlay) return 0;
  return ENTITY_KINDS.reduce((n, k) => n + overlay[k].length + overlay.deleted[k].length, 0);
}

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\$[^$]*\$/g, m => m.replace(/[\\{}^_$]/g, ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Order keys like the hand-written JSON files and drop empty optional fields. */
export function cleanEntity<T extends object>(entity: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entity)) {
    if (v === undefined || v === '') continue;
    if (Array.isArray(v) && v.length === 0 && !['from', 'to', 'satisfies', 'fails', 'assumptions', 'requiredProperties'].includes(k)) continue;
    out[k] = v;
  }
  return out as T;
}

export function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Write the merged domain back to data/<domain>/*.json. Only available while
 * running `npm run dev` (served by the dataWriter plugin in vite.config.ts).
 */
export async function saveDomainToDisk(data: DomainData): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('/__api/save-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: body.error || `Server responded ${res.status}` };
    return { ok: true, message: body.message || 'Saved' };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
