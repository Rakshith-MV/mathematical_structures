import React from 'react';
import { useStore } from '../store/useStore';
import { MathView } from './MathView';
import { X, ArrowRight, CheckCircle2, AlertCircle, BookOpen, ExternalLink, Lightbulb, ShieldAlert } from 'lucide-react';

export const SidePanel: React.FC = () => {
  const {
    selectedProperty,
    selectedStatement,
    selectedCounterexample,
    domainData,
    closeSidePanel,
    selectProperty,
    selectStatement,
    selectCounterexample,
  } = useStore();

  if (!selectedProperty && !selectedStatement && !selectedCounterexample) {
    return null;
  }

  // Incoming and outgoing theorems for selected property
  const incomingStatements = selectedProperty
    ? domainData.statements.filter(s => s.to.includes(selectedProperty.id))
    : [];

  const outgoingStatements = selectedProperty
    ? domainData.statements.filter(s => s.from.includes(selectedProperty.id))
    : [];

  const propMap = new Map(domainData.properties.map(p => [p.id, p]));
  const ctxMap = new Map(domainData.contexts.map(c => [c.id, c]));

  return (
    <aside
      aria-label="Details panel"
      className="w-full md:w-96 lg:w-[420px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-xl z-20 overflow-hidden transition-colors"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center space-x-2">
          {selectedProperty && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              Definition / Node
            </span>
          )}
          {selectedStatement && (
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded ${
                selectedStatement.kind === 'implies'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : selectedStatement.kind === 'equivalent'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
              }`}
            >
              Theorem ({selectedStatement.kind})
            </span>
          )}
          {selectedCounterexample && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
              Counterexample
            </span>
          )}
        </div>
        <button
          onClick={closeSidePanel}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
          title="Close details"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Area */}
      <div className="p-5 overflow-y-auto flex-1 space-y-6 text-sm text-slate-700 dark:text-slate-300">
        {/* ================= PROPERTY DETAILS ================= */}
        {selectedProperty && (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                <MathView text={selectedProperty.name} />
              </h2>
              <span className="text-xs text-slate-400 font-mono mt-1 block">
                ID: {selectedProperty.id} | Domain: {selectedProperty.domain}
              </span>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                Mathematical Definition
              </h3>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 font-serif leading-relaxed text-slate-900 dark:text-slate-100">
                <MathView text={selectedProperty.definition} />
              </div>
            </div>

            {selectedProperty.equivalentForms && selectedProperty.equivalentForms.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                  Equivalent Characterizations
                </h3>
                <ul className="space-y-2 list-disc list-inside bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  {selectedProperty.equivalentForms.map((eq, i) => (
                    <li key={i} className="text-xs leading-normal">
                      <MathView text={eq} inline />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(selectedProperty.examples?.length || selectedProperty.nonExamples?.length) && (
              <div className="grid grid-cols-1 gap-3">
                {selectedProperty.examples && selectedProperty.examples.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Examples
                    </h3>
                    <ul className="text-xs space-y-1 list-disc list-inside text-slate-600 dark:text-slate-400">
                      {selectedProperty.examples.map((ex, i) => (
                        <li key={i}><MathView text={ex} inline /></li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedProperty.nonExamples && selectedProperty.nonExamples.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" /> Non-Examples
                    </h3>
                    <ul className="text-xs space-y-1 list-disc list-inside text-slate-600 dark:text-slate-400">
                      {selectedProperty.nonExamples.map((nex, i) => (
                        <li key={i}><MathView text={nex} inline /></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {selectedProperty.notes && (
              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1 flex items-center">
                  <Lightbulb className="w-3.5 h-3.5 mr-1 text-amber-500" /> Historical & Geometric Notes
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded border border-amber-200 dark:border-amber-900/50">
                  {selectedProperty.notes}
                </p>
              </div>
            )}

            {/* In / Out Theorems */}
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
                  Properties that Imply This ({incomingStatements.length})
                </h3>
                {incomingStatements.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No incoming stored implications.</p>
                ) : (
                  <div className="space-y-1.5">
                    {incomingStatements.map(stmt => (
                      <button
                        key={stmt.id}
                        onClick={() => selectStatement(stmt)}
                        className="w-full text-left p-2 rounded bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700/60 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>
                          {stmt.from.map(f => propMap.get(f)?.name || f).join(' + ')}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
                  Properties Implied by This ({outgoingStatements.length})
                </h3>
                {outgoingStatements.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No outgoing stored implications.</p>
                ) : (
                  <div className="space-y-1.5">
                    {outgoingStatements.map(stmt => (
                      <button
                        key={stmt.id}
                        onClick={() => selectStatement(stmt)}
                        className="w-full text-left p-2 rounded bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700/60 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-500 inline mr-1" />
                          {stmt.to.map(t => propMap.get(t)?.name || t).join(', ')}
                        </span>
                        <span className="text-[10px] text-slate-400">{stmt.kind}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ================= STATEMENT (EDGE) DETAILS ================= */}
        {selectedStatement && (
          <>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {selectedStatement.name || 'Theorem Statement'}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Context: {ctxMap.get(selectedStatement.context)?.name || selectedStatement.context}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    selectedStatement.verified
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {selectedStatement.verified ? 'Verified' : 'Pending Review (verified: false)'}
                </span>
              </div>
            </div>

            {/* Implication Formula */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 flex items-center justify-center space-x-3 text-center">
              <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs">
                {selectedStatement.from.map(f => propMap.get(f)?.name || f).join(' ∧ ')}
              </div>
              <div className="font-bold text-blue-600 dark:text-blue-400">
                {selectedStatement.kind === 'implies' && '⟹'}
                {selectedStatement.kind === 'equivalent' && '⟺'}
                {selectedStatement.kind === 'not-implies' && '⇏'}
              </div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs">
                {selectedStatement.to.map(t => propMap.get(t)?.name || t).join(' ∧ ')}
              </div>
            </div>

            {selectedStatement.proofSketch && (
              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                  Proof Sketch & Key Idea
                </h3>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 font-serif leading-relaxed text-slate-900 dark:text-slate-100 text-xs">
                  <MathView text={selectedStatement.proofSketch} />
                </div>
              </div>
            )}

            {selectedStatement.keyLemma && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/50">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 block mb-0.5">
                  Key Lemma / Anchor Tool:
                </span>
                <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                  {selectedStatement.keyLemma}
                </span>
              </div>
            )}

            {selectedStatement.witness && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900/50">
                <span className="text-xs font-semibold text-red-800 dark:text-red-300 block mb-1 flex items-center">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Refuting Counterexample:
                </span>
                <button
                  onClick={() => {
                    const ce = domainData.counterexamples.find(c => c.id === selectedStatement.witness);
                    if (ce) selectCounterexample(ce);
                  }}
                  className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center"
                >
                  {domainData.counterexamples.find(c => c.id === selectedStatement.witness)?.name || selectedStatement.witness}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </button>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-start space-x-2">
                <BookOpen className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-600 dark:text-slate-400 block">Source Reference:</span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedStatement.source}</span>
                </div>
              </div>

              {selectedStatement.leanName && (
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Mathlib: </span>
                  {selectedStatement.leanName}
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= COUNTEREXAMPLE DETAILS ================= */}
        {selectedCounterexample && (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                <MathView text={selectedCounterexample.name} />
              </h2>
              <span className="text-xs text-slate-400 font-mono mt-1 block">
                ID: {selectedCounterexample.id}
              </span>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                Space Description & Construction
              </h3>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 font-serif leading-relaxed text-slate-900 dark:text-slate-100 text-xs">
                <MathView text={selectedCounterexample.description} />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Satisfies ({selectedCounterexample.satisfies.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCounterexample.satisfies.map(pId => {
                    const prop = propMap.get(pId);
                    return (
                      <button
                        key={pId}
                        onClick={() => prop && selectProperty(prop)}
                        className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-xs hover:bg-emerald-100 transition-colors"
                      >
                        {prop?.name || pId}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> Fails ({selectedCounterexample.fails.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCounterexample.fails.map(pId => {
                    const prop = propMap.get(pId);
                    return (
                      <button
                        key={pId}
                        onClick={() => prop && selectProperty(prop)}
                        className="px-2 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded text-xs hover:bg-red-100 transition-colors"
                      >
                        {prop?.name || pId}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Reference:</span>
              <span className="text-slate-700 dark:text-slate-300 italic">{selectedCounterexample.source}</span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
