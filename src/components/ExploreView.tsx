import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { MathView } from './MathView';
import { Lock, Unlock, CheckCircle, XCircle, Sparkles, ArrowRight } from 'lucide-react';

export const ExploreView: React.FC = () => {
  const {
    domainData,
    currentDomain,
    studyState,
    unlockNode,
    unlockStatement,
  } = useStore();

  const domainProgress = studyState.progressByDomain[currentDomain] || {
    domain: currentDomain,
    unlockedNodeIds: [],
    unlockedStatementIds: [],
    completedQuizCount: 0,
    correctQuizCount: 0,
  };

  const unlockedNodes = new Set(domainProgress.unlockedNodeIds);
  const unlockedStatements = new Set(domainProgress.unlockedStatementIds);

  const [activePropertyToUnlock, setActivePropertyToUnlock] = useState<string | null>(null);
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);

  const propMap = new Map(domainData.properties.map(p => [p.id, p]));

  // Find candidate property to unlock
  const propTarget = activePropertyToUnlock ? propMap.get(activePropertyToUnlock) : null;

  // Generate 4 multiple choice options for definition
  const choices = React.useMemo(() => {
    if (!propTarget) return [];
    const correctDef = propTarget.definition;
    const otherDefs = domainData.properties
      .filter(p => p.id !== propTarget.id)
      .map(p => p.definition)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    return [correctDef, ...otherDefs].sort(() => Math.random() - 0.5);
  }, [propTarget, domainData.properties]);

  const handleSelectDefinition = (choice: string, idx: number) => {
    setSelectedChoiceIdx(idx);
    if (!propTarget) return;

    if (choice === propTarget.definition) {
      unlockNode(propTarget.id);
      setFeedback({
        isCorrect: true,
        message: `Correct! You unlocked ${propTarget.name}.`,
      });
    } else {
      setFeedback({
        isCorrect: false,
        message: 'Incorrect definition. Try again!',
      });
    }
  };

  const handleUnlockEdge = (stmtId: string) => {
    unlockStatement(stmtId);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Fog of War — Exploration Mode</span>
          </div>
          <h2 className="text-2xl font-black">Unlock Mathematical Structures</h2>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Test your understanding by identifying definitions to reveal nodes on the theorem graph, then unlock theorems linking discovered properties!
          </p>
        </div>
        <div className="flex items-center space-x-4 bg-white/10 backdrop-blur px-5 py-3 rounded-xl border border-white/10">
          <div className="text-center">
            <span className="text-2xl font-black text-amber-400">{unlockedNodes.size}</span>
            <span className="text-slate-300 text-xs block">/ {domainData.properties.length} Nodes</span>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="text-center">
            <span className="text-2xl font-black text-blue-400">{unlockedStatements.size}</span>
            <span className="text-slate-300 text-xs block">/ {domainData.statements.length} Edges</span>
          </div>
        </div>
      </div>

      {/* Unlock Modal / Card if a property is selected */}
      {propTarget && (
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-2xl p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Unlock Definition: <MathView text={propTarget.name} inline />
              </h3>
            </div>
            <button
              onClick={() => {
                setActivePropertyToUnlock(null);
                setFeedback(null);
                setSelectedChoiceIdx(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Select the mathematically correct definition of <strong className="text-slate-900 dark:text-slate-100">{propTarget.name.replace(/\$/g, '')}</strong>:
          </p>

          <div className="space-y-3">
            {choices.map((choice, i) => (
              <button
                key={i}
                disabled={feedback?.isCorrect}
                onClick={() => handleSelectDefinition(choice, i)}
                className={`w-full text-left p-4 rounded-xl border text-xs font-serif leading-relaxed transition-all ${
                  selectedChoiceIdx === i
                    ? feedback?.isCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                      : 'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-100'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-indigo-400'
                }`}
              >
                <MathView text={choice} />
              </button>
            ))}
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg flex items-center space-x-2 text-xs font-semibold ${
                feedback.isCorrect
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
              }`}
            >
              {feedback.isCorrect ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Grid of Nodes */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
          <span>Properties (Nodes)</span>
          <span className="text-xs font-normal text-slate-400">Click a locked node to unlock</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {domainData.properties.map(p => {
            const isUnlocked = unlockedNodes.has(p.id);
            return (
              <div
                key={p.id}
                onClick={() => {
                  if (!isUnlocked) {
                    setActivePropertyToUnlock(p.id);
                    setFeedback(null);
                    setSelectedChoiceIdx(null);
                  }
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isUnlocked
                    ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-400">{p.id}</span>
                  {isUnlocked ? (
                    <span className="flex items-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Unlock className="w-3.5 h-3.5 mr-1" /> Unlocked
                    </span>
                  ) : (
                    <span className="flex items-center text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      <Lock className="w-3.5 h-3.5 mr-1" /> Locked
                    </span>
                  )}
                </div>

                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  <MathView text={p.name} inline />
                </div>

                {isUnlocked ? (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-2 font-serif">
                    {p.definition.slice(0, 80)}...
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic mt-2">
                    Click to solve definition challenge & unlock
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unlockable Edges (Theorems whose endpoints are discovered) */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
          <span>Theorems Linking Discovered Nodes</span>
        </h3>

        <div className="space-y-3">
          {domainData.statements
            .filter(s => s.from.every(f => unlockedNodes.has(f)) && s.to.every(t => unlockedNodes.has(t)))
            .map(s => {
              const isEdgeUnlocked = unlockedStatements.has(s.id);
              const fromNames = s.from.map(f => propMap.get(f)?.name || f).join(' + ');
              const toNames = s.to.map(t => propMap.get(t)?.name || t).join(', ');

              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        s.kind === 'implies'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : s.kind === 'equivalent'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                      }`}
                    >
                      {s.kind}
                    </span>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                      <span>{fromNames}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span>{toNames}</span>
                    </div>
                  </div>

                  {isEdgeUnlocked ? (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" /> Unlocked
                    </span>
                  ) : (
                    <button
                      onClick={() => handleUnlockEdge(s.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                    >
                      Unlock Edge
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
