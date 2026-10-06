import React from 'react';
import { useStore } from '../store/useStore';
import { MathView } from './MathView';
import { Context, Counterexample, DomainData, Property, Statement, StatementKind, ValidationIssue } from '../types';
import { validateDomainData } from '../lib/validator';
import { loadDomainFromModules } from '../lib/dataLoader';
import {
  EntityKind,
  applyOverlay,
  cleanEntity,
  downloadJSON,
  emptyOverlay,
  overlayChangeCount,
  saveDomainToDisk,
  slugify,
  upsertEntity,
} from '../lib/customData';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FolderPlus,
  HardDriveDownload,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';

type Entity = Property | Statement | Counterexample | Context;

const TABS: { kind: EntityKind; label: string; singular: string }[] = [
  { kind: 'properties', label: 'Definitions', singular: 'Definition' },
  { kind: 'statements', label: 'Theorems', singular: 'Theorem' },
  { kind: 'counterexamples', label: 'Counterexamples', singular: 'Counterexample' },
  { kind: 'contexts', label: 'Contexts', singular: 'Context' },
];

const FLASH_KEY = 'theorem_graph_editor_flash';

/** After "Write to data/" reloads the page, reopen the Editor on the domain that was written. */
export function resumeEditorAfterReload(): void {
  try {
    const stashed = sessionStorage.getItem(FLASH_KEY);
    if (!stashed) return;
    const { domain } = JSON.parse(stashed);
    const { availableDomains, setDomain, openEditor } = useStore.getState();
    if (domain && availableDomains.includes(domain)) setDomain(domain);
    openEditor(null);
  } catch {
    // ignore
  }
}

const inputClass =
  'w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500';

function blankEntity(kind: EntityKind, data: DomainData): Entity {
  switch (kind) {
    case 'properties':
      return { id: '', name: '', domain: data.domain, definition: '' };
    case 'statements':
      return {
        id: '',
        kind: 'implies',
        from: [],
        to: [],
        context: data.contexts[0]?.id || '',
        source: '',
        verified: false,
      };
    case 'counterexamples':
      return { id: '', name: '', description: '', satisfies: [], fails: [], source: '', verified: false };
    case 'contexts':
      return { id: '', name: '', assumptions: [], requiredProperties: [] };
  }
}

function entityLabel(kind: EntityKind, e: Entity, propName: (id: string) => string): string {
  if (kind === 'statements') {
    const s = e as Statement;
    if (s.name) return s.name;
    const arrow = s.kind === 'implies' ? '⇒' : s.kind === 'equivalent' ? '⇔' : '⇏';
    return `${s.from.map(propName).join(' ∧ ')} ${arrow} ${s.to.map(propName).join(', ')}`;
  }
  return (e as Property).name || e.id;
}

function suggestStatementId(s: Statement): string {
  const verb = s.kind === 'implies' ? 'implies' : s.kind === 'equivalent' ? 'iff' : 'not-implies';
  if (s.from.length === 0 || s.to.length === 0) return '';
  return `stmt-${s.from.join('-')}-${verb}-${s.to.join('-')}`;
}

