import { Download, Play, Square } from "lucide-react";

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
      <div className="server-status flex flex-wrap items-center justify-between gap-4">
        <div className="status-copy flex min-w-0 flex-1 flex-col gap-1">
          <span className="status-label text-sm font-semibold">Proxy engine</span>
          <p className="status-caption text-sm text-[color:var(--text-secondary)]">
            No runtime detected yet. Download the latest CLIProxyAPIPlus binary.
          </p>
          <p className="status-subhint text-xs text-[color:var(--text-muted)]">
            If this build includes a bundled runtime, it will be detected automatically.
          </p>
        </div>
        <div className="status-right inline-flex items-center">
          {binaryDownloading ? (
            <div className="download-progress flex w-40 flex-col gap-1.5">
              <progress
                className="download-progress-bar h-1.5 w-full overflow-hidden rounded-full border-0 bg-[color:var(--track)]"
                value={downloadProgress ?? undefined}
                max={100}
              />
              <span className="progress-text text-right text-xs text-[color:var(--text-muted)]">
                {downloadProgress != null
                  ? `${Math.round(downloadProgress)}% complete`
                  : "Downloading..."}
              </span>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onDownloadBinary}>
              <Download size={14} />
              Download Runtime
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="server-status flex flex-wrap items-center justify-between gap-4">
      <div className="status-copy flex min-w-0 flex-1 flex-col gap-1">
        <span className="status-label text-sm font-semibold">Proxy engine</span>
        <p className="status-caption text-sm text-[color:var(--text-secondary)]">{readyCaption}</p>
        <p className="status-subhint text-xs text-[color:var(--text-muted)]">
          Built-in runtime support is enabled for packaged builds.
        </p>
      </div>
      <div className="status-right inline-flex items-center">
        <button
          className={`btn btn-status min-w-[136px] ${isRunning ? "is-running" : "is-stopped"}`}
          onClick={onStartStop}
        >
          {isRunning ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          <span>{isRunning ? "Stop Server" : "Start Server"}</span>
        </button>
      </div>
    </div>
  );
}
