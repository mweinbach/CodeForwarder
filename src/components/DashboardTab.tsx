import { Server, AlertCircle } from "lucide-react";
import TabHeader from "./TabHeader";
import ServerStatus from "./ServerStatus";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import type { ServerState } from "../types";

interface DashboardTabProps {
  serverState: ServerState | null;
  downloadProgress: number | null;
  binaryDownloading: boolean;
  enabledServiceCount: number;
  activeAccounts: number;
  expiredAccounts: number;
  operationalError: string | null;
  dismissOperationalError: () => void;
  handleStartStop: () => void;
  downloadBinary: () => void;
}

export default function DashboardTab({
  serverState,
  downloadProgress,
  binaryDownloading,
  enabledServiceCount,
  activeAccounts,
  expiredAccounts,
  operationalError,
  dismissOperationalError,
  handleStartStop,
  downloadBinary,
}: DashboardTabProps) {
  return (
    <div className="tab-content animate-in flex flex-col gap-6 pb-6">
      <TabHeader
        title="Dashboard"
        subtitle="Runtime health and account readiness at a glance."
      />

      {operationalError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span className="whitespace-pre-line">{operationalError}</span>
            <Button size="sm" variant="outline" onClick={dismissOperationalError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-xl border bg-card text-card-foreground shadow p-4">
          <span className="text-xs font-medium text-muted-foreground">Services</span>
          <span className="text-3xl font-semibold tracking-tight tabular-nums">{enabledServiceCount}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border bg-card text-card-foreground shadow p-4">
          <span className="text-xs font-medium text-muted-foreground">Active</span>
          <span className="text-3xl font-semibold tracking-tight tabular-nums">{activeAccounts}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border bg-card text-card-foreground shadow p-4">
          <span className="text-xs font-medium text-muted-foreground">Expired</span>
          <span className="text-3xl font-semibold tracking-tight tabular-nums">{expiredAccounts}</span>
        </div>
      </div>

      <section className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Server size={14} />
            <h2 className="text-xs font-semibold uppercase tracking-wide">Proxy Engine</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Control local proxy runtime and bundled binary readiness.
          </p>
        </div>
        {serverState && (
          <ServerStatus
            isRunning={serverState.is_running}
            binaryAvailable={serverState.binary_available}
            binaryDownloading={binaryDownloading}
            downloadProgress={downloadProgress}
            onStartStop={handleStartStop}
            onDownloadBinary={downloadBinary}
          />
        )}
      </section>
    </div>
  );
}
