import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Bot, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ProviderModelDefinitionsResponse, ProviderModelInfo, AgentInstallResult } from "../types";
import { toErrorMessage } from "../utils/error";
import AgentModelInstallDialog from "./AgentModelInstallDialog";
import TabHeader from "./TabHeader";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Card, CardContent, CardHeader } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

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
    <div className="flex flex-col gap-6 pb-6 animate-in">
      <TabHeader
        title="Models"
        subtitle="Browse runtime model catalogs and install selections into Custom Models."
      />

      {installState.lastInstallResult ? (
        <Alert className="border-green-500/50 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Installed for {installState.lastInstallResult.agent_key}: added {installState.lastInstallResult.added}, skipped {installState.lastInstallResult.skipped_duplicates} duplicates.
          </AlertDescription>
        </Alert>
      ) : null}

      {dataState.lastError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{dataState.lastError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Provider</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={query.channel}
                onChange={(e) =>
                  setQuery((prev) => ({ ...prev, channel: e.target.value }))
                }
              >
                {PROVIDER_CHANNELS.map((opt) => (
                  <option key={opt.key} value={opt.key} className="bg-background text-foreground">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-[2] min-w-[200px] flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <Input
                type="text"
                value={query.search}
                onChange={(e) =>
                  setQuery((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Filter models..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setInstallState((prev) => ({ ...prev, showInstallDialog: true }))
                }
                disabled={dataState.isLoading}
              >
                <Bot className="mr-2 h-4 w-4" />
                Add to Custom Models
              </Button>
              <Button
                variant="outline"
                onClick={refresh}
                disabled={dataState.isLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${dataState.isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
            <div className="flex flex-col gap-1 rounded-lg border bg-card p-3 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Available</span>
              <span className="text-2xl font-bold tabular-nums">{allModels.length}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border bg-card p-3 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Visible</span>
              <span className="text-2xl font-bold tabular-nums">{filteredModels.length}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border bg-card p-3 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Reasoning-ready</span>
              <span className="text-2xl font-bold tabular-nums">{thinkingReadyCount}</span>
            </div>
          </div>

          <div className="rounded-md border max-h-[500px] overflow-auto overscroll-none [&_div[data-slot=table-container]]:overflow-visible">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm backdrop-blur">
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Thinking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModels.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold">{m.id}</span>
                        {m.display_name ? <span className="text-xs text-muted-foreground">{m.display_name}</span> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatThinkingSummary(m)}</TableCell>
                  </TableRow>
                ))}
                {filteredModels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                      {dataState.isLoading ? "Loading..." : "No models found."}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
          refresh();
        }}
      />
    </div>
  );
}
