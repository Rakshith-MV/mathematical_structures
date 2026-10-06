import React from 'react';
import { useStore } from './store/useStore';
import { Navbar } from './components/Navbar';
import { PathFinderBar } from './components/PathFinderBar';
import { GraphCanvas } from './components/GraphCanvas';
import { SidePanel } from './components/SidePanel';
import { ExploreView } from './components/ExploreView';
import { QuizView } from './components/QuizView';
import { MissingEdgeView } from './components/MissingEdgeView';
import { ReviewQueueView } from './components/ReviewQueueView';
import { ProgressView } from './components/ProgressView';
import { EditorView, resumeEditorAfterReload } from './components/EditorView';

export const App: React.FC = () => {
  const { activeMode, closeSidePanel, setActiveMode } = useStore();

  React.useEffect(() => {
    resumeEditorAfterReload();
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes side panel
      if (e.key === 'Escape') {
        closeSidePanel();
      }
      // If typing in input or select, don't trigger mode shortcuts
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      // Shortcuts 1-7 for quick mode switching
      if (e.key === '1') setActiveMode('graph');
      if (e.key === '2') setActiveMode('explore');
      if (e.key === '3') setActiveMode('quiz');
      if (e.key === '4') setActiveMode('puzzle');
      if (e.key === '5') setActiveMode('review');
      if (e.key === '6') setActiveMode('progress');
      if (e.key === '7') setActiveMode('editor');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSidePanel, setActiveMode]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeMode === 'graph' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Path Finder & Route Bar */}
            <PathFinderBar />

            {/* Canvas + Side Panel */}
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative">
              <GraphCanvas />
              <SidePanel />
            </div>
          </div>
        )}

        {activeMode === 'explore' && (
          <div className="flex-1 overflow-y-auto">
            <ExploreView />
          </div>
        )}

        {activeMode === 'quiz' && (
          <div className="flex-1 overflow-y-auto">
            <QuizView />
          </div>
        )}

        {activeMode === 'puzzle' && (
          <div className="flex-1 overflow-y-auto">
            <MissingEdgeView />
          </div>
        )}

        {activeMode === 'review' && (
          <div className="flex-1 overflow-y-auto">
            <ReviewQueueView />
          </div>
        )}

        {activeMode === 'progress' && (
          <div className="flex-1 overflow-y-auto">
            <ProgressView />
          </div>
        )}

        {activeMode === 'editor' && (
          <div className="flex-1 overflow-y-auto">
            <EditorView />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
