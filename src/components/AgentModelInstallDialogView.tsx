import type { KeyboardEvent, MouseEvent } from "react";
import type { ProviderModelInfo } from "../types";

interface AgentModelInstallDialogViewProps {
  agentLabel: string;
  channel: string;
  search: string;
  filteredModels: ProviderModelInfo[];
  allModelsCount: number;
  selectedIds: Set<string>;
  includeBase: boolean;
  previewCount: number;
  levelsDisabled: boolean;
  unionLevels: string[];
  selectedLevels: Set<string>;
  budgetCsv: string;
  budgetsDisabled: boolean;
  factoryProvider: string;
  baseUrl: string;
  displayPrefix: string;
  noImageSupport: boolean;
  canInstall: boolean;
  isLoading: boolean;
  lastError: string | null;
  isProxyBaseUrl: boolean;
  onClose: () => void;
  onInstall: () => void;
  onSetAllVisible: (checked: boolean) => void;
  onToggleSelected: (id: string) => void;
  onChannelChange: (channel: string) => void;
  onSearchChange: (search: string) => void;
  onIncludeBaseChange: (checked: boolean) => void;
  onToggleLevel: (level: string, checked: boolean) => void;
  onBudgetCsvChange: (value: string) => void;
  onFactoryProviderChange: (provider: string) => void;
  onBaseUrlChange: (baseUrl: string) => void;
  onDisplayPrefixChange: (prefix: string) => void;
  onNoImageSupportChange: (checked: boolean) => void;
  onOverlayMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  onOverlayKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  formatThinkingSummary: (model: ProviderModelInfo) => string;
}

const PROVIDER_CHANNELS: Array<{ key: string; label: string }> = [
  { key: "claude", label: "Claude" },
  { key: "codex", label: "Codex" },
  { key: "gemini", label: "Gemini" },
  { key: "qwen", label: "Qwen" },
  { key: "github-copilot", label: "GitHub Copilot" },
  { key: "antigravity", label: "Antigravity" },
];

