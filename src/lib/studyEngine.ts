import { DomainData } from '../types';

export interface Flashcard {
  id: string; // card id
  domain: string;
  type: 'implication' | 'refutation';
  prompt: string;
  answer: string;
  details?: string;
  entityId: string; // statement ID or counterexample ID
  // SM-2 fields
  repetition: number;
  interval: number; // in days
  easeFactor: number; // default 2.5
  dueDate: string; // ISO string
  lastReviewed?: string;
  failCount: number;
}

export interface DomainProgress {
  domain: string;
  unlockedNodeIds: string[];
  unlockedStatementIds: string[];
  completedQuizCount: number;
  correctQuizCount: number;
}

export interface UserStudyState {
  version: number;
  progressByDomain: Record<string, DomainProgress>;
  cards: Record<string, Flashcard>; // cardId -> Flashcard
}

const STORAGE_KEY = 'theorem_graph_study_state_v1';

/**
 * Calculates new SM-2 parameters based on rating (0 to 5).
 * 0-2: Failure (reset repetition and interval to 1 day)
 * 3-5: Success
 */
export function calculateSM2(
  card: Flashcard,
  rating: number, // 0 to 5
  now: Date = new Date()
): { interval: number; repetition: number; easeFactor: number; dueDate: string } {
  let { repetition, interval, easeFactor } = card;

  // Ease factor calculation: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const newEF = Math.max(1.3, easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)));

  if (rating < 3) {
    // Failed: reset repetition and set interval to 1 day
    repetition = 0;
    interval = 1;
  } else {
    // Passed
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * newEF);
    }
    repetition += 1;
  }

  const dueDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).toISOString();

  return {
    repetition,
    interval,
    easeFactor: Number(newEF.toFixed(2)),
    dueDate,
  };
}

/**
 * Generates initial flashcards for all statements and known counterexamples in a domain.
 */
export function generateInitialCardsForDomain(data: DomainData): Flashcard[] {
  const cards: Flashcard[] = [];
  const propMap = new Map(data.properties.map(p => [p.id, p]));
  const today = new Date().toISOString();

  // Implication cards
  for (const stmt of data.statements) {
    if (stmt.kind === 'implies') {
      const fromNames = stmt.from.map(id => propMap.get(id)?.name || id).join(' and ');
      const toNames = stmt.to.map(id => propMap.get(id)?.name || id).join(', ');

      cards.push({
        id: `card-stmt-${stmt.id}`,
        domain: data.domain,
        type: 'implication',
        prompt: `Why does ${fromNames} imply ${toNames}?`,
        answer: stmt.proofSketch || `By theorem: ${stmt.name || stmt.id}. Key lemma: ${stmt.keyLemma || 'standard'}.`,
        details: `Source: ${stmt.source} | Context: ${stmt.context}`,
        entityId: stmt.id,
        repetition: 0,
        interval: 1,
        easeFactor: 2.5,
        dueDate: today,
        failCount: 0,
      });
    } else if (stmt.kind === 'not-implies' && stmt.witness) {
      const fromNames = stmt.from.map(id => propMap.get(id)?.name || id).join(' and ');
      const toNames = stmt.to.map(id => propMap.get(id)?.name || id).join(', ');
      const ce = data.counterexamples.find(c => c.id === stmt.witness);

      cards.push({
        id: `card-ce-${stmt.id}`,
        domain: data.domain,
        type: 'refutation',
        prompt: `Why does ${fromNames} NOT imply ${toNames}? Provide a counterexample.`,
        answer: `Counterexample: ${ce?.name || stmt.witness}. ${ce?.description || ''}`,
        details: `Source: ${ce?.source || stmt.source}`,
        entityId: stmt.id,
        repetition: 0,
        interval: 1,
        easeFactor: 2.5,
        dueDate: today,
        failCount: 0,
      });
    }
  }

  return cards;
}

/**
 * Filters cards that are due for review today or earlier.
 */
export function getDueCards(cards: Record<string, Flashcard>, domain?: string, now: Date = new Date()): Flashcard[] {
  const nowTime = now.getTime();
  const result: Flashcard[] = [];

  for (const card of Object.values(cards)) {
    if (domain && card.domain !== domain) continue;

    const dueTime = new Date(card.dueDate).getTime();
    if (dueTime <= nowTime) {
      result.push(card);
    }
  }

  // Sort by urgency (oldest due date first)
  return result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

/**
 * Returns weakest edges/cards (most failed or lowest ease factor).
 */
export function getWeakCards(cards: Record<string, Flashcard>, domain?: string, limit: number = 5): Flashcard[] {
  return Object.values(cards)
    .filter(c => !domain || c.domain === domain)
    .filter(c => c.failCount > 0 || c.easeFactor < 2.5)
    .sort((a, b) => b.failCount - a.failCount || a.easeFactor - b.easeFactor)
    .slice(0, limit);
}

/**
 * Loads user study state from localStorage or creates default.
 */
export function loadStudyState(): UserStudyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load study state from localStorage', e);
  }

  return {
    version: 1,
    progressByDomain: {},
    cards: {},
  };
}

/**
 * Saves user study state to localStorage.
 */
export function saveStudyState(state: UserStudyState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save study state to localStorage', e);
  }
}

/**
 * Export state as JSON string.
 */
export function exportStudyState(state: UserStudyState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Imports state from JSON string, validating version.
 */
export function importStudyState(jsonStr: string): UserStudyState {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
    throw new Error('Invalid study state file or unsupported version');
  }
  return parsed as UserStudyState;
}
