import { useEffect, useState } from "react";
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

export default function CustomModelEditDialog({
  isOpen,
  model,
  onClose,
  onSaved,
}: CustomModelEditDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [modelId, setModelId] = useState("");
  const [provider, setProvider] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [noImageSupport, setNoImageSupport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !model) return;
    setDisplayName(model.displayName);
    setModelId(model.model);
    setProvider(model.provider);
    setBaseUrl(model.baseUrl);
    setNoImageSupport(model.noImageSupport);
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
        model: modelId,
        baseUrl,
        displayName,
        noImageSupport,
        provider,
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Edit Custom Model</h3>
        <p className="modal-subtitle">
          {canEdit
            ? "Edits apply to proxy models only (localhost:8317)."
            : "This model is not using the local proxy, so it is view-only."}
        </p>

        {lastError ? (
          <div className="auth-result-banner error" role="alert">
            <p className="auth-result-message">{lastError}</p>
          </div>
        ) : null}

        <div className="agent-model-grid">
          <section className="agent-model-pane">
            <div className="agent-model-pane-head">
              <div className="agent-model-pane-title">
                <strong>Details</strong>
                <span className="agent-model-pane-meta">ID: {model.id}</span>
              </div>
            </div>

            <div className="agent-model-options">
              <label className="agent-model-field">
                <span className="agent-model-label">Display name</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!canEdit}
                />
              </label>

              <label className="agent-model-field">
                <span className="agent-model-label">Model</span>
                <input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  disabled={!canEdit}
                />
              </label>

              <label className="agent-model-field">
                <span className="agent-model-label">Provider</span>
                <input
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  disabled={!canEdit}
                />
              </label>

              <label className="agent-model-field">
                <span className="agent-model-label">Base URL</span>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  disabled={!canEdit}
                />
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={noImageSupport}
                  onChange={(e) => setNoImageSupport(e.target.checked)}
                  disabled={!canEdit}
                />
                Mark as no image support
              </label>

              {model.isSessionDefault ? (
                <div className="agent-model-hint">
                  This is your Factory session default model.
                </div>
              ) : null}
            </div>
          </section>

          <section className="agent-model-pane">
            <div className="agent-model-pane-head">
              <div className="agent-model-pane-title">
                <strong>Actions</strong>
                <span className="agent-model-pane-meta">Index: {model.index ?? "-"}</span>
              </div>
            </div>

            <div className="agent-model-options">
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
                <div className="agent-model-hint">
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
