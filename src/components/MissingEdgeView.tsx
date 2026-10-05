import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { generateMissingEdgePuzzles, MissingEdgePuzzle } from '../lib/quizEngine';
import { MathView } from './MathView';
import { Puzzle, CheckCircle2, XCircle, ArrowRight, RotateCcw } from 'lucide-react';

export const MissingEdgeView: React.FC = () => {
  const { domainData, activeContextId } = useStore();

  const [puzzles, setPuzzles] = useState<MissingEdgePuzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const resetPuzzles = () => {
    const list = generateMissingEdgePuzzles(domainData, activeContextId, 5);
    setPuzzles(list);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setHasSubmitted(false);
  };

  useEffect(() => {
    resetPuzzles();
  }, [domainData, activeContextId]);

  const currentPuzzle = puzzles[currentIndex];

  if (!currentPuzzle) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <Puzzle className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          No puzzles available in this context
        </h3>
        <button
          onClick={resetPuzzles}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          Reload Puzzles
        </button>
      </div>
    );
  }

  const handleSelectOption = (optionId: string) => {
    if (hasSubmitted) return;
    setSelectedOptionId(optionId);
    setHasSubmitted(true);
    if (optionId === currentPuzzle.correctOptionId) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < puzzles.length) {
      setCurrentIndex(i => i + 1);
      setSelectedOptionId(null);
      setHasSubmitted(false);
    } else {
      resetPuzzles();
    }
  };

  const isCorrect = selectedOptionId === currentPuzzle.correctOptionId;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Missing-Edge Puzzle | Puzzle {currentIndex + 1} of {puzzles.length}
          </span>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Fill the Missing Deductive Link
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm font-black text-slate-900 dark:text-slate-100">Score: {score}</span>
          <button onClick={resetPuzzles} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Challenge Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md space-y-6">
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/60 rounded-xl border border-blue-200 dark:border-slate-700 flex items-center justify-center space-x-4">
          <div className="font-bold text-base text-blue-900 dark:text-blue-100">
            <MathView text={currentPuzzle.fromProperty.name} inline />
          </div>
          <div className="text-xl font-black text-amber-500 flex items-center space-x-1">
            <span>? ? ?</span>
            <ArrowRight className="w-5 h-5" />
          </div>
          <div className="font-bold text-base text-indigo-900 dark:text-indigo-100">
            <MathView text={currentPuzzle.toProperty.name} inline />
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Which mathematical theorem or principle establishes the missing implication arrow?
        </p>

        {/* Options */}
        <div className="space-y-3">
          {currentPuzzle.options.map(opt => {
            const isSelected = selectedOptionId === opt.id;
            const isTarget = opt.id === currentPuzzle.correctOptionId;

            let btnStyle = 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-400';
            if (hasSubmitted) {
              if (isTarget) {
                btnStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-semibold';
              } else if (isSelected) {
                btnStyle = 'bg-red-50 dark:bg-red-950/60 border-red-500 text-red-900 dark:text-red-100';
              }
            }

            return (
              <button
                key={opt.id}
                disabled={hasSubmitted}
                onClick={() => handleSelectOption(opt.id)}
                className={`w-full text-left p-4 rounded-xl border text-xs transition-all shadow-sm ${btnStyle}`}
              >
                <div className="font-bold text-sm mb-1">{opt.name || opt.id}</div>
                {opt.keyLemma && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 block mb-1">
                    Key lemma: {opt.keyLemma}
                  </span>
                )}
                {hasSubmitted && opt.proofSketch && (
                  <p className="text-[11px] text-slate-500 font-serif line-clamp-2 mt-1">
                    {opt.proofSketch}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback & Next */}
        {hasSubmitted && (
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div
              className={`p-4 rounded-xl flex items-center space-x-2 text-xs font-semibold ${
                isCorrect
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
              }`}
            >
              {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
              <span>
                {isCorrect ? 'Well done! That theorem establishes the edge.' : 'Incorrect theorem.'}
              </span>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
            >
              {currentIndex + 1 < puzzles.length ? 'Next Puzzle' : 'Finish Puzzle Set'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
