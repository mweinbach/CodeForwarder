import { relaunch } from "@tauri-apps/plugin-process";
import { invoke } from "@tauri-apps/api/core";
import { FolderOpen } from "lucide-react";
import TabHeader from "./TabHeader";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

interface SettingsTabProps {
  updateStatusLabel: string;
  availableVersion: string | null;
  updateError: string | null;
  updateCheckedAtLabel: string;
  updateStatus: string;
  checkForUpdates: (opts: { manual: boolean }) => void;
  settings: any;
  setLaunchAtLogin: (launch: boolean) => void;
}

export default function SettingsTab({
  updateStatusLabel,
  availableVersion,
  updateError,
  updateCheckedAtLabel,
  updateStatus,
  checkForUpdates,
  settings,
  setLaunchAtLogin,
}: SettingsTabProps) {
  return (
    <div className="tab-content animate-in flex flex-col gap-6 pb-6">
      <TabHeader
        title="Settings"
        subtitle="Desktop behavior and local file access."
      />
      <section className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-medium">App updates</span>
            <small className="text-xs text-muted-foreground">
              {updateStatusLabel}{" "}
              {availableVersion ? `Available: ${availableVersion}.` : ""}
              {updateError ? ` ${updateError}` : ""}
            </small>
            <small className="text-xs text-muted-foreground">{updateCheckedAtLabel}</small>
          </div>
          <div className="flex items-center justify-end gap-2">
            {updateStatus === "ready_to_restart" ? (
              <Button size="sm" variant="outline" onClick={() => relaunch()}>
                Restart to apply
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() => checkForUpdates({ manual: true })}
              disabled={updateStatus === "checking" || updateStatus === "downloading"}
            >
              Check for updates
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-medium">Launch at login</span>
            <small className="text-xs text-muted-foreground">Start CodeForwarder automatically.</small>
          </div>
          <Switch
            checked={settings.launch_at_login}
            onCheckedChange={setLaunchAtLogin}
            aria-label="Launch at login"
          />
        </div>
        <div className="flex items-center justify-between gap-4 py-3.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-medium">Auth files</span>
            <small className="text-xs text-muted-foreground">Open the folder where account files are stored.</small>
          </div>
          <Button size="sm" variant="outline" onClick={() => invoke("open_auth_folder")}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Open Folder
          </Button>
        </div>
      </section>
    </div>
  );
}
