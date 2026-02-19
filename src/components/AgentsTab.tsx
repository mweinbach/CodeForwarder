import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Lock, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import type {
  AgentInstallResult,
  FactoryCustomModelsRemoveResult,
  FactoryCustomModelsState,
  FactoryCustomModelRow,
} from "../types";
import { toErrorMessage } from "../utils/error";
import AgentModelInstallDialog from "./AgentModelInstallDialog";
import CustomModelEditDialog from "./CustomModelEditDialog";
import TabHeader from "./TabHeader";

const FACTORY_NAMESPACE_KEY = "codeforwarder";

interface AgentsUiState {
  search: string;
  selectedIds: Set<string>;
  lastAddResult: AgentInstallResult | null;
  lastRemoveResult: FactoryCustomModelsRemoveResult | null;
  lastError: string | null;
  isLoading: boolean;
  isBusy: boolean;
  showInstallDialog: boolean;
  editingModel: FactoryCustomModelRow | null;
}

interface FeedbackBannersProps {
  lastAddResult: AgentInstallResult | null;
  lastRemoveResult: FactoryCustomModelsRemoveResult | null;
  lastError: string | null;
}

function FeedbackBanners({
  lastAddResult,
  lastRemoveResult,
  lastError,
}: FeedbackBannersProps) {
  return (
    <>
      {lastAddResult ? (
        <div
          className="auth-result-banner success rounded-md border border-[color:var(--ok)]/25"
          role="status"
          aria-live="polite"
        >
          <p className="auth-result-message">
            Added {lastAddResult.added} (skipped {lastAddResult.skipped_duplicates} duplicates)
          </p>
        </div>
      ) : null}

      {lastRemoveResult ? (
        <div
          className="auth-result-banner success rounded-md border border-[color:var(--ok)]/25"
          role="status"
          aria-live="polite"
        >
          <p className="auth-result-message">
            Removed {lastRemoveResult.removed}.
            {lastRemoveResult.skippedNonProxy > 0
              ? ` Skipped ${lastRemoveResult.skippedNonProxy} non-proxy.`
              : ""}
            {lastRemoveResult.skippedNotFound > 0
              ? ` ${lastRemoveResult.skippedNotFound} not found.`
              : ""}
          </p>
        </div>
      ) : null}

      {lastError ? (
        <div
          className="auth-result-banner error rounded-md border border-[color:var(--danger)]/20"
          role="alert"
        >
          <p className="auth-result-message">{lastError}</p>
        </div>
      ) : null}
    </>
  );
}

interface ModelsTableProps {
  filteredModels: FactoryCustomModelRow[];
  allModelsCount: number;
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  visibleRemovableIdsCount: number;
  isLoading: boolean;
  isBusy: boolean;
  factorySettingsPath: string | null;
  canEdit: (m: FactoryCustomModelRow) => boolean;
  canRemove: (m: FactoryCustomModelRow) => boolean;
  onToggleAllVisible: (checked: boolean) => void;
  onToggleRow: (id: string) => void;
  onEdit: (model: FactoryCustomModelRow) => void;
  onRemoveOne: (id: string) => void;
}

