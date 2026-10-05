import { create } from 'zustand';
import { DomainData, Property, Statement, Counterexample } from '../types';
import { loadDomainFromModules, getAvailableDomains } from '../lib/dataLoader';
import {
  findAllPaths,
  DeductionPath,
} from '../lib/graphEngine';
import {
  UserStudyState,
  loadStudyState,
  saveStudyState,
  calculateSM2,
  generateInitialCardsForDomain,
  Flashcard,
} from '../lib/studyEngine';

export type AppMode = 'graph' | 'explore' | 'quiz' | 'puzzle' | 'review' | 'progress';

interface StoreState {
  availableDomains: string[];
  currentDomain: string;
  domainData: DomainData;
  activeContextId: string;

  // View settings
  showImpliedArrows: boolean;
  expandedEquivalenceClasses: Set<string>;
  searchQuery: string;
  isDarkMode: boolean;
  activeMode: AppMode;

  // Path finder
  pathStartId: string | null;
  pathTargetId: string | null;
  foundPaths: DeductionPath[];
  selectedPathIndex: number;

  // Selection for side panel
  selectedProperty: Property | null;
  selectedStatement: Statement | null;
  selectedCounterexample: Counterexample | null;

  // Study & persistence
  studyState: UserStudyState;

  // Actions
  setDomain: (domain: string) => void;
  setActiveContext: (contextId: string) => void;
  setShowImpliedArrows: (val: boolean) => void;
  toggleEquivalenceClass: (eqId: string) => void;
  collapseAllEquivalenceClasses: () => void;
  setSearchQuery: (query: string) => void;
  toggleDarkMode: () => void;
  setActiveMode: (mode: AppMode) => void;

  setPathStart: (id: string | null) => void;
  setPathTarget: (id: string | null) => void;
  setSelectedPathIndex: (idx: number) => void;
  clearPathFinder: () => void;

  selectProperty: (prop: Property | null) => void;
  selectStatement: (stmt: Statement | null) => void;
  selectCounterexample: (ce: Counterexample | null) => void;
  closeSidePanel: () => void;

  // Study actions
  unlockNode: (nodeId: string) => void;
  unlockStatement: (statementId: string) => void;
  recordQuizResult: (correct: boolean) => void;
  rateCard: (cardId: string, rating: number) => void;
  importStudyJSON: (jsonStr: string) => void;
  resetProgressForDomain: (domain: string) => void;
}

const initialDomains = getAvailableDomains();
const defaultDomain = initialDomains.includes('topology') ? 'topology' : initialDomains[0] || 'topology';
const initialData = loadDomainFromModules(defaultDomain);
const initialStudyState = loadStudyState();

// Initialize flashcards for domain if empty
if (Object.keys(initialStudyState.cards).length === 0) {
  const cards = generateInitialCardsForDomain(initialData);
  for (const c of cards) {
    initialStudyState.cards[c.id] = c;
  }
  saveStudyState(initialStudyState);
}

