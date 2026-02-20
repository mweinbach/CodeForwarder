import type { KeyboardEvent, MouseEvent } from "react";
import type { ProviderModelInfo } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface AgentModelInstallDialogViewProps {
  isOpen: boolean;
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
  isOpen,
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
  formatThinkingSummary,
}: AgentModelInstallDialogViewProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[960px] max-h-[90vh] overflow-y-auto overscroll-none">
        <DialogHeader>
          <DialogTitle>Add Models to {agentLabel}</DialogTitle>
          <DialogDescription>
            Pick a provider catalog, select models, and choose reasoning variants to install into
            Factory custom models.
          </DialogDescription>
        </DialogHeader>

        {lastError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{lastError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-end gap-4 py-2">
          <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Provider</label>
            <select
              value={channel}
              onChange={(e) => onChannelChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {PROVIDER_CHANNELS.map((opt) => (
                <option key={opt.key} value={opt.key} className="bg-background text-foreground">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-[2] min-w-[240px] flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Search</label>
            <Input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter models..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 mt-2">
          <div className="flex flex-col gap-2 rounded-lg border p-4 bg-card shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-sm">Models</span>
                <span className="text-xs text-muted-foreground">
                  {isLoading ? "Loading..." : `${filteredModels.length} shown / ${allModelsCount} total`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Checkbox
                  id="select-all-models"
                  checked={
                    filteredModels.length > 0 &&
                    filteredModels.every((m) => selectedIds.has(m.id))
                  }
                  onCheckedChange={(checked) => onSetAllVisible(checked === true)}
                />
                <label htmlFor="select-all-models" className="cursor-pointer font-medium">Select visible</label>
              </div>
            </div>

            <div className="rounded-md border max-h-[360px] overflow-auto overscroll-none [&_div[data-slot=table-container]]:overflow-visible">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm backdrop-blur">
                  <TableRow>
                    <TableHead className="w-[44px]">Add</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Thinking</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModels.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(m.id)}
                          onCheckedChange={() => onToggleSelected(m.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold">{m.id}</span>
                          {m.display_name ? (
                            <span className="text-xs text-muted-foreground">
                              {m.display_name}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatThinkingSummary(m)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredModels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                        {isLoading ? "Loading..." : "No models found."}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-4 bg-card shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-sm">Install Options</span>
                <span className="text-xs text-muted-foreground">
                  {previewCount} variants will be created
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Checkbox
                  id="include-base-model"
                  checked={includeBase}
                  onCheckedChange={(checked) => onIncludeBaseChange(checked === true)}
                />
                <label htmlFor="include-base-model" className="cursor-pointer font-medium">Include base model</label>
              </div>

              <div className="flex flex-col gap-2 border-t pt-3">
                <span className="text-sm font-medium text-muted-foreground">Reasoning levels</span>
                <div className={`flex flex-wrap gap-2 ${levelsDisabled ? "opacity-60 grayscale-[0.2]" : ""}`}>
                  {unionLevels.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      Select a model with level-based reasoning.
                    </span>
                  ) : (
                    unionLevels.map((level) => (
                      <div key={level} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id={`level-${level}`}
                          checked={selectedLevels.has(level)}
                          onCheckedChange={(checked) => onToggleLevel(level, checked === true)}
                        />
                        <label htmlFor={`level-${level}`} className="cursor-pointer font-medium">{level}</label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t pt-3">
                <span className="text-sm font-medium text-muted-foreground">Thinking budgets</span>
                <Input
                  type="text"
                  value={budgetCsv}
                  onChange={(e) => onBudgetCsvChange(e.target.value)}
                  disabled={budgetsDisabled}
                  placeholder="e.g. 4000, 10000, 32000"
                />
                <span className="text-xs text-muted-foreground">
                  Budgets above ~32000 will be clamped by CodeForwarder.
                </span>
              </div>

              <div className="flex flex-col gap-3 border-t pt-3">
                <span className="text-sm font-medium text-muted-foreground">Factory mapping</span>
                
                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <span className="text-xs text-muted-foreground font-medium">Provider</span>
                  <select
                    value={factoryProvider}
                    onChange={(e) => onFactoryProviderChange(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="anthropic" className="bg-background text-foreground">anthropic</option>
                    <option value="openai" className="bg-background text-foreground">openai</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <span className="text-xs text-muted-foreground font-medium">Base URL</span>
                  <div className="flex flex-col gap-1 w-full">
                    <Input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => onBaseUrlChange(e.target.value)}
                      className={!isProxyBaseUrl ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {!isProxyBaseUrl ? (
                      <span className="text-xs text-destructive">
                        Only proxy URLs on localhost:8317 are supported.
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <span className="text-xs text-muted-foreground font-medium">Name prefix</span>
                  <Input
                    type="text"
                    value={displayPrefix}
                    onChange={(e) => onDisplayPrefixChange(e.target.value)}
                    placeholder={`${agentLabel}: `}
                  />
                </div>
                
                <div className="flex items-center gap-2 text-sm mt-1">
                  <Checkbox
                    id="no-image-support"
                    checked={noImageSupport}
                    onCheckedChange={(checked) => onNoImageSupportChange(checked === true)}
                  />
                  <label htmlFor="no-image-support" className="cursor-pointer font-medium">Mark as no image support</label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canInstall || isLoading}
            onClick={onInstall}
          >
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
