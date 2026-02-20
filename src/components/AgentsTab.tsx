import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Lock, Pencil, Plus, RefreshCw, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
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
import { Checkbox } from "./ui/checkbox";

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
        <Alert className="border-green-500/50 text-green-700 dark:text-green-400 mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Added {lastAddResult.added} (skipped {lastAddResult.skipped_duplicates} duplicates)
          </AlertDescription>
        </Alert>
      ) : null}

      {lastRemoveResult ? (
        <Alert className="border-green-500/50 text-green-700 dark:text-green-400 mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Removed {lastRemoveResult.removed}.
            {lastRemoveResult.skippedNonProxy > 0
              ? ` Skipped ${lastRemoveResult.skippedNonProxy} non-proxy.`
              : ""}
            {lastRemoveResult.skippedNotFound > 0
              ? ` ${lastRemoveResult.skippedNotFound} not found.`
              : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      {lastError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{lastError}</AlertDescription>
        </Alert>
      ) : null}
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
    <div className="flex flex-col gap-6 pb-6 animate-in">
      <TabHeader
        title="Custom Models"
        subtitle="Manage Factory custom models powered by CodeForwarder."
      />

      <FeedbackBanners
        lastAddResult={ui.lastAddResult}
        lastRemoveResult={ui.lastRemoveResult}
        lastError={ui.lastError}
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setUi((prev) => ({ ...prev, showInstallDialog: true }))}
                disabled={ui.isBusy}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Models
              </Button>
              {ui.selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => removeModels(Array.from(ui.selectedIds))}
                  disabled={ui.isBusy}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Selected ({ui.selectedIds.size})
                </Button>
              )}
            </div>

            <div className="flex flex-1 md:flex-none items-center gap-2 w-full md:w-auto">
              <Input
                type="text"
                value={ui.search}
                onChange={(e) => setUi((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Filter models..."
                className="w-full md:w-[280px]"
              />
              <Button variant="outline" size="icon" onClick={refresh} disabled={ui.isBusy} title="Refresh">
                <RefreshCw className={`h-4 w-4 ${ui.isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
            <div className="flex flex-col gap-1 rounded-lg border bg-card p-3 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Total</span>
              <span className="text-2xl font-bold tabular-nums">{models.length}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border bg-card p-3 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Proxy</span>
              <span className="text-2xl font-bold tabular-nums">{proxyCount}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border bg-card p-3 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">External</span>
              <span className="text-2xl font-bold tabular-nums">{externalCount}</span>
            </div>
          </div>

          <div className="rounded-md border max-h-[500px] overflow-auto overscroll-none mb-2 [&_div[data-slot=table-container]]:overflow-visible">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm backdrop-blur">
                <TableRow>
                  <TableHead className="w-[44px]">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={(checked) => setAllVisibleSelected(checked === true)}
                      disabled={visibleRemovableIds.length === 0}
                    />
                  </TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="w-[120px]">Provider</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead className="w-[170px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModels.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Checkbox
                        checked={ui.selectedIds.has(m.id)}
                        onCheckedChange={() => toggleRowSelected(m.id)}
                        disabled={!canRemove(m)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="font-semibold text-foreground flex items-center gap-1">
                          {m.displayName}
                          {m.isSessionDefault ? (
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                              {" "}(default)
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.model}</div>
                        <div className="text-[10px] text-muted-foreground opacity-70">{m.id}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.provider}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={m.baseUrl}>{m.baseUrl}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.isProxy ? "proxy" : "external"}</TableCell>
                    <TableCell>
                      {m.isProxy ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => setUi((prev) => ({ ...prev, editingModel: m }))}
                            disabled={!canEdit(m)}
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeModels([m.id])}
                            disabled={ui.isBusy || !canRemove(m)}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" />
                          view-only
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredModels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                      {models.length === 0
                        ? "No custom models found."
                        : ui.isLoading
                          ? "Loading..."
                          : "No matches."}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          
          <div className="text-xs text-muted-foreground text-right mt-2">
            {modelsState?.factorySettingsPath ? `Factory: ${modelsState.factorySettingsPath}` : ""}
          </div>
        </CardContent>
      </Card>

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