function ModelsTable({
  filteredModels,
  allModelsCount,
  selectedIds,
  allVisibleSelected,
  visibleRemovableIdsCount,
  isLoading,
  isBusy,
  factorySettingsPath,
  canEdit,
  canRemove,
  onToggleAllVisible,
  onToggleRow,
  onEdit,
  onRemoveOne,
}: ModelsTableProps) {
  return (
    <>
      <div className="usage-table-wrap model-table-wrap overflow-auto rounded-md border border-[color:var(--border)]">
        <table className="usage-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => onToggleAllVisible(e.target.checked)}
                  disabled={visibleRemovableIdsCount === 0}
                />
              </th>
              <th>Model</th>
              <th style={{ width: 120 }}>Provider</th>
              <th>Base URL</th>
              <th style={{ width: 110 }}>Type</th>
              <th style={{ width: 170 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredModels.map((m) => (
              <tr key={m.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.id)}
                    onChange={() => onToggleRow(m.id)}
                    disabled={!canRemove(m)}
                  />
                </td>
                <td>
                  <div className="model-cell flex flex-col gap-0.5">
                    <div className="model-primary font-semibold text-[color:var(--text-primary)]">
                      {m.displayName}
                      {m.isSessionDefault ? (
                        <span className="model-secondary text-xs text-[color:var(--text-muted)]">
                          {" "}
                          (default)
                        </span>
                      ) : null}
                    </div>
                    <div className="model-secondary text-xs text-[color:var(--text-muted)]">
                      {m.model}
                    </div>
                    <div className="model-secondary text-xs text-[color:var(--text-muted)]">
                      {m.id}
                    </div>
                  </div>
                </td>
                <td className="model-secondary text-xs text-[color:var(--text-muted)]">
                  {m.provider}
                </td>
                <td className="model-secondary text-xs text-[color:var(--text-muted)]">
                  {m.baseUrl}
                </td>
                <td className="model-secondary text-xs text-[color:var(--text-muted)]">
                  {m.isProxy ? "proxy" : "external"}
                </td>
                <td>
                  {m.isProxy ? (
                    <div className="models-actions inline-flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onEdit(m)}
                        disabled={!canEdit(m)}
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onRemoveOne(m.id)}
                        disabled={isBusy || !canRemove(m)}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="model-secondary inline-flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
                      <Lock size={14} />
                      view-only
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredModels.length === 0 ? (
              <tr>
                <td colSpan={6} className="model-secondary text-xs text-[color:var(--text-muted)]">
                  {allModelsCount === 0
                    ? "No custom models found."
                    : isLoading
                      ? "Loading..."
                      : "No matches."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="agent-model-hint text-xs text-[color:var(--text-muted)]">
        {factorySettingsPath ? `Factory: ${factorySettingsPath}` : ""}
      </div>
    </>
  );
}

export default function AgentsTab() {
  const [modelsState, setModelsState] = useState<FactoryCustomModelsState | null>(null);
  const [ui, setUi] = useState<AgentsUiState>({
    search: "",
    selectedIds: new Set(),
    lastAddResult: null,
    lastRemoveResult: null,
    lastError: null,
    isLoading: true,
    isBusy: false,
    showInstallDialog: false,
    editingModel: null,
  });

  const models = modelsState?.models ?? [];
  const canRemove = (m: FactoryCustomModelRow) => m.isProxy && !m.isSessionDefault;
  const canEdit = (m: FactoryCustomModelRow) => m.isProxy;

  const refresh = async () => {
    setUi((prev) => ({ ...prev, isLoading: true }));
    try {
      const next = await invoke<FactoryCustomModelsState>("list_factory_custom_models");
      setModelsState(next);
      setUi((prev) => ({ ...prev, isLoading: false, lastError: null }));
    } catch (err) {
      setModelsState(null);
      setUi((prev) => ({
        ...prev,
        isLoading: false,
        lastError: toErrorMessage(err, "Failed to load Factory custom models"),
      }));
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredModels = useMemo(() => {
    const q = ui.search.trim().toLowerCase();
    if (q === "") return models;
    return models.filter((m) => {
      const id = m.id.toLowerCase();
      const model = m.model.toLowerCase();
      const dn = m.displayName.toLowerCase();
      const provider = m.provider.toLowerCase();
      const baseUrl = m.baseUrl.toLowerCase();
      return (
        id.includes(q) ||
        model.includes(q) ||
        dn.includes(q) ||
        provider.includes(q) ||
        baseUrl.includes(q)
      );
    });
  }, [models, ui.search]);

  const visibleRemovableIds = useMemo(
    () => filteredModels.filter((m) => canRemove(m)).map((m) => m.id),
    [filteredModels],
  );

  const allVisibleSelected =
    visibleRemovableIds.length > 0 &&
    visibleRemovableIds.every((id) => ui.selectedIds.has(id));

  const toggleRowSelected = (id: string) => {
    setUi((prev) => {
      const next = new Set(prev.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, selectedIds: next };
    });
  };

  const setAllVisibleSelected = (checked: boolean) => {
    setUi((prev) => {
      const next = new Set(prev.selectedIds);
      for (const id of visibleRemovableIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return { ...prev, selectedIds: next };
    });
  };

  const removeModels = async (ids: string[]) => {
    if (ids.length === 0) return;
    setUi((prev) => ({ ...prev, isBusy: true, lastError: null }));
    try {
      const result = await invoke<FactoryCustomModelsRemoveResult>(
        "remove_factory_custom_models",
        {
          ids,
        },
      );
      setUi((prev) => ({
        ...prev,
        lastRemoveResult: result,
        lastAddResult: null,
        selectedIds: new Set(),
      }));
      await refresh();
    } catch (err) {
      setUi((prev) => ({
        ...prev,
        lastError: toErrorMessage(err, "Failed to remove models"),
      }));
    } finally {
      setUi((prev) => ({ ...prev, isBusy: false }));
    }
  };

  const proxyCount = models.filter((m) => m.isProxy).length;
  const externalCount = models.length - proxyCount;

  return (
    <div className="tab-content animate-in flex flex-col gap-6 pb-6">
      <TabHeader
        title="Custom Models"
        subtitle="Manage Factory custom models powered by CodeForwarder."
      />

      <FeedbackBanners
        lastAddResult={ui.lastAddResult}
        lastRemoveResult={ui.lastRemoveResult}
        lastError={ui.lastError}
      />

      <section className="settings-section">
        <div className="stats-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{models.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Proxy</span>
            <span className="stat-value">{proxyCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">External</span>
            <span className="stat-value">{externalCount}</span>
          </div>
        </div>

        <div className="agent-card rounded-xl">
          <div className="agent-card-body flex flex-col gap-3">
            <div className="agent-actions inline-flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setUi((prev) => ({ ...prev, showInstallDialog: true }))}
                disabled={ui.isBusy}
              >
                <Plus size={14} />
                Add Models
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => removeModels(Array.from(ui.selectedIds))}
                disabled={ui.isBusy || ui.selectedIds.size === 0}
              >
                <Trash2 size={14} />
                Remove Selected
              </button>
              <button type="button" className="btn btn-sm" onClick={refresh} disabled={ui.isBusy}>
                <RefreshCw size={14} className={ui.isLoading ? "spin" : ""} />
                Refresh
              </button>
            </div>

            <label className="agent-model-field flex min-w-[260px] flex-col gap-1">
              <span className="agent-model-label">Search</span>
              <input
                type="text"
                value={ui.search}
                onChange={(e) => setUi((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Filter by name, model id, provider, base URL..."
              />
            </label>

            <ModelsTable
              filteredModels={filteredModels}
              allModelsCount={models.length}
              selectedIds={ui.selectedIds}
              allVisibleSelected={allVisibleSelected}
              visibleRemovableIdsCount={visibleRemovableIds.length}
              isLoading={ui.isLoading}
              isBusy={ui.isBusy}
              factorySettingsPath={modelsState?.factorySettingsPath ?? null}
              canEdit={canEdit}
              canRemove={canRemove}
              onToggleAllVisible={setAllVisibleSelected}
              onToggleRow={toggleRowSelected}
              onEdit={(model) => setUi((prev) => ({ ...prev, editingModel: model }))}
              onRemoveOne={(id) => removeModels([id])}
            />
          </div>
        </div>
      </section>

      <AgentModelInstallDialog
        isOpen={ui.showInstallDialog}
        agentKey={FACTORY_NAMESPACE_KEY}
        agentLabel="Custom Models"
        defaultDisplayPrefix=""
        onClose={() => setUi((prev) => ({ ...prev, showInstallDialog: false }))}
        onInstalled={async (result) => {
          setUi((prev) => ({
            ...prev,
            lastAddResult: result,
            lastRemoveResult: null,
          }));
          await refresh();
        }}
      />

      <CustomModelEditDialog
        isOpen={ui.editingModel != null}
        model={ui.editingModel}
        onClose={() => setUi((prev) => ({ ...prev, editingModel: null }))}
        onSaved={async () => {
          await refresh();
        }}
      />
    </div>
  );
}
