import { useEffect, useRef, useState } from "react";

interface VercelGatewayControlsProps {
  enabled: boolean;
  apiKey: string;
  onSave: (enabled: boolean, apiKey: string) => void;
}

export default function VercelGatewayControls({
  enabled,
  apiKey,
  onSave,
}: VercelGatewayControlsProps) {
  const [draftKey, setDraftKey] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [showingSaved, setShowingSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const localKey = isDirty ? draftKey : apiKey;

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleToggle = (checked: boolean) => {
    onSave(checked, localKey);
    if (!checked) {
      setDraftKey("");
      setIsDirty(false);
    }
  };

  const handleSave = () => {
    onSave(enabled, localKey);
    setShowingSaved(true);
    setDraftKey("");
    setIsDirty(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowingSaved(false), 1500);
  };

  return (
    <div className="vercel-controls mt-3 border-t border-[color:var(--border)] pt-3">
      <label className="checkbox-row inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
        />
        <span>Use Vercel AI Gateway</span>
      </label>
      {enabled && (
        <div className="vercel-key-row mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
          <span className="vercel-key-label col-span-full text-xs text-[color:var(--text-muted)]">Vercel API key</span>
          <input
            type="password"
            className="vercel-key-input"
            placeholder="vercel_ai_xxxxx"
            value={localKey}
            onChange={(e) => {
              setDraftKey(e.target.value);
              setIsDirty(true);
            }}
          />
          {showingSaved ? (
            <span className="saved-text text-xs font-medium text-[color:var(--ok)]">Saved</span>
          ) : (
            <button
              className="btn btn-sm"
              type="button"
              disabled={localKey.trim() === ""}
              onClick={handleSave}
            >
              Save
            </button>
          )}
        </div>
      )}
    </div>
  );
}