export const useStore = create<StoreState>((set, get) => ({
  availableDomains: initialDomains,
  currentDomain: defaultDomain,
  domainData: initialData,
  activeContextId: initialData.contexts[0]?.id || 'topological-spaces',

  showImpliedArrows: false,
  expandedEquivalenceClasses: new Set<string>(),
  searchQuery: '',
  isDarkMode: false,
  activeMode: 'graph',

  pathStartId: null,
  pathTargetId: null,
  foundPaths: [],
  selectedPathIndex: 0,

  selectedProperty: null,
  selectedStatement: null,
  selectedCounterexample: null,

  studyState: initialStudyState,

  setDomain: (domain: string) => {
    const data = loadDomainFromModules(domain);
    const defaultCtx = data.contexts[0]?.id || 'topological-spaces';

    // Populate flashcards for domain if needed
    const currentStudy = get().studyState;
    const existingCards = Object.values(currentStudy.cards).filter(c => c.domain === domain);
    if (existingCards.length === 0) {
      const newCards = generateInitialCardsForDomain(data);
      for (const c of newCards) {
        currentStudy.cards[c.id] = c;
      }
      saveStudyState(currentStudy);
    }

    set({
      currentDomain: domain,
      domainData: data,
      activeContextId: defaultCtx,
      expandedEquivalenceClasses: new Set<string>(),
      pathStartId: null,
      pathTargetId: null,
      foundPaths: [],
      selectedProperty: null,
      selectedStatement: null,
      selectedCounterexample: null,
    });
  },

  setActiveContext: (contextId: string) => {
    set({
      activeContextId: contextId,
      expandedEquivalenceClasses: new Set<string>(),
    });
  },

  setShowImpliedArrows: (val: boolean) => set({ showImpliedArrows: val }),

  toggleEquivalenceClass: (eqId: string) => {
    const current = new Set(get().expandedEquivalenceClasses);
    if (current.has(eqId)) {
      current.delete(eqId);
    } else {
      current.add(eqId);
    }
    set({ expandedEquivalenceClasses: current });
  },

  collapseAllEquivalenceClasses: () => {
    set({ expandedEquivalenceClasses: new Set() });
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  toggleDarkMode: () => {
    const next = !get().isDarkMode;
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ isDarkMode: next });
  },

  setActiveMode: (mode: AppMode) => {
    set({ activeMode: mode });
  },

  setPathStart: (id: string | null) => {
    const target = get().pathTargetId;
    let paths: DeductionPath[] = [];
    if (id && target) {
      paths = findAllPaths(id, target, get().domainData);
    }
    set({
      pathStartId: id,
      foundPaths: paths,
      selectedPathIndex: 0,
    });
  },

  setPathTarget: (id: string | null) => {
    const start = get().pathStartId;
    let paths: DeductionPath[] = [];
    if (start && id) {
      paths = findAllPaths(start, id, get().domainData);
    }
    set({
      pathTargetId: id,
      foundPaths: paths,
      selectedPathIndex: 0,
    });
  },

  setSelectedPathIndex: (idx: number) => set({ selectedPathIndex: idx }),

  clearPathFinder: () => {
    set({
      pathStartId: null,
      pathTargetId: null,
      foundPaths: [],
      selectedPathIndex: 0,
    });
  },

  selectProperty: (prop: Property | null) => {
    set({
      selectedProperty: prop,
      selectedStatement: null,
      selectedCounterexample: null,
    });
  },

  selectStatement: (stmt: Statement | null) => {
    set({
      selectedStatement: stmt,
      selectedProperty: null,
      selectedCounterexample: null,
    });
  },

  selectCounterexample: (ce: Counterexample | null) => {
    set({
      selectedCounterexample: ce,
      selectedProperty: null,
      selectedStatement: null,
    });
  },

  closeSidePanel: () => {
    set({
      selectedProperty: null,
      selectedStatement: null,
      selectedCounterexample: null,
    });
  },

  unlockNode: (nodeId: string) => {
    const { currentDomain, studyState } = get();
    const domainProgress = studyState.progressByDomain[currentDomain] || {
      domain: currentDomain,
      unlockedNodeIds: [],
      unlockedStatementIds: [],
      completedQuizCount: 0,
      correctQuizCount: 0,
    };

    if (!domainProgress.unlockedNodeIds.includes(nodeId)) {
      domainProgress.unlockedNodeIds.push(nodeId);
    }

    const nextState = {
      ...studyState,
      progressByDomain: {
        ...studyState.progressByDomain,
        [currentDomain]: domainProgress,
      },
    };

    saveStudyState(nextState);
    set({ studyState: nextState });
  },

  unlockStatement: (statementId: string) => {
    const { currentDomain, studyState } = get();
    const domainProgress = studyState.progressByDomain[currentDomain] || {
      domain: currentDomain,
      unlockedNodeIds: [],
      unlockedStatementIds: [],
      completedQuizCount: 0,
      correctQuizCount: 0,
    };

    if (!domainProgress.unlockedStatementIds.includes(statementId)) {
      domainProgress.unlockedStatementIds.push(statementId);
    }

    const nextState = {
      ...studyState,
      progressByDomain: {
        ...studyState.progressByDomain,
        [currentDomain]: domainProgress,
      },
    };

    saveStudyState(nextState);
    set({ studyState: nextState });
  },

  recordQuizResult: (correct: boolean) => {
    const { currentDomain, studyState } = get();
    const domainProgress = studyState.progressByDomain[currentDomain] || {
      domain: currentDomain,
      unlockedNodeIds: [],
      unlockedStatementIds: [],
      completedQuizCount: 0,
      correctQuizCount: 0,
    };

    domainProgress.completedQuizCount += 1;
    if (correct) {
      domainProgress.correctQuizCount += 1;
    }

    const nextState = {
      ...studyState,
      progressByDomain: {
        ...studyState.progressByDomain,
        [currentDomain]: domainProgress,
      },
    };

    saveStudyState(nextState);
    set({ studyState: nextState });
  },

  rateCard: (cardId: string, rating: number) => {
    const { studyState } = get();
    const card = studyState.cards[cardId];
    if (!card) return;

    const sm2 = calculateSM2(card, rating);
    const updatedCard: Flashcard = {
      ...card,
      ...sm2,
      lastReviewed: new Date().toISOString(),
      failCount: rating < 3 ? card.failCount + 1 : card.failCount,
    };

    const nextState: UserStudyState = {
      ...studyState,
      cards: {
        ...studyState.cards,
        [cardId]: updatedCard,
      },
    };

    saveStudyState(nextState);
    set({ studyState: nextState });
  },

  importStudyJSON: (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.version === 1) {
        saveStudyState(parsed);
        set({ studyState: parsed });
      }
    } catch (e) {
      console.error('Failed to import JSON', e);
    }
  },

  resetProgressForDomain: (domain: string) => {
    const { studyState } = get();
    const newProgress = {
      domain,
      unlockedNodeIds: [],
      unlockedStatementIds: [],
      completedQuizCount: 0,
      correctQuizCount: 0,
    };

    // Reset card intervals for this domain
    const nextCards = { ...studyState.cards };
    for (const id in nextCards) {
      if (nextCards[id].domain === domain) {
        nextCards[id] = {
          ...nextCards[id],
          repetition: 0,
          interval: 1,
          easeFactor: 2.5,
          dueDate: new Date().toISOString(),
          failCount: 0,
        };
      }
    }

    const nextState = {
      ...studyState,
      progressByDomain: {
        ...studyState.progressByDomain,
        [domain]: newProgress,
      },
      cards: nextCards,
    };

    saveStudyState(nextState);
    set({ studyState: nextState });
  },
}));
