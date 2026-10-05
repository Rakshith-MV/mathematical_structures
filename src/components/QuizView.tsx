import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { generateQuizQuestions, QuizQuestion, ArrowRelation } from '../lib/quizEngine';
import { MathView } from './MathView';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight, RotateCcw } from 'lucide-react';

export const QuizView: React.FC = () => {
  const { domainData, activeContextId, recordQuizResult } = useStore();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedRelation, setSelectedRelation] = useState<ArrowRelation | null>(null);
  const [selectedCEId, setSelectedCEId] = useState<string | null>(null);
  const [step, setStep] = useState<'pick-relation' | 'pick-counterexample' | 'result'>('pick-relation');
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  const resetQuiz = () => {
    const qList = generateQuizQuestions(domainData, activeContextId, 10);
    setQuestions(qList);
    setCurrentQIndex(0);
    setSelectedRelation(null);
    setSelectedCEId(null);
    setStep('pick-relation');
  };

  useEffect(() => {
    resetQuiz();
  }, [domainData, activeContextId]);

  const currentQ = questions[currentQIndex];

  if (!currentQ) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          No strictly determined pairs in this context
        </h3>
        <p className="text-sm text-slate-500">
          In this context, there are currently no property pairs whose relationship is fully determined by the data. Try selecting another context like General Topological Spaces!
        </p>
        <button
          onClick={resetQuiz}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          Reload Questions
        </button>
      </div>
    );
  }

  const handleChooseRelation = (relation: ArrowRelation) => {
    setSelectedRelation(relation);

    // If answer or relation is neither and counterexample selection is needed
    if (relation === 'neither' && currentQ.counterexampleChoices && currentQ.counterexampleChoices.length > 0) {
      setStep('pick-counterexample');
    } else {
      // Evaluate directly
      const isCorrect = relation === currentQ.relation;
      if (isCorrect) {
        setScore(s => s + 1);
      }
      setAnsweredCount(c => c + 1);
      recordQuizResult(isCorrect);
      setStep('result');
    }
  };

  const handleChooseCounterexample = (ceId: string) => {
    setSelectedCEId(ceId);

    const isRelationCorrect = selectedRelation === currentQ.relation;
    const isCECorrect = ceId === currentQ.correctCounterexampleId;
    const isOverallCorrect = isRelationCorrect && isCECorrect;

    if (isOverallCorrect) {
      setScore(s => s + 1);
    }
    setAnsweredCount(c => c + 1);
    recordQuizResult(isOverallCorrect);
    setStep('result');
  };

  const handleNext = () => {
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(i => i + 1);
      setSelectedRelation(null);
      setSelectedCEId(null);
      setStep('pick-relation');
    } else {
      // End of round
      resetQuiz();
    }
  };

  const isCurrentCorrect =
    selectedRelation === currentQ.relation &&
    (selectedRelation !== 'neither' || selectedCEId === currentQ.correctCounterexampleId);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Top status */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Predict the Arrow | Question {currentQIndex + 1} of {questions.length}
          </span>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Context: <span className="text-blue-600 dark:text-blue-400">{currentQ.context.name}</span>
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-lg font-black text-slate-900 dark:text-slate-100">{score}</span>
            <span className="text-xs text-slate-400"> / {answeredCount} Correct</span>
          </div>
          <button
            onClick={resetQuiz}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
            title="Reset Quiz"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md space-y-8">
        {/* Properties display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Property A */}
          <div className="p-6 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Property A
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              <MathView text={currentQ.propA.name} />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-serif line-clamp-3">
              <MathView text={currentQ.propA.definition} />
            </p>
          </div>

          {/* Property B */}
          <div className="p-6 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-800 text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Property B
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              <MathView text={currentQ.propB.name} />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-serif line-clamp-3">
              <MathView text={currentQ.propB.definition} />
            </p>
          </div>
        </div>

        {/* Step 1: Relation buttons */}
        {step === 'pick-relation' && (
          <div className="space-y-4">
            <p className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Which implication arrow connects Property A and Property B?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => handleChooseRelation('implies')}
                className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-500 text-slate-900 dark:text-slate-100 font-bold text-base flex flex-col items-center justify-center space-y-1 transition-all shadow-sm"
              >
                <span className="text-2xl text-blue-600">⟹</span>
                <span className="text-xs font-medium">A implies B</span>
              </button>

              <button
                onClick={() => handleChooseRelation('implied-by')}
                className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-500 text-slate-900 dark:text-slate-100 font-bold text-base flex flex-col items-center justify-center space-y-1 transition-all shadow-sm"
              >
                <span className="text-2xl text-blue-600">⟸</span>
                <span className="text-xs font-medium">B implies A</span>
              </button>

              <button
                onClick={() => handleChooseRelation('equivalent')}
                className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 hover:border-emerald-500 text-slate-900 dark:text-slate-100 font-bold text-base flex flex-col items-center justify-center space-y-1 transition-all shadow-sm"
              >
                <span className="text-2xl text-emerald-600">⟺</span>
                <span className="text-xs font-medium">Equivalent</span>
              </button>

              <button
                onClick={() => handleChooseRelation('neither')}
                className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/40 hover:border-red-500 text-slate-900 dark:text-slate-100 font-bold text-base flex flex-col items-center justify-center space-y-1 transition-all shadow-sm"
              >
                <span className="text-2xl text-red-500">✗</span>
                <span className="text-xs font-medium">Neither</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pick Counterexample */}
        {step === 'pick-counterexample' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-center text-xs font-medium text-amber-800 dark:text-amber-300">
              You selected <strong>Neither</strong>. Select the counterexample from the domain that refutes the implication:
            </div>

            <div className="space-y-2">
              {currentQ.counterexampleChoices?.map(ce => (
                <button
                  key={ce.id}
                  onClick={() => handleChooseCounterexample(ce.id)}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all text-xs"
                >
                  <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                    <MathView text={ce.name} inline />
                  </div>
                  <div className="text-slate-500 font-serif text-[11px] line-clamp-2">
                    <MathView text={ce.description} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Result Feedback */}
        {step === 'result' && (
          <div className="space-y-6 animate-in zoom-in-95 duration-200">
            <div
              className={`p-5 rounded-xl border flex items-start space-x-3 ${
                isCurrentCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100'
              }`}
            >
              {isCurrentCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <span className="text-sm font-bold block">
                  {isCurrentCorrect ? 'Correct!' : 'Incorrect'}
                </span>
                <p className="leading-relaxed">{currentQ.explanation}</p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
            >
              <span>{currentQIndex + 1 < questions.length ? 'Next Question' : 'Complete Round'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
