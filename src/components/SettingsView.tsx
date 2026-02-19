import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, 
  Cloud, 
  PieChart,
  Boxes,
  Bot,
  Settings as SettingsIcon, 
  Power,
} from "lucide-react";
import { useServerState } from "../hooks/useServerState";
import { useAuthAccounts } from "../hooks/useAuthAccounts";
import { useSettings } from "../hooks/useSettings";
import { useUsageDashboard } from "../hooks/useUsageDashboard";
import type { ServiceType } from "../types";
import { SERVICE_ORDER, PROVIDER_KEYS } from "../types";

import TitleBar from "./TitleBar";
import DashboardTab from "./DashboardTab";
import ServicesTab from "./ServicesTab";
import SettingsTab from "./SettingsTab";
import UsageDashboard from "./UsageDashboard";
import ModelsTab from "./ModelsTab";
import AgentsTab from "./AgentsTab";
import QwenEmailDialog from "./QwenEmailDialog";
import ZaiApiKeyDialog from "./ZaiApiKeyDialog";
import { useUpdater } from "../hooks/useUpdater";

import iconAntigravityLight from "../assets/icons/light/icon-antigravity.png";
import iconClaudeLight from "../assets/icons/light/icon-claude.png";
import iconCodexLight from "../assets/icons/light/icon-codex.png";
import iconGeminiLight from "../assets/icons/light/icon-gemini.png";
import iconCopilotLight from "../assets/icons/light/icon-copilot.png";
import iconQwenLight from "../assets/icons/light/icon-qwen.png";
import iconZaiLight from "../assets/icons/light/icon-zai.png";

import iconAntigravityDark from "../assets/icons/dark/icon-antigravity.png";
import iconClaudeDark from "../assets/icons/dark/icon-claude.png";
import iconCodexDark from "../assets/icons/dark/icon-codex.png";
import iconGeminiDark from "../assets/icons/dark/icon-gemini.png";
import iconCopilotDark from "../assets/icons/dark/icon-copilot.png";
import iconQwenDark from "../assets/icons/dark/icon-qwen.png";
import iconZaiDark from "../assets/icons/dark/icon-zai.png";
import { Badge } from "./ui/badge";

type ThemeMode = "light" | "dark";
type TabKey =
  | "dashboard"
  | "usage"
  | "services"
  | "models"
  | "agents"
  | "settings";

const TAB_ITEMS: Array<{
  key: TabKey;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  group: "overview" | "configuration";
}> = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Runtime health and account readiness at a glance.",
    icon: LayoutDashboard,
    group: "overview",
  },
  {
    key: "usage",
    label: "Usage",
    description: "Requests, token trends, and provider distribution.",
    icon: PieChart,
    group: "overview",
  },
  {
    key: "services",
    label: "Services",
    description: "Enable providers and manage connected identities.",
    icon: Cloud,
    group: "configuration",
  },
  {
    key: "models",
    label: "Models",
    description: "Browse model catalogs from your local runtime.",
    icon: Boxes,
    group: "configuration",
  },
  {
    key: "agents",
    label: "Custom Models",
    description: "Manage Factory custom models powered by CodeForwarder.",
    icon: Bot,
    group: "configuration",
  },
  {
    key: "settings",
    label: "Settings",
    description: "Desktop behavior and local file controls.",
    icon: SettingsIcon,
    group: "configuration",
  },
];

const SERVICE_ICON_MAP: Record<ThemeMode, Record<ServiceType, string>> = {
  light: {
    antigravity: iconAntigravityLight,
    claude: iconClaudeLight,
    codex: iconCodexLight,
    gemini: iconGeminiLight,
    "github-copilot": iconCopilotLight,
    qwen: iconQwenLight,
    zai: iconZaiLight,
  },
  dark: {
    antigravity: iconAntigravityDark,
    claude: iconClaudeDark,
    codex: iconCodexDark,
    gemini: iconGeminiDark,
    "github-copilot": iconCopilotDark,
    qwen: iconQwenDark,
    zai: iconZaiDark,
  },
};

function isTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return "__TAURI_INTERNALS__" in window;
}

function isMacOS(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Macintosh|Mac OS X/.test(navigator.userAgent);
}

