import { Download, Play, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

interface ServerStatusProps {
  isRunning: boolean;
  binaryAvailable: boolean;
  binaryDownloading: boolean;
  downloadProgress: number | null;
  onStartStop: () => void;
  onDownloadBinary: () => void;
}

export default function ServerStatus({
  isRunning,
  binaryAvailable,
  binaryDownloading,
  downloadProgress,
  onStartStop,
  onDownloadBinary,
}: ServerStatusProps) {
  const readyCaption = isRunning
    ? "Local runtime is active and currently handling traffic."
    : "Runtime is ready. First start may take a moment while bundled files are staged.";

  if (!binaryAvailable) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-semibold">Proxy engine</span>
          <p className="text-sm text-muted-foreground">
            No runtime detected yet. Download the latest CLIProxyAPIPlus binary.
          </p>
          <p className="text-xs text-muted-foreground opacity-80">
            If this build includes a bundled runtime, it will be detected automatically.
          </p>
        </div>
        <div className="inline-flex items-center">
          {binaryDownloading ? (
            <div className="flex w-40 flex-col gap-2">
              <Progress value={downloadProgress ?? 0} className="h-1.5 w-full" />
              <span className="text-right text-xs text-muted-foreground font-medium">
                {downloadProgress != null
                  ? `${Math.round(downloadProgress)}% complete`
                  : "Downloading..."}
              </span>
            </div>
          ) : (
            <Button onClick={onDownloadBinary}>
              <Download className="mr-2 h-4 w-4" />
              Download Runtime
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-semibold">Proxy engine</span>
        <p className="text-sm text-muted-foreground">{readyCaption}</p>
        <p className="text-xs text-muted-foreground opacity-80">
          Built-in runtime support is enabled for packaged builds.
        </p>
      </div>
      <div className="inline-flex items-center">
        <Button
          variant={isRunning ? "destructive" : "default"}
          className={`min-w-[136px] ${isRunning ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20" : ""}`}
          onClick={onStartStop}
        >
          {isRunning ? <Square className="mr-2 h-4 w-4" fill="currentColor" /> : <Play className="mr-2 h-4 w-4" fill="currentColor" />}
          <span>{isRunning ? "Stop Server" : "Start Server"}</span>
        </Button>
      </div>
    </div>
  );
}
