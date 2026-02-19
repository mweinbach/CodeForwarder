import { useState, useEffect } from "react";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { ServiceType, AuthAccount } from "../types";
import { SERVICE_DISPLAY_NAMES } from "../types";
import AccountRow from "./AccountRow";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";

interface ServiceRowProps {
  serviceType: ServiceType;
  accounts: AuthAccount[];
  isEnabled: boolean;
  isAuthenticating: boolean;
  onConnect: () => void;
  onDisconnect: (filePath: string) => void;
  onToggleEnabled: (enabled: boolean) => void;
  children?: React.ReactNode;
  icon: string;
  customTitle?: string;
}

export default function ServiceRow({
  serviceType,
  accounts,
  isEnabled,
  isAuthenticating,
  onConnect,
  onDisconnect,
  onToggleEnabled,
  children,
  icon,
  customTitle,
}: ServiceRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayName = customTitle ?? SERVICE_DISPLAY_NAMES[serviceType];
  const activeCount = accounts.filter((account) => !account.is_expired).length;
  const expiredCount = accounts.length - activeCount;

  // Auto-expand if any account is expired
  useEffect(() => {
    if (accounts.some((a) => a.is_expired)) {
      setIsExpanded(true);
    }
  }, [accounts]);

  return (
    <div className={`py-4 ${isEnabled ? "" : "opacity-60 grayscale-[0.2]"}`}>
      <div className="flex items-center gap-3">
        <Switch
          checked={isEnabled}
          onCheckedChange={onToggleEnabled}
          aria-label={`Enable ${displayName}`}
        />
        <img src={icon} alt={displayName} className="h-6 w-6 rounded-md object-contain" />
        <span className="text-sm font-semibold">{displayName}</span>
        <div className="flex-1" />
        {isAuthenticating ? (
          <span className="spinner" />
        ) : isEnabled ? (
          <Button type="button" size="sm" variant="outline" onClick={onConnect}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add
          </Button>
        ) : (
          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-normal">
            Disabled
          </Badge>
        )}
      </div>

      {isEnabled && (
        <div className="mt-4 pl-12">
          {accounts.length > 0 ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 hover:bg-muted/50 p-2 -ml-2 rounded-md transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1 items-start text-left">
                  <span className="text-sm font-medium">
                    {accounts.length} connected account
                    {accounts.length === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400 font-medium px-2 py-0">
                      {activeCount} active
                    </Badge>
                    {expiredCount > 0 && (
                      <Badge variant="destructive" className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400 font-medium px-2 py-0">
                        {expiredCount} expired
                      </Badge>
                    )}
                  </span>
                </span>
                {accounts.length > 1 && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    Round-robin w/ auto-failover
                  </span>
                )}
                <span className="text-muted-foreground">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>

              {isExpanded && (
                <div className="mt-3 flex flex-col gap-2">
                  {accounts.map((account) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      serviceName={displayName}
                      onRemove={() => onDisconnect(account.file_path)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="py-2 text-sm text-muted-foreground">No connected accounts yet.</div>
          )}

          {children ? <div className="mt-4 pt-4 border-t border-border/50">{children}</div> : null}
        </div>
      )}
    </div>
  );
}
