import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { getDueCards } from '../lib/studyEngine';
import { MathView } from './MathView';
import { Calendar, CheckCircle2, Sparkles } from 'lucide-react';

export const ReviewQueueView: React.FC = () => {
  const { studyState, currentDomain, rateCard } = useStore();

  const dueCards = getDueCards(studyState.cards, currentDomain);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const activeCard = dueCards[currentIdx];

  const handleRate = (rating: number) => {
    if (!activeCard) return;
    rateCard(activeCard.id, rating);
    setShowAnswer(false);
    // Move to next card or stay at 0 if remaining
    if (currentIdx >= dueCards.length - 1) {
      setCurrentIdx(0);
    }
  };

  if (!activeCard || dueCards.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm mt-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          All caught up for today!
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          You have reviewed all due cards for the <strong>{currentDomain}</strong> domain. Next reviews will be scheduled automatically based on the SM-2 algorithm.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Queue Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Spaced Repetition Review Queue
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Card {currentIdx + 1} of {dueCards.length} due today
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            Interval: {activeCard.interval}d | Rep: #{activeCard.repetition}
          </span>
        </div>
      </div>

      {/* Flashcard */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-lg space-y-6">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1 block">
            {activeCard.type === 'implication' ? 'Implication Proof Flashcard' : 'Refutation & Counterexample Flashcard'}
          </span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            <MathView text={activeCard.prompt} />
          </h3>
        </div>

        {!showAnswer ? (
          <button
            onClick={() => setShowAnswer(true)}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Show Answer & Proof Idea</span>
          </button>
        ) : (
          <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 font-serif text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              <MathView text={activeCard.answer} />
            </div>

            {activeCard.details && (
              <p className="text-xs text-slate-500 italic">
                {activeCard.details}
              </p>
            )}

            {/* SM-2 Rating Buttons */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 text-center">
                Rate Recall Difficulty:
              </p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleRate(1)}
                  className="p-3 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs font-bold text-center"
                >
                  <div>Again</div>
                  <span className="text-[10px] text-red-500 font-normal">1 day</span>
                </button>

                <button
                  onClick={() => handleRate(2)}
                  className="p-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-700 dark:text-amber-300 text-xs font-bold text-center"
                >
                  <div>Hard</div>
                  <span className="text-[10px] text-amber-500 font-normal">1 day</span>
                </button>

                <button
                  onClick={() => handleRate(4)}
                  className="p-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-200 dark:border-blue-900/60 rounded-xl text-blue-700 dark:text-blue-300 text-xs font-bold text-center"
                >
                  <div>Good</div>
                  <span className="text-[10px] text-blue-500 font-normal">{activeCard.repetition === 0 ? '1d' : `${activeCard.interval * 2}d`}</span>
                </button>

                <button
                  onClick={() => handleRate(5)}
                  className="p-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center"
                >
                  <div>Easy</div>
                  <span className="text-[10px] text-emerald-500 font-normal">Mastered</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
