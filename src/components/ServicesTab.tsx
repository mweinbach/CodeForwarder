import TabHeader from "./TabHeader";
import ServiceRow from "./ServiceRow";
import VercelGatewayControls from "./VercelGatewayControls";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";
import type { ServiceType, AuthAccount } from "../types";
import { SERVICE_ORDER, PROVIDER_KEYS } from "../types";

interface AuthResult {
  success: boolean;
  message: string;
}

interface ServicesTabProps {
  authResult: AuthResult | null;
  authenticatingService: ServiceType | null;
  handleConnect: (serviceType: ServiceType) => void;
  deleteAccount: (filePath: string) => void;
  setProviderEnabled: (key: string, enabled: boolean) => void;
  getAccounts: (serviceType: ServiceType) => AuthAccount[];
  isProviderEnabled: (serviceType: ServiceType) => boolean;
  getCustomTitle: (serviceType: ServiceType) => string | undefined;
  serviceIconMap: Record<ServiceType, string>;
  settings: any;
  setVercelConfig: (enabled: boolean, apiKey: string) => void;
}

export default function ServicesTab({
  authResult,
  authenticatingService,
  handleConnect,
  deleteAccount,
  setProviderEnabled,
  getAccounts,
  isProviderEnabled,
  getCustomTitle,
  serviceIconMap,
  settings,
  setVercelConfig,
}: ServicesTabProps) {
  return (
    <div className="tab-content animate-in flex flex-col gap-6 pb-6">
      <TabHeader
        title="Services"
        subtitle="Enable providers and manage connected accounts."
      />
      {authResult ? (
        <Alert variant={authResult.success ? "default" : "destructive"} className={authResult.success ? "border-green-500/50 text-green-700 dark:text-green-400" : ""}>
          {authResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <AlertTitle>{authResult.success ? "Success" : "Error"}</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{authResult.message}</AlertDescription>
        </Alert>
      ) : null}
      <section className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <div className="divide-y divide-border">
          {SERVICE_ORDER.map((serviceType) => (
            <ServiceRow
              key={serviceType}
              serviceType={serviceType}
              accounts={getAccounts(serviceType)}
              isEnabled={isProviderEnabled(serviceType)}
              isAuthenticating={authenticatingService === serviceType}
              onConnect={() => handleConnect(serviceType)}
              onDisconnect={(filePath) => deleteAccount(filePath)}
              onToggleEnabled={(enabled) =>
                setProviderEnabled(PROVIDER_KEYS[serviceType], enabled)
              }
              icon={serviceIconMap[serviceType]}
              customTitle={getCustomTitle(serviceType)}
            >
              {serviceType === "claude" ? (
                <VercelGatewayControls
                  enabled={settings.vercel_gateway_enabled}
                  apiKey={settings.vercel_api_key}
                  onSave={setVercelConfig}
                />
              ) : undefined}
            </ServiceRow>
          ))}
        </div>
      </section>
    </div>
  );
}
