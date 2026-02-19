import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";

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
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const hasChanges = localEnabled !== enabled || localApiKey !== apiKey;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <h4 className="text-sm font-semibold text-card-foreground">Vercel Gateway Integration</h4>
        <p className="text-xs text-muted-foreground">
          Route Claude requests through Claude Code (Vercel) if connected.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="text-sm font-medium text-foreground cursor-pointer flex-1" htmlFor="vercel-gateway-toggle">
          Enable Vercel Routing
        </label>
        <Switch
          id="vercel-gateway-toggle"
          checked={localEnabled}
          onCheckedChange={setLocalEnabled}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider" htmlFor="vercel-api-key">
          Global API Key
        </label>
        <Input
          id="vercel-api-key"
          type="password"
          placeholder="sk-ant-..."
          value={localApiKey}
          onChange={(e) => setLocalApiKey(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Leave blank to use default per-account keys.
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          size="sm"
          onClick={() => onSave(localEnabled, localApiKey.trim())}
          disabled={!hasChanges}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