function isWindows(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Windows/.test(navigator.userAgent);
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function SettingsView() {
  return useSettingsView();
}

function useSettingsView() {
  const {
    serverState,
    downloadProgress,
    startServer,
    stopServer,
    downloadBinary,
    lastError: serverError,
    clearLastError: clearServerError,
  } = useServerState();
  const {
    accounts,
    authenticatingService,
    authResult,
    runAuth,
    deleteAccount,
    saveZaiKey,
    lastError: accountsError,
    clearLastError: clearAccountsError,
  } = useAuthAccounts();
  const {
    settings,
    setProviderEnabled,
    setVercelConfig,
    setLaunchAtLogin,
    lastError: settingsError,
    clearLastError: clearSettingsError,
  } = useSettings();
  const {
    status: updateStatus,
    lastCheckedAt: updateLastCheckedAt,
    availableVersion,
    progressPercent,
    lastError: updateError,
    checkForUpdates,
  } = useUpdater();

  const [showQwenDialog, setShowQwenDialog] = useState(false);
  const [showZaiDialog, setShowZaiDialog] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const settingsScrollRef = useRef<HTMLElement | null>(null);
  const {
    range: usageRange,
    setRange: setUsageRange,
    dashboard: usageDashboard,
    isLoading: usageLoading,
    lastError: usageError,
    refresh: refreshUsage,
    clearLastError: clearUsageError,
  } = useUsageDashboard(activeTab === "usage");
  const operationalError = serverError ?? settingsError ?? accountsError;

  const updateStatusLabel = (() => {
    if (updateStatus === "checking") return "Checking...";
    if (updateStatus === "unavailable") return "Update server unavailable.";
    if (updateStatus === "downloading") {
      if (progressPercent !== null) return `Downloading (${progressPercent}%)...`;
      return "Downloading...";
    }
    if (updateStatus === "ready_to_restart") return "Update ready. Restart to apply.";
    if (updateStatus === "up_to_date") return "Up to date.";
    if (updateStatus === "error") return "Update failed.";
    return "Idle.";
  })();

  const updateCheckedAtLabel = (() => {
    if (!updateLastCheckedAt) return "Never checked.";
    try {
      return `Last checked: ${new Date(updateLastCheckedAt).toLocaleString()}`;
    } catch {
      return "Last checked: unknown";
    }
  })();

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setThemeMode(event.matches ? "dark" : "light");
    };

    setThemeMode(media.matches ? "dark" : "light");
    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
    // Sync with shadcn theme
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  useEffect(() => {
    if (!settingsScrollRef.current) {
      return;
    }
    settingsScrollRef.current.scrollTop = 0;
  }, [activeTab]);

  if (!serverState || !settings) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-2 text-muted-foreground">
        <span className="spinner" />
        <span>Loading settings...</span>
      </div>
    );
  }

  const handleStartStop = () => {
    if (serverState.is_running) {
      stopServer();
    } else {
      startServer();
    }
  };

  const handleConnect = (serviceType: ServiceType) => {
    if (serviceType === "qwen") {
      setShowQwenDialog(true);
    } else if (serviceType === "zai") {
      setShowZaiDialog(true);
    } else {
      runAuth({ type: serviceType });
    }
  };

  const handleQwenSubmit = (email: string) => {
    setShowQwenDialog(false);
    runAuth({ type: "qwen", data: { email } });
  };

  const handleZaiSubmit = (apiKey: string) => {
    setShowZaiDialog(false);
    saveZaiKey(apiKey);
  };

  const getCustomTitle = (serviceType: ServiceType): string | undefined => {
    if (
      serviceType === "claude" &&
      settings.vercel_gateway_enabled &&
      settings.vercel_api_key !== ""
    ) {
      return "Claude Code (via Vercel)";
    }
    return undefined;
  };

  const getAccounts = (serviceType: ServiceType) => {
    if (!accounts) return [];
    const sa = accounts[serviceType];
    return sa ? sa.accounts : [];
  };

  const isProviderEnabled = (serviceType: ServiceType) => {
    const key = PROVIDER_KEYS[serviceType];
    return settings.enabled_providers[key] ?? true;
  };

  const enabledServiceCount = SERVICE_ORDER.filter((serviceType) =>
    isProviderEnabled(serviceType)
  ).length;
  const totalAccounts = SERVICE_ORDER.reduce(
    (count, serviceType) => count + getAccounts(serviceType).length,
    0,
  );
  const expiredAccounts = SERVICE_ORDER.reduce(
    (count, serviceType) =>
      count + getAccounts(serviceType).filter((account) => account.is_expired).length,
    0,
  );
  const activeAccounts = totalAccounts - expiredAccounts;

  const overviewTabs = TAB_ITEMS.filter((item) => item.group === "overview");
  const configurationTabs = TAB_ITEMS.filter(
    (item) => item.group === "configuration",
  );

  const dismissOperationalError = () => {
    clearServerError();
    clearSettingsError();
    clearAccountsError();
  };

  const tauriRuntime = isTauriRuntime();
  const useCustomWindowsWindowChrome = tauriRuntime && isWindows();
  const useNativeMacWindowChrome = tauriRuntime && isMacOS();

  return (
    <div className="grid h-full w-full overflow-hidden bg-background text-foreground md:grid-cols-[200px_1fr] grid-cols-1 grid-rows-[auto_1fr] md:grid-rows-1 overscroll-none">
      {useCustomWindowsWindowChrome ? <TitleBar /> : null}
      <aside className="flex min-w-0 flex-row md:flex-col border-b md:border-b-0 md:border-r border-border bg-sidebar overflow-x-auto overscroll-none md:overflow-visible p-4 md:pt-10 gap-2 md:gap-0">
        <div
          className="flex items-center gap-2 md:mb-2 md:pb-5 md:border-b border-border pr-3 md:pr-1 border-r md:border-r-0"
          data-tauri-drag-region={useCustomWindowsWindowChrome ? "" : undefined}
        >
          <div>
            <p className="hidden md:block text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Control Center</p>
            <span className="text-[15px] font-semibold tracking-tight">CodeForwarder</span>
          </div>
        </div>

        <nav className="flex flex-row md:flex-col gap-1">
          <p className="hidden md:block text-[10px] tracking-[0.06em] uppercase text-muted-foreground font-semibold px-2.5 pt-3.5 pb-1.5 opacity-70">Overview</p>
          {overviewTabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition whitespace-nowrap md:whitespace-normal ${activeTab === item.key ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}
                onClick={() => setActiveTab(item.key)}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-60" />
                {item.label}
              </button>
            );
          })}

          <p className="hidden md:block text-[10px] tracking-[0.06em] uppercase text-muted-foreground font-semibold px-2.5 pt-3.5 pb-1.5 opacity-70">Configure</p>
          {configurationTabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition whitespace-nowrap md:whitespace-normal ${activeTab === item.key ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}
                onClick={() => setActiveTab(item.key)}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-60" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden md:flex mt-auto flex-col gap-1.5 p-3 border-t border-border">
          <Badge variant={serverState.is_running ? "default" : "destructive"} className="w-fit gap-1.5">
            <Power className="h-3 w-3 shrink-0" />
            {serverState.is_running ? "Online" : "Offline"}
          </Badge>
          <p className="text-xs text-muted-foreground">
            {enabledServiceCount} services · {activeAccounts} accounts
          </p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col overflow-hidden bg-background relative">
        {useNativeMacWindowChrome ? (
          <div className="hidden md:block absolute top-0 left-0 right-0 h-[30px] bg-transparent z-[100]" data-tauri-drag-region aria-hidden="true" />
        ) : null}
        <main className="flex-1 overflow-auto overscroll-none h-full px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent" ref={settingsScrollRef}>
          <div className="max-w-[800px] mx-auto">
            {activeTab === "dashboard" && (
              <DashboardTab
                serverState={serverState}
                downloadProgress={downloadProgress?.progress ?? null}
                binaryDownloading={serverState.binary_downloading}
                enabledServiceCount={enabledServiceCount}
                activeAccounts={activeAccounts}
                expiredAccounts={expiredAccounts}
                operationalError={operationalError}
                dismissOperationalError={dismissOperationalError}
                handleStartStop={handleStartStop}
                downloadBinary={downloadBinary}
              />
            )}

            {activeTab === "usage" && (
              <UsageDashboard
                dashboard={usageDashboard}
                range={usageRange}
                onRangeChange={setUsageRange}
                onRefresh={refreshUsage}
                isLoading={usageLoading}
                error={usageError}
                onDismissError={clearUsageError}
              />
            )}

            {activeTab === "services" && (
              <ServicesTab
                authResult={authResult}
                authenticatingService={authenticatingService}
                handleConnect={handleConnect}
                deleteAccount={deleteAccount}
                setProviderEnabled={setProviderEnabled}
                getAccounts={getAccounts}
                isProviderEnabled={isProviderEnabled}
                getCustomTitle={getCustomTitle}
                serviceIconMap={SERVICE_ICON_MAP[themeMode]}
                settings={settings}
                setVercelConfig={setVercelConfig}
              />
            )}

            {activeTab === "models" && <ModelsTab />}
            {activeTab === "agents" && <AgentsTab />}

            {activeTab === "settings" && (
              <SettingsTab
                updateStatusLabel={updateStatusLabel}
                availableVersion={availableVersion}
                updateError={updateError}
                updateCheckedAtLabel={updateCheckedAtLabel}
                updateStatus={updateStatus}
                checkForUpdates={checkForUpdates}
                settings={settings}
                setLaunchAtLogin={setLaunchAtLogin}
              />
            )}
          </div>
        </main>
      </section>

      <QwenEmailDialog
        isOpen={showQwenDialog}
        onClose={() => setShowQwenDialog(false)}
        onSubmit={handleQwenSubmit}
      />
      <ZaiApiKeyDialog
        isOpen={showZaiDialog}
        onClose={() => setShowZaiDialog(false)}
        onSubmit={handleZaiSubmit}
      />
    </div>
  );
}
