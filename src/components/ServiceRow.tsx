import { useState, useEffect } from "react";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { ServiceType, AuthAccount } from "../types";
import { SERVICE_DISPLAY_NAMES } from "../types";
import AccountRow from "./AccountRow";

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
    <div className={`service-row py-3.5 ${isEnabled ? "" : "is-disabled opacity-60"}`}>
      <div className="service-header flex items-center gap-3">
        <label className="toggle-switch" aria-label={`Enable ${displayName}`}>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggleEnabled(e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
        <img src={icon} alt={displayName} className="service-icon h-6 w-6 rounded-md object-contain" />
        <span className="service-name text-sm font-semibold">{displayName}</span>
        <div className="service-spacer flex-1" />
        {isAuthenticating ? (
          <span className="spinner" />
        ) : isEnabled ? (
          <button type="button" className="btn btn-sm" onClick={onConnect}>
            <Plus size={14} />
            Add
          </button>
        ) : (
          <span className="service-disabled-pill rounded-full bg-[color:var(--surface-soft)] px-2.5 py-1 text-xs text-[color:var(--text-muted)]">Disabled</span>
        )}
      </div>

      {isEnabled && (
        <div className="service-accounts mt-3 pl-9">
          {accounts.length > 0 ? (
            <>
              <button
                type="button"
                className="accounts-summary flex w-full items-center gap-2"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <span className="accounts-summary-main flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="accounts-count text-sm font-medium">
                    {accounts.length} connected account
                    {accounts.length === 1 ? "" : "s"}
                  </span>
                  <span className="accounts-pills inline-flex items-center gap-1.5">
                    <span className="count-pill active rounded-full px-2 py-0.5 text-xs font-medium">{activeCount} active</span>
                    {expiredCount > 0 && (
                      <span className="count-pill expired rounded-full px-2 py-0.5 text-xs font-medium">
                        {expiredCount} expired
                      </span>
                    )}
                  </span>
                </span>
                {accounts.length > 1 && (
                  <span className="accounts-note text-xs text-[color:var(--text-muted)]">
                    Round-robin w/ auto-failover
                  </span>
                )}
                <span className="chevron-icon text-[color:var(--text-muted)]">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>

              {isExpanded && (
                <div className="accounts-list mt-2 flex flex-col gap-1.5">
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
            <div className="no-accounts py-2 text-sm text-[color:var(--text-muted)]">No connected accounts yet.</div>
          )}

          {children ? <div className="service-extra mt-3">{children}</div> : null}
        </div>
      )}
    </div>
  );
}
