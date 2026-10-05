import React from 'react';
import { useStore, AppMode } from '../store/useStore';
import {
  Compass,
  Layers,
  HelpCircle,
  Puzzle,
  Calendar,
  BarChart3,
  Moon,
  Sun,
  Search,
  Eye,
  EyeOff,
  Download,
  Upload,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    availableDomains,
    currentDomain,
    domainData,
    activeContextId,
    showImpliedArrows,
    isDarkMode,
    activeMode,
    searchQuery,
    studyState,
    setDomain,
    setActiveContext,
    setShowImpliedArrows,
    toggleDarkMode,
    setActiveMode,
    setSearchQuery,
    importStudyJSON,
  } = useStore();

  const handleExport = () => {
    const jsonStr = JSON.stringify(studyState, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theorem_graph_progress_${currentDomain}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      if (content) {
        importStudyJSON(content);
      }
    };
    reader.readAsText(file);
  };

  const modes: { id: AppMode; label: string; icon: React.ReactNode }[] = [
    { id: 'graph', label: 'Graph', icon: <Compass className="w-4 h-4" /> },
    { id: 'explore', label: 'Fog of War', icon: <Layers className="w-4 h-4" /> },
    { id: 'quiz', label: 'Predict Arrow', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'puzzle', label: 'Missing Edge', icon: <Puzzle className="w-4 h-4" /> },
    { id: 'review', label: 'Review Queue', icon: <Calendar className="w-4 h-4" /> },
    { id: 'progress', label: 'Progress', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 shadow-sm transition-colors sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Brand & Domain */}
        <div className="flex items-center space-x-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-md text-base">
              𝒢
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-slate-100 flex items-center">
                Theorem Graph
                <span className="ml-1.5 px-1.5 py-0.2 text-[10px] uppercase font-bold tracking-wider rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Study App
                </span>
              </h1>
            </div>
          </div>

          {/* Domain Picker */}
          <select
            value={currentDomain}
            onChange={e => setDomain(e.target.value)}
            className="text-xs bg-slate-100 dark:bg-slate-800 border-none font-semibold text-slate-700 dark:text-slate-200 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
          >
            {availableDomains.map(d => (
              <option key={d} value={d}>
                Domain: {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-full">
          {modes.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                activeMode === m.id
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Graph Controls & Context */}
        <div className="flex items-center space-x-2 w-full lg:w-auto justify-end">
          {/* Context Switcher */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold text-slate-400 hidden xl:inline">Context:</span>
            <select
              value={activeContextId}
              onChange={e => setActiveContext(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Filter theorems valid in this context"
            >
              {domainData.contexts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Transitive Reduction Toggle */}
          <button
            onClick={() => setShowImpliedArrows(!showImpliedArrows)}
            className={`p-1.5 rounded-md border text-xs flex items-center space-x-1 transition-colors ${
              showImpliedArrows
                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
            title="Toggle showing implied transitive arrows"
          >
            {showImpliedArrows ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Implied</span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 w-24 sm:w-36 focus:w-48 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Import / Export */}
          <button
            onClick={handleExport}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"
            title="Export study progress JSON"
            aria-label="Export study progress JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <label
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded cursor-pointer"
            title="Import study progress JSON"
            aria-label="Import study progress JSON"
          >
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          {/* Dark Mode */}
          <button
            onClick={toggleDarkMode}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"
            title="Toggle Dark Mode"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
