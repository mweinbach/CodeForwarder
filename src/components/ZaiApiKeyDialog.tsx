import { useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";

interface ZaiApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (apiKey: string) => void;
}

export default function ZaiApiKeyDialog({
  isOpen,
  onClose,
  onSubmit,
}: ZaiApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(apiKey);
    setApiKey("");
  };

  const handleClose = () => {
    setApiKey("");
    onClose();
  };

  const handleOverlayMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClose();
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
      <div className="modal-content w-full max-w-[420px] rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-1)] p-5">
        <h3 className="modal-title text-base font-semibold">Z.AI API Key</h3>
        <p className="modal-subtitle mt-1.5 text-sm text-[color:var(--text-secondary)]">
          Enter your Z.AI API key from{" "}
          <a
            href="https://z.ai/manage-apikey/apikey-list"
            target="_blank"
            rel="noreferrer"
          >
            z.ai
          </a>
        </p>
        <input
          type="text"
          className="modal-input mt-4"
          placeholder="Paste your API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && apiKey.trim() !== "") handleSubmit();
          }}
          autoComplete="off"
        />
        <div className="modal-buttons mt-4 flex justify-end gap-2">
          <button type="button" className="btn btn-cancel" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={apiKey.trim() === ""}
            onClick={handleSubmit}
          >
            Add Key
          </button>
        </div>
      </div>
    </div>
  );
}
