import React from 'react';
import { useStore } from '../store/useStore';
import { getWeakCards } from '../lib/studyEngine';
import { MathView } from './MathView';
import { BarChart3, AlertTriangle, RefreshCcw, Award } from 'lucide-react';

export const ProgressView: React.FC = () => {
  const { domainData, currentDomain, studyState, resetProgressForDomain } = useStore();

  const domainProgress = studyState.progressByDomain[currentDomain] || {
    domain: currentDomain,
    unlockedNodeIds: [],
    unlockedStatementIds: [],
    completedQuizCount: 0,
    correctQuizCount: 0,
  };

  const totalNodes = domainData.properties.length;
  const totalStatements = domainData.statements.length;

  const unlockedNodesCount = domainProgress.unlockedNodeIds.length;
  const unlockedStatementsCount = domainProgress.unlockedStatementIds.length;

  const nodePct = totalNodes > 0 ? Math.round((unlockedNodesCount / totalNodes) * 100) : 0;
  const stmtPct = totalStatements > 0 ? Math.round((unlockedStatementsCount / totalStatements) * 100) : 0;

  const weakCards = getWeakCards(studyState.cards, currentDomain, 8);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center">
            <BarChart3 className="w-4 h-4 mr-1 text-indigo-500" /> Domain Mastery
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 capitalize">
            {currentDomain} Progress Overview
          </h2>
        </div>

        <button
          onClick={() => {
            if (confirm(`Are you sure you want to reset your exploration and quiz progress for ${currentDomain}?`)) {
              resetProgressForDomain(currentDomain);
            }
          }}
          className="px-3 py-1.5 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-xs font-semibold flex items-center space-x-1"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>Reset Progress</span>
        </button>
      </div>

      {/* Progress Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Nodes Unlocked */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Nodes Unlocked</span>
            <span className="text-blue-600 dark:text-blue-400">{nodePct}%</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {unlockedNodesCount} <span className="text-sm font-normal text-slate-400">/ {totalNodes}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${nodePct}%` }} />
          </div>
        </div>

        {/* Theorems Unlocked */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Theorems Unlocked</span>
            <span className="text-emerald-600 dark:text-emerald-400">{stmtPct}%</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {unlockedStatementsCount} <span className="text-sm font-normal text-slate-400">/ {totalStatements}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${stmtPct}%` }} />
          </div>
        </div>

        {/* Quiz Accuracy */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Quiz Accuracy</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {domainProgress.completedQuizCount > 0
              ? `${Math.round((domainProgress.correctQuizCount / domainProgress.completedQuizCount) * 100)}%`
              : 'N/A'}
          </div>
          <p className="text-xs text-slate-400">
            {domainProgress.correctQuizCount} of {domainProgress.completedQuizCount} questions correct
          </p>
        </div>
      </div>

      {/* Weak Edges List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Weak Edges & High-Failure Concepts
          </h3>
        </div>

        {weakCards.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            No weak edges identified yet. As you review flashcards and answer quiz questions, concepts that require extra attention will appear here!
          </p>
        ) : (
          <div className="space-y-3">
            {weakCards.map(card => (
              <div
                key={card.id}
                className="p-4 rounded-xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {card.type}
                  </span>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <MathView text={card.prompt} />
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                    {card.failCount} {card.failCount === 1 ? 'slip' : 'slips'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Ease: {card.easeFactor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
