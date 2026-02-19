import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  type AgentInstallResult,
  type FactoryCustomModelInput,
  type ProviderModelDefinitionsResponse,
  type ProviderModelInfo,
} from "../types";
import { toErrorMessage } from "../utils/error";
import { renderAgentModelInstallDialogView } from "./AgentModelInstallDialogView";

type FactoryProvider = "anthropic" | "openai";

function channelDefaults(channel: string): { provider: FactoryProvider; baseUrl: string } {
  if (channel === "claude") {
    return { provider: "anthropic", baseUrl: "http://localhost:8317" };
  }
  return { provider: "openai", baseUrl: "http://localhost:8317/v1" };
}

function isProxyBaseUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === "") return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("http://localhost:8317") ||
    lower.startsWith("https://localhost:8317") ||
    lower.startsWith("http://127.0.0.1:8317") ||
    lower.startsWith("https://127.0.0.1:8317") ||
    lower.startsWith("http://0.0.0.0:8317") ||
    lower.startsWith("https://0.0.0.0:8317") ||
    lower.startsWith("http://[::1]:8317") ||
    lower.startsWith("https://[::1]:8317")
  ) {
    return true;
  }
  try {
    const url = new URL(trimmed);
    const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
    if (port !== 8317) return false;
    const host = url.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
  } catch {
    return false;
  }
}

function hasThinkingLevels(model: ProviderModelInfo): string[] {
  const levels = model.thinking?.levels;
  return Array.isArray(levels) ? levels.filter((v) => typeof v === "string" && v.trim() !== "") : [];
}

function canUseThinkingBudgets(model: ProviderModelInfo): boolean {
  if (hasThinkingLevels(model).length > 0) return false;
  const thinking = model.thinking;
  if (!thinking) return false;
  return thinking.min != null || thinking.max != null || thinking.zero_allowed != null || thinking.dynamic_allowed != null;
}

function parseBudgets(raw: string): number[] {
  const parts = raw
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
  const out: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n)) continue;
    const i = Math.floor(n);
    if (i <= 0) continue;
    out.push(i);
  }
  return Array.from(new Set(out)).sort((a, b) => a - b);
}

function makeBudgetVariant(modelId: string, budget: number): string {
  const trimmed = modelId.trim();
  if (trimmed === "") return trimmed;
  if (trimmed.includes("-thinking-")) {
    return trimmed;
  }
  if (trimmed.endsWith("-thinking")) {
    return `${trimmed}-${budget}`;
  }
  return `${trimmed}-thinking-${budget}`;
}

