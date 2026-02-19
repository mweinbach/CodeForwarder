import { useEffect, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Pencil, Save, X } from "lucide-react";
import type { FactoryCustomModelRow } from "../types";
import { toErrorMessage } from "../utils/error";

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
    <div
      className="modal-overlay fixed inset-0 z-[1000] flex items-center justify-center bg-[color:var(--overlay)] p-4 backdrop-blur-[4px]"
      role="button"
      tabIndex={0}
      aria-label="Close dialog"
      onMouseDown={handleOverlayMouseDown}
      onKeyDown={handleOverlayKeyDown}
    >
      <div className="modal-content modal-content-wide w-full max-w-[960px] max-h-[85vh] overflow-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-1)] p-5">
        <h3 className="modal-title text-base font-semibold">Edit Custom Model</h3>
        <p className="modal-subtitle mt-1.5 text-sm text-[color:var(--text-secondary)]">
          {canEdit
            ? "Edits apply to proxy models only (localhost:8317)."
            : "This model is not using the local proxy, so it is view-only."}
        </p>

        {lastError ? (
          <div className="auth-result-banner error mt-4 rounded-md border border-[color:var(--danger)]/20" role="alert">
            <p className="auth-result-message">{lastError}</p>
          </div>
        ) : null}

        <div className="agent-model-grid mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="agent-model-pane border-t border-[color:var(--border)] pt-3">
            <div className="agent-model-pane-head mb-2 flex items-center justify-between gap-2">
              <div className="agent-model-pane-title flex flex-col gap-0.5">
                <strong>Details</strong>
                <span className="agent-model-pane-meta text-xs text-[color:var(--text-muted)]">ID: {model.id}</span>
              </div>
            </div>

            <div className="agent-model-options flex flex-col gap-2">
              <label className="agent-model-field flex flex-col gap-1">
                <span className="agent-model-label">Display name</span>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>

              <label className="agent-model-field flex flex-col gap-1">
                <span className="agent-model-label">Model</span>
                <input
                  type="text"
                  value={form.modelId}
                  onChange={(e) => setForm((prev) => ({ ...prev, modelId: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>

              <label className="agent-model-field flex flex-col gap-1">
                <span className="agent-model-label">Provider</span>
                <input
                  type="text"
                  value={form.provider}
                  onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>

              <label className="agent-model-field flex flex-col gap-1">
                <span className="agent-model-label">Base URL</span>
                <input
                  type="text"
                  value={form.baseUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>

              <label className="checkbox-row inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.noImageSupport}
                  onChange={(e) => setForm((prev) => ({ ...prev, noImageSupport: e.target.checked }))}
                  disabled={!canEdit}
                />
                Mark as no image support
              </label>

              {model.isSessionDefault ? (
                <div className="agent-model-hint text-xs text-[color:var(--text-muted)]">
                  This is your Factory session default model.
                </div>
              ) : null}
            </div>
          </section>

          <section className="agent-model-pane border-t border-[color:var(--border)] pt-3">
            <div className="agent-model-pane-head mb-2 flex items-center justify-between gap-2">
              <div className="agent-model-pane-title flex flex-col gap-0.5">
                <strong>Actions</strong>
                <span className="agent-model-pane-meta text-xs text-[color:var(--text-muted)]">Index: {model.index ?? "-"}</span>
              </div>
            </div>

            <div className="agent-model-options flex flex-col gap-2">
              <button
                type="button"
                className="btn btn-sm"
                onClick={onClose}
                disabled={isSaving}
              >
                <X size={14} />
                Close
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleSave}
                disabled={!canEdit || isSaving}
              >
                <Save size={14} />
                Save
              </button>

              {!canEdit ? (
                <div className="agent-model-hint inline-flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
                  <Pencil size={14} />
                  Editing is disabled for non-proxy models.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
