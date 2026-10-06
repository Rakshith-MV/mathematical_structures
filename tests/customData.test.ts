import { describe, it, expect } from 'vitest';
import { applyOverlay, emptyOverlay, upsertEntity, removeEntity, revertEntity, overlayChangeCount, slugify, cleanEntity } from '../src/lib/customData';
import { DomainData } from '../src/types';

const base: DomainData = {
  domain: 'test',
  contexts: [{ id: 'ctx', name: 'Ctx', assumptions: [] }],
  properties: [
    { id: 'a', name: 'A', domain: 'test', definition: 'a' },
    { id: 'b', name: 'B', domain: 'test', definition: 'b' },
  ],
  statements: [],
  counterexamples: [],
};

describe('customData overlay', () => {
  it('adds new entries after built-in ones', () => {
    const o = upsertEntity(emptyOverlay(), 'properties', { id: 'c', name: 'C', domain: 'test', definition: 'c' });
    expect(applyOverlay(base, o).properties.map(p => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('replaces built-in entries in place when edited', () => {
    const o = upsertEntity(emptyOverlay(), 'properties', { id: 'a', name: 'A2', domain: 'test', definition: 'a2' });
    const merged = applyOverlay(base, o);
    expect(merged.properties.map(p => p.name)).toEqual(['A2', 'B']);
    expect(overlayChangeCount(o)).toBe(1);
  });

  it('hides deleted built-ins and restores them on revert', () => {
    const o = removeEntity(emptyOverlay(), 'properties', 'a', true);
    expect(applyOverlay(base, o).properties.map(p => p.id)).toEqual(['b']);
    expect(applyOverlay(base, revertEntity(o, 'properties', 'a')).properties.map(p => p.id)).toEqual(['a', 'b']);
  });

  it('deleting a custom entry leaves no tombstone', () => {
    let o = upsertEntity(emptyOverlay(), 'properties', { id: 'c', name: 'C', domain: 'test', definition: 'c' });
    o = removeEntity(o, 'properties', 'c', false);
    expect(overlayChangeCount(o)).toBe(0);
  });

  it('slugifies names with LaTeX', () => {
    expect(slugify('Hausdorff ($T_2$)')).toBe('hausdorff-t2');
    expect(slugify('Lindelöf')).toBe('lindelof');
  });

  it('cleanEntity drops empty optional fields but keeps required arrays', () => {
    expect(cleanEntity({ id: 'x', name: '', from: [], examples: [], notes: undefined })).toEqual({ id: 'x', from: [] });
  });
});