function makeLevelVariant(modelId: string, level: string): string {
  const trimmed = modelId.trim();
  if (trimmed === "") return trimmed;
  if (/\([^)]+\)$/.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}(${level})`;
}

function titleCase(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return trimmed;
  if (trimmed.length === 1) return trimmed.toUpperCase();
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

function defaultDisplayNameForModel(model: ProviderModelInfo): string {
  return model.display_name?.trim() || model.id;
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

function buildBudgetLabels(budgets: number[]): Map<number, string> {
  const labels = ["Low", "Medium", "High", "XHigh"];
  const out = new Map<number, string>();
  if (budgets.length >= 2 && budgets.length <= labels.length) {
    budgets.forEach((b, idx) => {
      out.set(b, labels[idx]);
    });
    return out;
  }
  budgets.forEach((b) => out.set(b, `Thinking ${b}`));
  return out;
}

interface AgentModelInstallDialogProps {
  isOpen: boolean;
  agentKey: string;
  agentLabel: string;
  initialChannel?: string;
  defaultDisplayPrefix?: string;
  onClose: () => void;
  onInstalled?: (result: AgentInstallResult) => void;
}

interface InstallDialogState {
  channel: string;
  search: string;
  selectedIds: Set<string>;
  factoryProvider: FactoryProvider;
  baseUrl: string;
  displayPrefix: string;
  noImageSupport: boolean;
  includeBase: boolean;
  selectedLevels: Set<string>;
  budgetCsv: string;
}

interface ModelsFetchState {
  modelsResponse: ProviderModelDefinitionsResponse | null;
  isLoading: boolean;
  lastError: string | null;
}

function createInitialState(
  initialChannel: string | undefined,
  defaultDisplayPrefix: string | undefined,
  agentLabel: string,
): InstallDialogState {
  const channel = initialChannel ?? "claude";
  const defaults = channelDefaults(channel);
  return {
    channel,
    search: "",
    selectedIds: new Set(),
    factoryProvider: defaults.provider,
    baseUrl: defaults.baseUrl,
    displayPrefix: defaultDisplayPrefix ?? `${agentLabel}: `,
    noImageSupport: false,
    includeBase: true,
    selectedLevels: new Set(["high"]),
    budgetCsv: "4000, 10000, 32000",
  };
}

export default function AgentModelInstallDialog(props: AgentModelInstallDialogProps) {
  return useAgentModelInstallDialog(props);
}

function useAgentModelInstallDialog({
  isOpen,
  agentKey,
  agentLabel,
  initialChannel,
  defaultDisplayPrefix,
  onClose,
  onInstalled,
}: AgentModelInstallDialogProps) {
  const [dialogState, setDialogState] = useState<InstallDialogState>(() =>
    createInitialState(initialChannel, defaultDisplayPrefix, agentLabel),
  );
  const [modelsFetch, setModelsFetch] = useState<ModelsFetchState>({
    modelsResponse: null,
    isLoading: false,
    lastError: null,
  });
  const {
    channel,
    search,
    selectedIds,
    factoryProvider,
    baseUrl,
    displayPrefix,
    noImageSupport,
    includeBase,
    selectedLevels,
    budgetCsv,
  } = dialogState;

  // eslint-disable-next-line react-doctor/no-cascading-set-state
  useEffect(() => {
    if (!isOpen) return;
    setDialogState(createInitialState(initialChannel, defaultDisplayPrefix, agentLabel));
    setModelsFetch((prev) => ({ ...prev, lastError: null }));
  }, [agentLabel, defaultDisplayPrefix, initialChannel, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const next = channelDefaults(channel);
    setDialogState((prev) => ({
      ...prev,
      factoryProvider: next.provider,
      baseUrl: next.baseUrl,
    }));
  }, [channel, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setModelsFetch((prev) => ({
      ...prev,
      isLoading: true,
      lastError: null,
    }));
  }, [channel, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    void (async () => {
      try {
        const resp = await invoke<ProviderModelDefinitionsResponse>(
          "get_provider_model_definitions",
          { channel },
        );
        if (cancelled) return;
        setModelsFetch({
          modelsResponse: resp,
          isLoading: false,
          lastError: null,
        });
      } catch (err) {
        if (cancelled) return;
        setModelsFetch({
          modelsResponse: null,
          isLoading: false,
          lastError: toErrorMessage(
            err,
            "Failed to load models (make sure Proxy Engine is running)",
          ),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channel, isOpen]);

  const allModels = modelsFetch.modelsResponse?.models ?? [];

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === "") return allModels;
    return allModels.filter((m) => {
      const id = m.id.toLowerCase();
      const dn = (m.display_name ?? "").toLowerCase();
      return id.includes(q) || dn.includes(q);
    });
  }, [allModels, search]);

  const selectedModels = useMemo(() => {
    if (selectedIds.size === 0) return [];
    const byId = new Map(allModels.map((m) => [m.id, m] as const));
    const out: ProviderModelInfo[] = [];
    for (const id of selectedIds) {
      const m = byId.get(id);
      if (m) out.push(m);
    }
    out.sort((a, b) => a.id.localeCompare(b.id));
    return out;
  }, [allModels, selectedIds]);

  const unionLevels = useMemo(() => {
    const set = new Set<string>();
    for (const m of selectedModels) {
      for (const level of hasThinkingLevels(m)) {
        set.add(level);
      }
    }
    return Array.from(set).sort();
  }, [selectedModels]);

  const budgets = useMemo(() => parseBudgets(budgetCsv), [budgetCsv]);
  const budgetLabels = useMemo(() => buildBudgetLabels(budgets), [budgets]);

  const previewCount = useMemo(() => {
    if (selectedModels.length === 0) return 0;
    let count = 0;
    for (const m of selectedModels) {
      if (includeBase) count += 1;
      const levels = hasThinkingLevels(m);
      if (levels.length > 0) {
        for (const l of selectedLevels) {
          if (levels.includes(l)) count += 1;
        }
      } else if (canUseThinkingBudgets(m)) {
        count += budgets.length;
      }
    }
    return count;
  }, [budgets.length, includeBase, selectedLevels, selectedModels]);

  const toggleSelected = (id: string) => {
    setDialogState((prev) => {
      const next = new Set(prev.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, selectedIds: next };
    });
  };

  const setAllVisible = (checked: boolean) => {
    setDialogState((prev) => {
      const next = new Set(prev.selectedIds);
      for (const m of filteredModels) {
        if (checked) next.add(m.id);
        else next.delete(m.id);
      }
      return { ...prev, selectedIds: next };
    });
  };

  const handleOverlayMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key === "Escape" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      onClose();
    }
  };

  const handleInstall = async () => {
    setModelsFetch((prev) => ({ ...prev, lastError: null }));
    const prefix = displayPrefix;
    const inputs: FactoryCustomModelInput[] = [];
    for (const model of selectedModels) {
      const baseId = model.id;
      const baseName = defaultDisplayNameForModel(model);

      const variants: Array<{ modelId: string; labelSuffix: string }> = [];
      if (includeBase) {
        variants.push({ modelId: baseId, labelSuffix: "" });
      }

      const levels = hasThinkingLevels(model);
      if (levels.length > 0) {
        for (const level of selectedLevels) {
          if (!levels.includes(level)) continue;
          const variantId = makeLevelVariant(baseId, level);
          if (variantId === baseId) continue;
          variants.push({ modelId: variantId, labelSuffix: ` (${titleCase(level)})` });
        }
      } else if (canUseThinkingBudgets(model)) {
        for (const budget of budgets) {
          const variantId = makeBudgetVariant(baseId, budget);
          if (variantId === baseId) continue;
          const label = budgetLabels.get(budget) ?? `Thinking ${budget}`;
          variants.push({ modelId: variantId, labelSuffix: ` (${label})` });
        }
      }

      for (const v of variants) {
        inputs.push({
          model: v.modelId,
          baseUrl,
          apiKey: "dummy-not-used",
          displayName: `${prefix}${baseName}${v.labelSuffix}`.trim(),
          noImageSupport,
          provider: factoryProvider,
        });
      }
    }

    try {
      const result = await invoke<AgentInstallResult>("install_agent_models", {
        agentKey,
        models: inputs,
      });
      onInstalled?.(result);
      onClose();
    } catch (err) {
      setModelsFetch((prev) => ({
        ...prev,
        lastError: toErrorMessage(err, "Failed to install models"),
      }));
    }
  };

  const levelsDisabled = unionLevels.length === 0;
  const budgetsDisabled = selectedModels.every((m) => !canUseThinkingBudgets(m));
  const canInstall = selectedModels.length > 0 && isProxyBaseUrl(baseUrl);

  const handleChannelChange = (nextChannel: string) => {
    setDialogState((prev) => ({ ...prev, channel: nextChannel }));
  };

  const handleSearchChange = (nextSearch: string) => {
    setDialogState((prev) => ({ ...prev, search: nextSearch }));
  };

  const handleIncludeBaseChange = (checked: boolean) => {
    setDialogState((prev) => ({ ...prev, includeBase: checked }));
  };

  const handleToggleLevel = (level: string, checked: boolean) => {
    setDialogState((prev) => {
      const next = new Set(prev.selectedLevels);
      if (checked) next.add(level);
      else next.delete(level);
      return { ...prev, selectedLevels: next };
    });
  };

  const handleBudgetCsvChange = (value: string) => {
    setDialogState((prev) => ({ ...prev, budgetCsv: value }));
  };

  const handleFactoryProviderChange = (provider: string) => {
    setDialogState((prev) => ({
      ...prev,
      factoryProvider: provider as FactoryProvider,
    }));
  };

  const handleBaseUrlChange = (nextBaseUrl: string) => {
    setDialogState((prev) => ({ ...prev, baseUrl: nextBaseUrl }));
  };

  const handleDisplayPrefixChange = (prefix: string) => {
    setDialogState((prev) => ({ ...prev, displayPrefix: prefix }));
  };

  const handleNoImageSupportChange = (checked: boolean) => {
    setDialogState((prev) => ({ ...prev, noImageSupport: checked }));
  };

  return renderAgentModelInstallDialogView({
    isOpen,
    agentLabel,
    channel,
    search,
    filteredModels,
    allModelsCount: allModels.length,
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
    isLoading: modelsFetch.isLoading,
    lastError: modelsFetch.lastError,
    isProxyBaseUrl: isProxyBaseUrl(baseUrl),
    onClose,
    onInstall: handleInstall,
    onSetAllVisible: setAllVisible,
    onToggleSelected: toggleSelected,
    onChannelChange: handleChannelChange,
    onSearchChange: handleSearchChange,
    onIncludeBaseChange: handleIncludeBaseChange,
    onToggleLevel: handleToggleLevel,
    onBudgetCsvChange: handleBudgetCsvChange,
    onFactoryProviderChange: handleFactoryProviderChange,
    onBaseUrlChange: handleBaseUrlChange,
    onDisplayPrefixChange: handleDisplayPrefixChange,
    onNoImageSupportChange: handleNoImageSupportChange,
    onOverlayMouseDown: handleOverlayMouseDown,
    onOverlayKeyDown: handleOverlayKeyDown,
    formatThinkingSummary,
  });
}
