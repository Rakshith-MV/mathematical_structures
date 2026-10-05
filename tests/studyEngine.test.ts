import { describe, it, expect } from 'vitest';
import {
  calculateSM2,
  getDueCards,
  getWeakCards,
  exportStudyState,
  importStudyState,
  Flashcard,
  UserStudyState,
} from '../src/lib/studyEngine';

describe('Study Engine & Spaced Repetition', () => {
  const baseCard: Flashcard = {
    id: 'card-1',
    domain: 'topology',
    type: 'implication',
    prompt: 'Why A implies B?',
    answer: 'Proof sketch',
    entityId: 'stmt-1',
    repetition: 0,
    interval: 1,
    easeFactor: 2.5,
    dueDate: '2026-10-01T00:00:00.000Z',
    failCount: 0,
  };

  const mockNow = new Date('2026-10-05T12:00:00.000Z');

  describe('calculateSM2', () => {
    it('schedules 1-day interval on first successful review (rating 4 - Good)', () => {
      const result = calculateSM2(baseCard, 4, mockNow);
      expect(result.repetition).toBe(1);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBe(2.5); // rating 4 doesn't change 2.5 significantly
      expect(new Date(result.dueDate).getTime()).toBeGreaterThan(mockNow.getTime());
    });

    it('schedules 6-day interval on second consecutive successful review', () => {
      const card2: Flashcard = { ...baseCard, repetition: 1, interval: 1 };
      const result = calculateSM2(card2, 5, mockNow); // rating 5 - Easy
      expect(result.repetition).toBe(2);
      expect(result.interval).toBe(6);
      expect(result.easeFactor).toBe(2.6); // 2.5 + 0.1
    });

    it('multiplies previous interval by ease factor on third successful review', () => {
      const card3: Flashcard = { ...baseCard, repetition: 2, interval: 6, easeFactor: 2.5 };
      const result = calculateSM2(card3, 4, mockNow);
      expect(result.repetition).toBe(3);
      expect(result.interval).toBe(Math.round(6 * 2.5)); // 15 days
    });

    it('resets repetition and interval to 1 on failure (rating 1 - Again)', () => {
      const cardAdv: Flashcard = { ...baseCard, repetition: 3, interval: 15, easeFactor: 2.5 };
      const result = calculateSM2(cardAdv, 1, mockNow);
      expect(result.repetition).toBe(0);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBeLessThan(2.5);
    });
  });

  describe('getDueCards (Due Queue Logic)', () => {
    it('returns cards that are past due or due today', () => {
      const cards: Record<string, Flashcard> = {
        c1: { ...baseCard, id: 'c1', dueDate: '2026-10-01T00:00:00.000Z' }, // Overdue
        c2: { ...baseCard, id: 'c2', dueDate: '2026-10-05T10:00:00.000Z' }, // Due earlier today
        c3: { ...baseCard, id: 'c3', dueDate: '2026-10-10T00:00:00.000Z' }, // Due future
      };

      const due = getDueCards(cards, 'topology', mockNow);
      expect(due.map(c => c.id)).toEqual(['c1', 'c2']);
      expect(due).not.toContainEqual(expect.objectContaining({ id: 'c3' }));
    });

    it('sorts due cards by oldest due date first (urgency)', () => {
      const cards: Record<string, Flashcard> = {
        c2: { ...baseCard, id: 'c2', dueDate: '2026-10-04T00:00:00.000Z' },
        c1: { ...baseCard, id: 'c1', dueDate: '2026-09-20T00:00:00.000Z' },
      };

      const due = getDueCards(cards, undefined, mockNow);
      expect(due[0].id).toBe('c1');
      expect(due[1].id).toBe('c2');
    });

    it('identifies weakest cards sorted by failCount and low easeFactor', () => {
      const cards: Record<string, Flashcard> = {
        c1: { ...baseCard, id: 'c1', failCount: 1, easeFactor: 2.3 },
        c2: { ...baseCard, id: 'c2', failCount: 4, easeFactor: 1.8 },
        c3: { ...baseCard, id: 'c3', failCount: 0, easeFactor: 2.5 },
      };

      const weak = getWeakCards(cards, 'topology', 5);
      expect(weak).toHaveLength(2);
      expect(weak[0].id).toBe('c2'); // Most failed first
      expect(weak[1].id).toBe('c1');
    });
  });

  describe('Export & Import JSON', () => {
    it('serializes and deserializes study state accurately', () => {
      const state: UserStudyState = {
        version: 1,
        progressByDomain: {
          topology: {
            domain: 'topology',
            unlockedNodeIds: ['t0', 't1'],
            unlockedStatementIds: ['s1'],
            completedQuizCount: 5,
            correctQuizCount: 4,
          },
        },
        cards: {
          c1: { ...baseCard },
        },
      };

      const jsonStr = exportStudyState(state);
      const imported = importStudyState(jsonStr);

      expect(imported).toEqual(state);
    });

    it('throws an error on corrupted or mismatched version import', () => {
      expect(() => importStudyState('{"version": 99}')).toThrow();
      expect(() => importStudyState('invalid json')).toThrow();
    });
  });
});
