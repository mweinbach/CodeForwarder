import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Pencil, Save, X, AlertCircle } from "lucide-react";
import type { FactoryCustomModelRow } from "../types";
import { toErrorMessage } from "../utils/error";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface CustomModelEditDialogProps {
  isOpen: boolean;
  model: FactoryCustomModelRow | null;
  onClose: () => void;
  onSaved?: (updated: FactoryCustomModelRow) => void;
}

interface CustomModelFormState {
  displayName: string;
  modelId: string;
  provider: string;
  baseUrl: string;
  noImageSupport: boolean;
}

const EMPTY_FORM: CustomModelFormState = {
  displayName: "",
  modelId: "",
  provider: "",
  baseUrl: "",
  noImageSupport: false,
};

export default function CustomModelEditDialog({
  isOpen,
  model,
  onClose,
  onSaved,
}: CustomModelEditDialogProps) {
  const [form, setForm] = useState<CustomModelFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !model) return;
    setForm({
      displayName: model.displayName,
      modelId: model.model,
      provider: model.provider,
      baseUrl: model.baseUrl,
      noImageSupport: model.noImageSupport,
    });
    setLastError(null);
  }, [isOpen, model]);

  if (!isOpen || !model) return null;

  const canEdit = model.isProxy;

  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    setLastError(null);
    try {
      const updated = await invoke<FactoryCustomModelRow>("update_factory_custom_model", {
        id: model.id,
        model: form.modelId,
        baseUrl: form.baseUrl,
        displayName: form.displayName,
        noImageSupport: form.noImageSupport,
        provider: form.provider,
      });
      onSaved?.(updated);
      onClose();
    } catch (err) {
      setLastError(toErrorMessage(err, "Failed to update model"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[960px] max-h-[90vh] overflow-y-auto overscroll-none">
        <DialogHeader>
          <DialogTitle>Edit Custom Model</DialogTitle>
          <DialogDescription>
            {canEdit
              ? "Edits apply to proxy models only (localhost:8317)."
              : "This model is not using the local proxy, so it is view-only."}
          </DialogDescription>
        </DialogHeader>

        {lastError ? (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{lastError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 mt-4">
          <div className="flex flex-col gap-4 rounded-lg border p-4 bg-card shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">Details</span>
              <span className="text-xs text-muted-foreground">ID: {model.id}</span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Display name</label>
                <Input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Model</label>
                <Input
                  type="text"
                  value={form.modelId}
                  onChange={(e) => setForm((prev) => ({ ...prev, modelId: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Provider</label>
                <Input
                  type="text"
                  value={form.provider}
                  onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Base URL</label>
                <Input
                  type="text"
                  value={form.baseUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="mark-no-image"
                  checked={form.noImageSupport}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, noImageSupport: checked === true }))}
                  disabled={!canEdit}
                />
                <label htmlFor="mark-no-image" className="text-sm font-medium cursor-pointer">
                  Mark as no image support
                </label>
              </div>

              {model.isSessionDefault ? (
                <div className="text-xs text-muted-foreground mt-2">
                  This is your Factory session default model.
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border p-4 bg-card shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">Actions</span>
              <span className="text-xs text-muted-foreground">Index: {model.index ?? "-"}</span>
            </div>

            <div className="flex flex-col gap-3">
              <Button variant="outline" onClick={onClose} disabled={isSaving} className="w-full justify-start">
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
              <Button onClick={handleSave} disabled={!canEdit || isSaving} className="w-full justify-start">
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>

              {!canEdit ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
                  <Pencil className="h-4 w-4" />
                  Editing is disabled for non-proxy models.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