export function renderAgentModelInstallDialogView({
  agentLabel,
  channel,
  search,
  filteredModels,
  allModelsCount,
  selectedIds,
  includeBase,
  previewCount,
  levelsDisabled,
  unionLevels,
  selectedLevels,
  budgetCsv,
  budgetsDisabled,
  factoryProvider,
  baseUrl,
  displayPrefix,
  noImageSupport,
  canInstall,
  isLoading,
  lastError,
  isProxyBaseUrl,
  onClose,
  onInstall,
  onSetAllVisible,
  onToggleSelected,
  onChannelChange,
  onSearchChange,
  onIncludeBaseChange,
  onToggleLevel,
  onBudgetCsvChange,
  onFactoryProviderChange,
  onBaseUrlChange,
  onDisplayPrefixChange,
  onNoImageSupportChange,
  onOverlayMouseDown,
  onOverlayKeyDown,
  formatThinkingSummary,
}: AgentModelInstallDialogViewProps) {
  return (
    <div
      className="modal-overlay fixed inset-0 z-[1000] flex items-center justify-center bg-[color:var(--overlay)] p-4 backdrop-blur-[4px]"
      role="button"
      tabIndex={0}
      aria-label="Close dialog"
      onMouseDown={onOverlayMouseDown}
      onKeyDown={onOverlayKeyDown}
    >
      <div className="modal-content modal-content-wide w-full max-w-[960px] max-h-[85vh] overflow-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-1)] p-5">
        <h3 className="modal-title text-base font-semibold">Add Models to {agentLabel}</h3>
        <p className="modal-subtitle mt-1.5 text-sm text-[color:var(--text-secondary)]">
          Pick a provider catalog, select models, and choose reasoning variants to install into
          Factory custom models.
        </p>

        {lastError ? (
          <div className="auth-result-banner error mt-4 rounded-md border border-[color:var(--danger)]/20" role="alert">
            <p className="auth-result-message">{lastError}</p>
          </div>
        ) : null}

        <div className="agent-model-controls mt-4 flex flex-wrap items-end gap-3">
          <label className="agent-model-field flex min-w-[180px] flex-col gap-1">
            <span className="agent-model-label">Provider</span>
            <select
              value={channel}
              onChange={(e) => onChannelChange(e.target.value)}
              className="agent-model-select"
            >
              {PROVIDER_CHANNELS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="agent-model-field flex min-w-[240px] flex-1 flex-col gap-1">
            <span className="agent-model-label">Search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter models..."
            />
          </label>
        </div>

        <div className="agent-model-grid mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="agent-model-pane border-t border-[color:var(--border)] pt-3">
            <div className="agent-model-pane-head mb-2 flex items-center justify-between gap-2">
              <div className="agent-model-pane-title flex flex-col gap-0.5">
                <strong>Models</strong>
                <span className="agent-model-pane-meta text-xs text-[color:var(--text-muted)]">
                  {isLoading ? "Loading..." : `${filteredModels.length} shown / ${allModelsCount} total`}
                </span>
              </div>
              <label className="checkbox-row inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={
                    filteredModels.length > 0 &&
                    filteredModels.every((m) => selectedIds.has(m.id))
                  }
                  onChange={(e) => onSetAllVisible(e.target.checked)}
                />
                Select visible
              </label>
            </div>

            <div className="usage-table-wrap model-table-wrap overflow-auto rounded-md border border-[color:var(--border)]">
              <table className="usage-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>Add</th>
                    <th>Model</th>
                    <th>Thinking</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModels.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(m.id)}
                          onChange={() => onToggleSelected(m.id)}
                        />
                      </td>
                      <td>
                        <div className="model-cell flex flex-col gap-0.5">
                          <div className="model-primary font-semibold text-[color:var(--text-primary)]">
                            {m.id}
                          </div>
                          {m.display_name ? (
                            <div className="model-secondary text-xs text-[color:var(--text-muted)]">
                              {m.display_name}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="model-secondary text-xs text-[color:var(--text-muted)]">
                        {formatThinkingSummary(m)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="agent-model-pane border-t border-[color:var(--border)] pt-3">
            <div className="agent-model-pane-head mb-2 flex items-center justify-between gap-2">
              <div className="agent-model-pane-title flex flex-col gap-0.5">
                <strong>Install Options</strong>
                <span className="agent-model-pane-meta text-xs text-[color:var(--text-muted)]">
                  {previewCount} variants
                </span>
              </div>
            </div>

            <div className="agent-model-options flex flex-col gap-2">
              <label className="checkbox-row inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeBase}
                  onChange={(e) => onIncludeBaseChange(e.target.checked)}
                />
                Include base model
              </label>

              <div className="agent-model-section border-t border-[color:var(--border)] pt-2.5">
                <div className="agent-model-section-title text-sm font-medium text-[color:var(--text-secondary)]">
                  Reasoning levels
                </div>
                <div className={`agent-model-chiprow mt-1 flex flex-wrap gap-1.5 ${levelsDisabled ? "is-disabled opacity-60" : ""}`}>
                  {unionLevels.length === 0 ? (
                    <span className="empty-note text-sm text-[color:var(--text-muted)]">
                      Select a model with level-based reasoning.
                    </span>
                  ) : (
                    unionLevels.map((level) => (
                      <label key={level} className="chip-check inline-flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedLevels.has(level)}
                          onChange={(e) => onToggleLevel(level, e.target.checked)}
                        />
                        <span>{level}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="agent-model-section border-t border-[color:var(--border)] pt-2.5">
                <div className="agent-model-section-title text-sm font-medium text-[color:var(--text-secondary)]">
                  Thinking budgets
                </div>
                <input
                  type="text"
                  value={budgetCsv}
                  onChange={(e) => onBudgetCsvChange(e.target.value)}
                  disabled={budgetsDisabled}
                  placeholder="e.g. 4000, 10000, 32000"
                />
                <div className="agent-model-hint text-xs text-[color:var(--text-muted)]">
                  Budgets above ~32000 will be clamped by CodeForwarder.
                </div>
              </div>

              <div className="agent-model-section border-t border-[color:var(--border)] pt-2.5">
                <div className="agent-model-section-title text-sm font-medium text-[color:var(--text-secondary)]">
                  Factory mapping
                </div>
                <label className="agent-model-inline grid grid-cols-[90px_1fr] items-center gap-2">
                  <span className="text-xs text-[color:var(--text-muted)]">Provider</span>
                  <select
                    value={factoryProvider}
                    onChange={(e) => onFactoryProviderChange(e.target.value)}
                  >
                    <option value="anthropic">anthropic</option>
                    <option value="openai">openai</option>
                  </select>
                </label>
                <label className="agent-model-inline grid grid-cols-[90px_1fr] items-center gap-2">
                  <span className="text-xs text-[color:var(--text-muted)]">Base URL</span>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => onBaseUrlChange(e.target.value)}
                  />
                </label>
                {!isProxyBaseUrl ? (
                  <div className="agent-model-hint text-xs text-[color:var(--text-muted)]">
                    Only proxy URLs on localhost:8317 are supported.
                  </div>
                ) : null}
                <label className="agent-model-inline grid grid-cols-[90px_1fr] items-center gap-2">
                  <span className="text-xs text-[color:var(--text-muted)]">Name prefix</span>
                  <input
                    type="text"
                    value={displayPrefix}
                    onChange={(e) => onDisplayPrefixChange(e.target.value)}
                    placeholder={`${agentLabel}: `}
                  />
                </label>
                <label className="checkbox-row inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={noImageSupport}
                    onChange={(e) => onNoImageSupportChange(e.target.checked)}
                  />
                  Mark as no image support
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="modal-buttons mt-4 flex justify-end gap-2">
          <button type="button" className="btn btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canInstall || isLoading}
            onClick={onInstall}
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