export const EditorView: React.FC = () => {
  const {
    currentDomain,
    domainData,
    customData,
    editorTarget,
    openEditor,
    saveEntity,
    deleteEntity,
    revertEntity,
    createDomain,
    discardDomainChanges,
    selectProperty,
    selectStatement,
    selectCounterexample,
    setActiveMode,
  } = useStore();

  const kind: EntityKind = editorTarget?.kind ?? 'properties';
  const selectedId = editorTarget?.id ?? null;
  const overlay = customData.domains[currentDomain];
  const builtIn = React.useMemo(() => loadDomainFromModules(currentDomain), [currentDomain]);

  const [filter, setFilter] = React.useState('');
  const initialEntry = () => (selectedId ? (domainData[kind] as Entity[]).find(e => e.id === selectedId) : undefined);
  const [draftState, setDraft] = React.useState<Entity>(() => structuredClone(initialEntry()) ?? blankEntity(kind, domainData));
  const [idTouchedState, setIdTouched] = React.useState(() => !!initialEntry());
  const [flash, setFlash] = React.useState<{ ok: boolean; message: string } | null>(() => {
    // Writing to data/ makes Vite reload the page; pick up the message stashed before that.
    try {
      const stashed = sessionStorage.getItem(FLASH_KEY);
      return stashed ? JSON.parse(stashed) : null;
    } catch {
      return null;
    }
  });
  React.useEffect(() => {
    try {
      sessionStorage.removeItem(FLASH_KEY);
    } catch {
      // ignore
    }
  }, []);
  const [reloadKey, setReloadKey] = React.useState(0);

  const list = domainData[kind] as Entity[];
  const isNew = selectedId === null;

  // Load the selected entry (or a blank one) into the form whenever the target changes.
  // Done during render rather than in an effect so a form never sees a draft of the wrong kind.
  const targetKey = `${currentDomain}:${kind}:${selectedId ?? ''}:${reloadKey}`;
  const [loadedKey, setLoadedKey] = React.useState(targetKey);
  let draft = draftState;
  let idTouched = idTouchedState;
  if (loadedKey !== targetKey) {
    const existing = selectedId ? (domainData[kind] as Entity[]).find(e => e.id === selectedId) : undefined;
    draft = existing ? structuredClone(existing) : blankEntity(kind, domainData);
    idTouched = !!existing;
    setLoadedKey(targetKey);
    setDraft(draft);
    setIdTouched(idTouched);
  }

  React.useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const propMap = new Map(domainData.properties.map(p => [p.id, p]));
  const propName = (id: string) => propMap.get(id)?.name || id;

  const builtInIds = new Set((builtIn[kind] as Entity[]).map(e => e.id));
  const overlayIds = new Set(((overlay?.[kind] ?? []) as Entity[]).map(e => e.id));
  const deletedBuiltIns = overlay?.deleted[kind] ?? [];

  const status = (id: string): 'custom' | 'edited' | null =>
    overlayIds.has(id) ? (builtInIds.has(id) ? 'edited' : 'custom') : null;

  const update = (patch: Partial<Entity>) => setDraft(d => ({ ...d, ...patch }) as Entity);

  // Auto-derive the id from the name until the user edits the id by hand.
  const effectiveDraft: Entity = React.useMemo(() => {
    if (!isNew || idTouched) return draft;
    const auto = kind === 'statements' ? suggestStatementId(draft as Statement) : slugify((draft as Property).name);
    return { ...draft, id: auto } as Entity;
  }, [draft, isNew, idTouched, kind]);

  const cleaned = cleanEntity(effectiveDraft);

  // Validate the whole domain as it would look after saving this draft.
  const { draftIssues, idError } = React.useMemo(() => {
    const id = cleaned.id;
    let idError: string | null = null;
    if (!id) idError = 'ID is required';
    else if (!/^[a-zA-Z0-9_-]+$/.test(id)) idError = 'ID may only contain letters, digits, "-" and "_"';
    else if (isNew && list.some(e => e.id === id)) idError = `An entry with ID "${id}" already exists`;

    const baseline = validateDomainData(domainData);
    const baselineMsgs = new Set([...baseline.errors, ...baseline.warnings].map(i => i.message));
    const preview = applyOverlay(domainData, upsertEntity(emptyOverlay(), kind, cleaned));
    const after = validateDomainData(preview);
    const draftIssues: (ValidationIssue & { isNew: boolean })[] = [...after.errors, ...after.warnings]
      .map(i => ({ ...i, isNew: !baselineMsgs.has(i.message) }))
      .filter(i => i.isNew || (!!id && i.entityId === id));
    return { draftIssues, idError };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cleaned), domainData, isNew, kind]);

  const requiredMissing = requiredFieldError(kind, cleaned);
  // Only errors introduced by this draft block saving; pre-existing ones are shown for context.
  const blockingErrors = draftIssues.filter(i => i.type === 'error' && i.isNew);
  const canSave = !idError && !requiredMissing && blockingErrors.length === 0;

  const handleSave = () => {
    if (!canSave) return;
    saveEntity(kind, cleaned);
    openEditor({ kind, id: cleaned.id });
    setFlash({ ok: true, message: `Saved "${cleaned.id}" (stored in this browser)` });
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const refs = findReferences(kind, selectedId, domainData);
    const msg = refs.length
      ? `"${selectedId}" is referenced by: ${refs.slice(0, 6).join(', ')}${refs.length > 6 ? '…' : ''}.\nDelete anyway? Validation will flag the dangling references.`
      : `Delete "${selectedId}"?`;
    if (!window.confirm(msg)) return;
    deleteEntity(kind, selectedId);
    openEditor({ kind, id: null });
  };

  const handleViewInGraph = () => {
    const id = cleaned.id;
    if (kind === 'properties') selectProperty(domainData.properties.find(p => p.id === id) ?? null);
    else if (kind === 'statements') selectStatement(domainData.statements.find(s => s.id === id) ?? null);
    else if (kind === 'counterexamples') selectCounterexample(domainData.counterexamples.find(c => c.id === id) ?? null);
    setActiveMode('graph');
  };

  const handleExport = () => {
    downloadJSON(`${currentDomain}.contexts.json`, domainData.contexts);
    downloadJSON(`${currentDomain}.properties.json`, domainData.properties);
    downloadJSON(`${currentDomain}.statements.json`, domainData.statements);
    downloadJSON(`${currentDomain}.counterexamples.json`, domainData.counterexamples);
  };

  const handleSaveToDisk = async () => {
    const result = validateDomainData(domainData);
    if (!result.valid && !window.confirm(`The domain has ${result.errors.length} validation error(s). Write it anyway?`)) return;
    const res = await saveDomainToDisk(domainData);
    if (res.ok) {
      // The JSON files now contain the overlay, so it can be dropped.
      const message = { ok: true, message: `${res.message}. Commit the files to keep them.`, domain: currentDomain };
      try {
        sessionStorage.setItem(FLASH_KEY, JSON.stringify(message));
      } catch {
        // ignore: the message is a convenience
      }
      // The JSON files now contain the overlay, so it can be dropped.
      discardDomainChanges(currentDomain);
      setFlash(message);
      // Reload so the freshly written JSON becomes the built-in data.
      window.location.reload();
    } else {
      setFlash({ ok: false, message: `Could not write files (only works under "npm run dev"): ${res.message}` });
    }
  };

  const handleNewDomain = () => {
    const name = window.prompt('Name of the new domain (e.g. "algebra"):');
    if (!name) return;
    const slug = slugify(name);
    if (!slug) return;
    createDomain(slug);
    openEditor({ kind: 'contexts', id: null });
  };

  const handleDiscard = () => {
    if (!window.confirm(`Discard all ${overlayChangeCount(overlay)} local change(s) to "${currentDomain}"?`)) return;
    discardDomainChanges(currentDomain);
    openEditor({ kind, id: null });
  };

  const q = filter.trim().toLowerCase();
  const filtered = list.filter(e => !q || e.id.toLowerCase().includes(q) || entityLabel(kind, e, propName).toLowerCase().includes(q));
  const changeCount = overlayChangeCount(overlay);
  const domainResult = React.useMemo(() => validateDomainData(domainData), [domainData]);
  const singular = TABS.find(t => t.kind === kind)!.singular;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Content Editor</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Add or edit definitions, theorems, counterexamples and contexts for{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{currentDomain}</span>. Changes apply
            to the graph and study modes immediately and are stored in this browser.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              domainResult.valid
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
            }`}
            title={domainResult.errors.map(e => e.message).join('\n')}
          >
            {domainResult.valid ? 'Domain valid' : `${domainResult.errors.length} domain error(s)`}
          </span>
          {changeCount > 0 && (
            <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              {changeCount} local change(s)
            </span>
          )}
          <ToolbarButton onClick={handleNewDomain} icon={<FolderPlus className="w-3.5 h-3.5" />} label="New domain" />
          <ToolbarButton onClick={handleExport} icon={<Download className="w-3.5 h-3.5" />} label="Export JSON" />
          <ToolbarButton
            onClick={handleSaveToDisk}
            icon={<HardDriveDownload className="w-3.5 h-3.5" />}
            label="Write to data/"
            title="Write this domain to data/<domain>/*.json (dev server only)"
          />
          {changeCount > 0 && (
            <ToolbarButton onClick={handleDiscard} icon={<RotateCcw className="w-3.5 h-3.5" />} label="Discard changes" danger />
          )}
        </div>
      </div>

      {flash && (
        <div
          role="status"
          className={`text-sm px-3 py-2 rounded-md flex items-center space-x-2 ${
            flash.ok
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          {flash.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{flash.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" className="flex items-center space-x-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-lg w-fit max-w-full overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.kind}
            role="tab"
            aria-selected={kind === t.kind}
            onClick={() => openEditor({ kind: t.kind, id: null })}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${
              kind === t.kind
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t.label} <span className="opacity-60">({(domainData[t.kind] as Entity[]).length})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Entry list */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[70vh]">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <button
              onClick={() => openEditor({ kind, id: null })}
              className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New {singular}</span>
            </button>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder={`Filter ${TABS.find(t => t.kind === kind)!.label.toLowerCase()}…`}
                className={`${inputClass} pl-8 text-xs`}
              />
            </div>
          </div>
          <ul className="overflow-y-auto flex-1 p-1.5 space-y-0.5">
            {filtered.map(e => {
              const st = status(e.id);
              return (
                <li key={e.id}>
                  <button
                    onClick={() => openEditor({ kind, id: e.id })}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between gap-2 ${
                      selectedId === e.id
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">
                      <MathView text={entityLabel(kind, e, propName)} inline />
                    </span>
                    {st && (
                      <span
                        className={`shrink-0 text-[10px] uppercase font-bold px-1.5 rounded ${
                          st === 'custom'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {st}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="text-xs text-slate-400 p-3 text-center">No entries</li>}
          </ul>
          {deletedBuiltIns.length > 0 && (
            <div className="p-2 border-t border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="font-semibold text-slate-400 px-1">Deleted (built-in)</div>
              {deletedBuiltIns.map(id => (
                <div key={id} className="flex items-center justify-between px-1">
                  <span className="line-through text-slate-400 truncate">{id}</span>
                  <button onClick={() => revertEntity(kind, id)} className="text-blue-600 dark:text-blue-400 hover:underline">
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Form */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
              {isNew ? `New ${singular}` : `Edit ${singular}`}
            </h3>
            {!isNew && status(selectedId!) === 'edited' && (
              <button
                onClick={() => {
                  revertEntity(kind, selectedId!);
                  setReloadKey(k => k + 1);
                }}
                className="text-xs flex items-center space-x-1 text-amber-700 dark:text-amber-300 hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revert to built-in</span>
              </button>
            )}
          </div>

          {kind === 'properties' && <PropertyForm draft={draft as Property} update={update} />}
          {kind === 'statements' && <StatementForm draft={draft as Statement} update={update} data={domainData} />}
          {kind === 'counterexamples' && <CounterexampleForm draft={draft as Counterexample} update={update} data={domainData} />}
          {kind === 'contexts' && <ContextForm draft={draft as Context} update={update} data={domainData} />}

          <Field label="ID" hint={isNew ? 'Derived automatically; edit to override.' : 'IDs of existing entries cannot be changed.'}>
            <input
              value={cleaned.id ?? ''}
              disabled={!isNew}
              onChange={e => {
                setIdTouched(true);
                update({ id: e.target.value });
              }}
              className={`${inputClass} font-mono text-xs disabled:opacity-60`}
            />
          </Field>

          {/* Validation feedback */}
          {(idError || requiredMissing || draftIssues.length > 0) && (
            <div className="space-y-1.5">
              {[idError, requiredMissing].filter(Boolean).map(msg => (
                <IssueRow key={msg!} issue={{ type: 'error', message: msg! }} />
              ))}
              {draftIssues.map((i, idx) => (
                <IssueRow key={idx} issue={i} />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold"
            >
              <Save className="w-4 h-4" />
              <span>{isNew ? `Add ${singular}` : 'Save changes'}</span>
            </button>
            {!isNew && kind !== 'contexts' && (
              <button
                onClick={handleViewInGraph}
                className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                View in graph
              </button>
            )}
            {!isNew && (
              <button
                onClick={handleDelete}
                className="ml-auto flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Per-kind forms                                                      */
/* ------------------------------------------------------------------ */

type FormProps<T> = { draft: T; update: (patch: Partial<T>) => void; data?: DomainData };

const PropertyForm: React.FC<FormProps<Property>> = ({ draft, update }) => (
  <>
    <Field label="Name *" hint="LaTeX allowed, e.g. Hausdorff ($T_2$)">
      <input value={draft.name} onChange={e => update({ name: e.target.value })} className={inputClass} />
    </Field>
    <MathField label="Definition *" value={draft.definition} onChange={v => update({ definition: v })} rows={4} />
    <LinesField label="Equivalent forms" value={draft.equivalentForms} onChange={v => update({ equivalentForms: v })} />
    <LinesField label="Examples" value={draft.examples} onChange={v => update({ examples: v })} />
    <LinesField label="Non-examples" value={draft.nonExamples} onChange={v => update({ nonExamples: v })} />
    <MathField label="Notes" value={draft.notes ?? ''} onChange={v => update({ notes: v })} rows={2} />
  </>
);

const StatementForm: React.FC<FormProps<Statement> & { data: DomainData }> = ({ draft, update, data }) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Kind *">
        <select
          value={draft.kind}
          onChange={e => {
            const kind = e.target.value as StatementKind;
            update({ kind, witness: kind === 'not-implies' ? draft.witness : undefined });
          }}
          className={inputClass}
        >
          <option value="implies">Implies (A ⇒ B)</option>
          <option value="equivalent">Equivalent (A ⇔ B)</option>
          <option value="not-implies">Does not imply (A ⇏ B)</option>
        </select>
      </Field>
      <Field label="Context *" hint="Standing hypotheses under which this holds">
        <select value={draft.context} onChange={e => update({ context: e.target.value })} className={inputClass}>
          <option value="">Select a context…</option>
          {data.contexts.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label={draft.kind === 'equivalent' ? 'Properties (side A) *' : 'Hypotheses (from) *'} group>
        <PropertyPicker value={draft.from} onChange={v => update({ from: v })} data={data} />
      </Field>
      <Field label={draft.kind === 'equivalent' ? 'Properties (side B) *' : 'Conclusions (to) *'} group>
        <PropertyPicker value={draft.to} onChange={v => update({ to: v })} data={data} />
      </Field>
    </div>
    {draft.kind === 'not-implies' && (
      <Field label="Witness counterexample *" hint="A space satisfying the hypotheses but failing a conclusion">
        <select value={draft.witness ?? ''} onChange={e => update({ witness: e.target.value || undefined })} className={inputClass}>
          <option value="">Select a counterexample…</option>
          {data.counterexamples.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
    )}
    <Field label="Theorem name" hint='e.g. "Heine–Borel"'>
      <input value={draft.name ?? ''} onChange={e => update({ name: e.target.value })} className={inputClass} />
    </Field>
    <MathField label="Proof sketch" value={draft.proofSketch ?? ''} onChange={v => update({ proofSketch: v })} rows={4} />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Key lemma">
        <input value={draft.keyLemma ?? ''} onChange={e => update({ keyLemma: e.target.value })} className={inputClass} />
      </Field>
      <Field label="Lean / Mathlib name">
        <input value={draft.leanName ?? ''} onChange={e => update({ leanName: e.target.value })} className={`${inputClass} font-mono text-xs`} />
      </Field>
    </div>
    <SourceVerified draft={draft} update={update} />
  </>
);

const CounterexampleForm: React.FC<FormProps<Counterexample> & { data: DomainData }> = ({ draft, update, data }) => (
  <>
    <Field label="Name *">
      <input value={draft.name} onChange={e => update({ name: e.target.value })} className={inputClass} />
    </Field>
    <MathField label="Description *" value={draft.description} onChange={v => update({ description: v })} rows={4} />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Satisfies" group>
        <PropertyPicker value={draft.satisfies} onChange={v => update({ satisfies: v })} data={data} exclude={draft.fails} />
      </Field>
      <Field label="Fails" group>
        <PropertyPicker value={draft.fails} onChange={v => update({ fails: v })} data={data} exclude={draft.satisfies} />
      </Field>
    </div>
    <SourceVerified draft={draft} update={update} />
  </>
);

const ContextForm: React.FC<FormProps<Context> & { data: DomainData }> = ({ draft, update, data }) => (
  <>
    <Field label="Name *" hint='e.g. "Hausdorff (T2) Spaces"'>
      <input value={draft.name} onChange={e => update({ name: e.target.value })} className={inputClass} />
    </Field>
    <LinesField label="Assumptions" value={draft.assumptions} onChange={v => update({ assumptions: v ?? [] })} />
    <Field label="Required properties" hint="Properties every space in this context has" group>
      <PropertyPicker value={draft.requiredProperties ?? []} onChange={v => update({ requiredProperties: v })} data={data} />
    </Field>
  </>
);

/* ------------------------------------------------------------------ */
/* Field helpers                                                       */
/* ------------------------------------------------------------------ */

// Fields wrapping a single control are <label>s; groups of controls (pickers) must not be,
// or clicking the label would activate the first chip's remove button.
const Field: React.FC<{ label: string; hint?: string; group?: boolean; children: React.ReactNode }> = ({
  label,
  hint,
  group,
  children,
}) => {
  const Tag = group ? 'div' : 'label';
  return (
    <Tag className="block space-y-1" {...(group ? { role: 'group', 'aria-label': label } : {})}>
      <span className="block text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
    </Tag>
  );
};

const MathField: React.FC<{ label: string; value: string; onChange: (v: string) => void; rows?: number }> = ({
  label,
  value,
  onChange,
  rows = 3,
}) => (
  <div className="space-y-1">
    <Field label={label} hint="Use $...$ for inline and $$...$$ for display math.">
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} className={`${inputClass} font-mono text-xs`} />
    </Field>
    {value.trim() && (
      <div className="text-sm px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
        <MathView text={value} />
      </div>
    )}
  </div>
);

const LinesField: React.FC<{ label: string; value?: string[]; onChange: (v: string[] | undefined) => void }> = ({
  label,
  value,
  onChange,
}) => {
  const [text, setText] = React.useState((value ?? []).join('\n'));
  React.useEffect(() => {
    if ((value ?? []).join('\n') !== text.split('\n').filter(l => l.trim()).join('\n')) setText((value ?? []).join('\n'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field label={label} hint="One item per line. LaTeX allowed.">
      <textarea
        value={text}
        rows={Math.max(2, Math.min(6, text.split('\n').length))}
        onChange={e => {
          setText(e.target.value);
          const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean);
          onChange(lines.length ? lines : undefined);
        }}
        className={`${inputClass} font-mono text-xs`}
      />
    </Field>
  );
};

const PropertyPicker: React.FC<{ value: string[]; onChange: (v: string[]) => void; data: DomainData; exclude?: string[] }> = ({
  value,
  onChange,
  data,
  exclude = [],
}) => {
  const propMap = new Map(data.properties.map(p => [p.id, p]));
  const available = data.properties.filter(p => !value.includes(p.id) && !exclude.includes(p.id));
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1 min-h-[1.5rem]">
        {value.map(id => (
          <span
            key={id}
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              propMap.has(id)
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
            }`}
          >
            <MathView text={propMap.get(id)?.name || id} inline />
            <button type="button" onClick={() => onChange(value.filter(v => v !== id))} aria-label={`Remove ${id}`}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {value.length === 0 && <span className="text-xs text-slate-400 italic">None selected</span>}
      </div>
      <select
        value=""
        onChange={e => e.target.value && onChange([...value, e.target.value])}
        className={`${inputClass} text-xs`}
      >
        <option value="">+ Add property…</option>
        {available.map(p => (
          <option key={p.id} value={p.id}>
            {p.name.replace(/\$/g, '')}
          </option>
        ))}
      </select>
    </div>
  );
};

const SourceVerified: React.FC<{
  draft: { source: string; verified: boolean };
  update: (patch: { source?: string; verified?: boolean }) => void;
}> = ({ draft, update }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
    <Field label="Source *" hint="Textbook / paper reference, e.g. Munkres, Topology §33">
      <input value={draft.source} onChange={e => update({ source: e.target.value })} className={inputClass} />
    </Field>
    <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 pb-2">
      <input type="checkbox" checked={draft.verified} onChange={e => update({ verified: e.target.checked })} />
      <span>Verified</span>
    </label>
  </div>
);

const ToolbarButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; title?: string; danger?: boolean }> = ({
  onClick,
  icon,
  label,
  title,
  danger,
}) => (
  <button
    onClick={onClick}
    title={title ?? label}
    className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md border text-xs font-semibold ${
      danger
        ? 'border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const IssueRow: React.FC<{ issue: ValidationIssue }> = ({ issue }) => (
  <div
    className={`text-xs flex items-start space-x-1.5 px-2.5 py-1.5 rounded ${
      issue.type === 'error'
        ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
        : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
    }`}
  >
    {issue.type === 'error' ? <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />}
    <span>{issue.message}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

function requiredFieldError(kind: EntityKind, e: Entity): string | null {
  const missing: string[] = [];
  if (kind === 'properties') {
    const p = e as Property;
    if (!p.name?.trim()) missing.push('name');
    if (!p.definition?.trim()) missing.push('definition');
  } else if (kind === 'statements') {
    const s = e as Statement;
    if (!s.from?.length) missing.push('from');
    if (!s.to?.length) missing.push('to');
    if (!s.context) missing.push('context');
    if (!s.source?.trim()) missing.push('source');
    if (s.kind === 'not-implies' && !s.witness) missing.push('witness');
  } else if (kind === 'counterexamples') {
    const c = e as Counterexample;
    if (!c.name?.trim()) missing.push('name');
    if (!c.description?.trim()) missing.push('description');
    if (!c.source?.trim()) missing.push('source');
  } else {
    if (!(e as Context).name?.trim()) missing.push('name');
  }
  return missing.length ? `Required: ${missing.join(', ')}` : null;
}

function findReferences(kind: EntityKind, id: string, data: DomainData): string[] {
  const refs: string[] = [];
  if (kind === 'properties') {
    for (const s of data.statements) if (s.from.includes(id) || s.to.includes(id)) refs.push(s.id);
    for (const c of data.counterexamples) if (c.satisfies.includes(id) || c.fails.includes(id)) refs.push(c.id);
    for (const c of data.contexts) if (c.requiredProperties?.includes(id)) refs.push(c.id);
  } else if (kind === 'counterexamples') {
    for (const s of data.statements) if (s.witness === id) refs.push(s.id);
  } else if (kind === 'contexts') {
    for (const s of data.statements) if (s.context === id) refs.push(s.id);
  }
  return refs;
}
