import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Bot, RefreshCw } from "lucide-react";
import type { ProviderModelDefinitionsResponse, ProviderModelInfo, AgentInstallResult } from "../types";
import { toErrorMessage } from "../utils/error";
import AgentModelInstallDialog from "./AgentModelInstallDialog";
import TabHeader from "./TabHeader";

const PROVIDER_CHANNELS: Array<{ key: string; label: string }> = [
  { key: "claude", label: "Claude" },
  { key: "codex", label: "Codex" },
  { key: "gemini", label: "Gemini" },
  { key: "qwen", label: "Qwen" },
  { key: "github-copilot", label: "GitHub Copilot" },
  { key: "antigravity", label: "Antigravity" },
];

function hasThinkingLevels(model: ProviderModelInfo): string[] {
  const levels = model.thinking?.levels;
  return Array.isArray(levels) ? levels.filter((v) => typeof v === "string" && v.trim() !== "") : [];
}

function formatThinkingSummary(model: ProviderModelInfo): string {
  const levels = hasThinkingLevels(model);
  if (levels.length > 0) {
    return `Levels: ${levels.join(", ")}`;
  }
  if (model.thinking?.min != null || model.thinking?.max != null) {
    const min = model.thinking?.min != null ? String(model.thinking.min) : "?";
    const max = model.thinking?.max != null ? String(model.thinking.max) : "?";
    return `Budget: ${min}-${max}`;
  }
  return "-";
}

function supportsThinking(model: ProviderModelInfo): boolean {
  if (hasThinkingLevels(model).length > 0) return true;
  return model.thinking?.min != null || model.thinking?.max != null;
}

interface ModelsTabQueryState {
  channel: string;
  search: string;
}

interface ModelsTabDataState {
  modelsResponse: ProviderModelDefinitionsResponse | null;
  isLoading: boolean;
  lastError: string | null;
}

interface ModelsTabInstallState {
  showInstallDialog: boolean;
  lastInstallResult: AgentInstallResult | null;
}

export default function ModelsTab() {
  const [query, setQuery] = useState<ModelsTabQueryState>({
    channel: "claude",
    search: "",
  });
  const [dataState, setDataState] = useState<ModelsTabDataState>({
    modelsResponse: null,
    isLoading: false,
    lastError: null,
  });
  const [installState, setInstallState] = useState<ModelsTabInstallState>({
    showInstallDialog: false,
    lastInstallResult: null,
  });

  const refresh = async () => {
    setDataState((prev) => ({ ...prev, isLoading: true, lastError: null }));
    try {
      const resp = await invoke<ProviderModelDefinitionsResponse>("get_provider_model_definitions", {
        channel: query.channel,
      });
      setDataState({
        modelsResponse: resp,
        isLoading: false,
        lastError: null,
      });
    } catch (err) {
      setDataState({
        modelsResponse: null,
        isLoading: false,
        lastError: toErrorMessage(err, "Failed to load models (make sure Proxy Engine is running)"),
      });
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.channel]);

  const allModels = dataState.modelsResponse?.models ?? [];
  const thinkingReadyCount = allModels.filter((model) => supportsThinking(model)).length;

  const filteredModels = useMemo(() => {
    const q = query.search.trim().toLowerCase();
    if (q === "") return allModels;
    return allModels.filter((m) => {
      const id = m.id.toLowerCase();
      const dn = (m.display_name ?? "").toLowerCase();
      return id.includes(q) || dn.includes(q);
    });
  }, [allModels, query.search]);

  return (
    <div className="tab-content animate-in flex flex-col gap-6 pb-6">
      <TabHeader
        title="Models"
        subtitle="Browse runtime model catalogs and install selections into Custom Models."
      />

      {installState.lastInstallResult ? (
        <div className="auth-result-banner success rounded-md border border-[color:var(--ok)]/25" role="status" aria-live="polite">
          <p className="auth-result-message">
            Installed for {installState.lastInstallResult.agent_key}: added {installState.lastInstallResult.added}, skipped {installState.lastInstallResult.skipped_duplicates} duplicates.
          </p>
        </div>
      ) : null}

      {dataState.lastError ? (
        <div className="auth-result-banner error rounded-md border border-[color:var(--danger)]/20" role="alert">
          <p className="auth-result-message">{dataState.lastError}</p>
        </div>
      ) : null}

      <section className="settings-section">
        <div className="models-toolbar flex flex-wrap items-end gap-3">
          <label className="models-field min-w-[180px] flex-1">
            <span className="models-label">Provider</span>
            <select
              value={query.channel}
              onChange={(e) =>
                setQuery((prev) => ({ ...prev, channel: e.target.value }))
              }
            >
              {PROVIDER_CHANNELS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="models-field min-w-[220px] flex-[2]">
              <span className="models-label">Search</span>
              <input
                type="text"
                value={query.search}
                onChange={(e) =>
                  setQuery((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Filter models..."
              />
            </label>

          <div className="models-actions inline-flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                setInstallState((prev) => ({ ...prev, showInstallDialog: true }))
              }
              disabled={dataState.isLoading}
            >
              <Bot size={14} />
              Add to Custom Models
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={refresh}
              disabled={dataState.isLoading}
            >
              <RefreshCw size={14} className={dataState.isLoading ? "spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="stats-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="stat-item">
            <span className="stat-label">Available</span>
            <span className="stat-value">{allModels.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Visible</span>
            <span className="stat-value">{filteredModels.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Reasoning-ready</span>
            <span className="stat-value">{thinkingReadyCount}</span>
          </div>
        </div>

        <div className="usage-table-wrap model-table-wrap overflow-auto rounded-md border border-[color:var(--border)]">
          <table className="usage-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Thinking</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="model-cell flex flex-col gap-0.5">
                      <div className="model-primary font-semibold text-[color:var(--text-primary)]">{m.id}</div>
                      {m.display_name ? <div className="model-secondary text-xs text-[color:var(--text-muted)]">{m.display_name}</div> : null}
                    </div>
                  </td>
                  <td className="model-secondary text-xs text-[color:var(--text-muted)]">{formatThinkingSummary(m)}</td>
                </tr>
              ))}
              {filteredModels.length === 0 ? (
                <tr>
                    <td colSpan={2} className="model-secondary text-xs text-[color:var(--text-muted)]">
                      {dataState.isLoading ? "Loading..." : "No models found."}
                    </td>
                  </tr>
                ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <AgentModelInstallDialog
        isOpen={installState.showInstallDialog}
        agentKey="codeforwarder"
        agentLabel="Custom Models"
        defaultDisplayPrefix=""
        initialChannel={query.channel}
        onClose={() =>
          setInstallState((prev) => ({ ...prev, showInstallDialog: false }))
        }
        onInstalled={(result) => {
          setInstallState((prev) => ({ ...prev, lastInstallResult: result }));
          // Refresh list after install so user can keep browsing.
          refresh();
        }}
      />
    </div>
  );
}
