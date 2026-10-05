import React from 'react';
import { useStore } from '../store/useStore';
import { Navigation, Route, X, ChevronRight } from 'lucide-react';
import { Property } from '../types';
import { DeductionPath } from '../lib/graphEngine';

export const PathFinderBar: React.FC = () => {
  const {
    domainData,
    pathStartId,
    pathTargetId,
    foundPaths,
    selectedPathIndex,
    setPathStart,
    setPathTarget,
    setSelectedPathIndex,
    clearPathFinder,
  } = useStore();

  const isSearching = pathStartId && pathTargetId;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">
            <Route className="w-4 h-4 mr-1 text-blue-600" />
            Path Finder:
          </div>

          {/* Start selector */}
          <select
            value={pathStartId || ''}
            onChange={e => setPathStart(e.target.value || null)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Start Property (From)...</option>
            {domainData.properties.map((p: Property) => (
              <option key={p.id} value={p.id}>
                {p.name.replace(/\$/g, '')}
              </option>
            ))}
          </select>

          <ChevronRight className="w-4 h-4 text-slate-400" />

          {/* Target selector */}
          <select
            value={pathTargetId || ''}
            onChange={e => setPathTarget(e.target.value || null)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Target Property (To)...</option>
            {domainData.properties.map((p: Property) => (
              <option key={p.id} value={p.id}>
                {p.name.replace(/\$/g, '')}
              </option>
            ))}
          </select>

          {isSearching && (
            <button
              onClick={clearPathFinder}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded"
              title="Clear Path"
              aria-label="Clear Path"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Path Results & Hypotheses */}
        {isSearching && (
          <div className="flex flex-wrap items-center gap-2 text-xs w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {foundPaths.length === 0 ? (
              <span className="text-amber-600 dark:text-amber-400 italic">
                No deductive path found from start to target.
              </span>
            ) : (
              foundPaths.map((path: DeductionPath, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPathIndex(idx)}
                  className={`px-3 py-1.5 rounded-md border text-xs flex items-center space-x-1.5 transition-all ${
                    selectedPathIndex === idx
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Navigation className="w-3 h-3" />
                  <span>
                    Route {idx + 1} ({path.steps.length} {path.steps.length === 1 ? 'step' : 'steps'})
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded ${selectedPathIndex === idx ? 'bg-amber-700/60' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    Needs: {path.requiredContextNames.join(', ')}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
