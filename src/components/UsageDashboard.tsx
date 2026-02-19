import { RefreshCw } from "lucide-react";
import type {
  UsageDashboardPayload,
  UsageRange,
  UsageBreakdownRow,
} from "../types";
import TabHeader from "./TabHeader";

interface UsageDashboardProps {
  dashboard: UsageDashboardPayload;
  range: UsageRange;
  onRangeChange: (range: UsageRange) => void;
  onRefresh: () => void;
  isLoading: boolean;
  error: string | null;
  onDismissError: () => void;
}

const RANGE_OPTIONS: Array<{ label: string; value: UsageRange }> = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "All", value: "all" },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value)));
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getProviderBreakdown(rows: UsageBreakdownRow[]) {
  const byProvider = new Map<string, { requests: number; tokens: number }>();
  rows.forEach((row) => {
    const current = byProvider.get(row.provider) ?? { requests: 0, tokens: 0 };
    current.requests += row.requests;
    current.tokens += row.total_tokens;
    byProvider.set(row.provider, current);
  });
  return [...byProvider.entries()]
    .map(([provider, value]) => ({ provider, ...value }))
    .sort((a, b) => b.tokens - a.tokens);
}

export default function UsageDashboard({
  dashboard,
  range,
  onRangeChange,
  onRefresh,
  isLoading,
  error,
  onDismissError,
}: UsageDashboardProps) {
  const usage = dashboard.dashboard;
  const providerBreakdown = getProviderBreakdown(usage.breakdown);
  const totalProviderTokens = providerBreakdown.reduce(
    (sum, row) => sum + row.tokens,
    0,
  );
  const maxPointTokens = Math.max(
    1,
    ...usage.timeseries.map((point) => point.total_tokens),
  );
  const maxProviderTokens = Math.max(
    1,
    ...providerBreakdown.map((row) => row.tokens),
  );

  return (
    <div className="usage-dashboard flex flex-col gap-5">
      <TabHeader
        title="Usage"
        subtitle="Track requests and token usage by provider, model, and account."
      />

      {error ? (
        <div className="operation-error-banner flex items-center gap-3 rounded-md border border-[color:var(--danger)]/20" role="alert">
          <p className="operation-error-message flex-1">{error}</p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={onDismissError}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="settings-section usage-controls">
        <div className="usage-controls-row flex flex-wrap items-center justify-between gap-3">
          <div className="usage-range-picker inline-flex flex-wrap items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`range-pill rounded-full px-3 py-1.5 text-xs font-semibold transition ${range === option.value ? "active" : ""}`}
                onClick={() => onRangeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-sm usage-refresh-btn min-w-[112px]"
            onClick={onRefresh}
          >
            <RefreshCw size={14} className={isLoading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      <div className="usage-kpi-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="stat-item">
          <span className="stat-label">Total Tokens</span>
          <span className="stat-value">
            {formatNumber(usage.summary.total_tokens)}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Input</span>
          <span className="stat-value">
            {formatNumber(usage.summary.input_tokens)}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Output</span>
          <span className="stat-value">
            {formatNumber(usage.summary.output_tokens)}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Cached</span>
          <span className="stat-value">
            {formatNumber(usage.summary.cached_tokens)}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Reasoning</span>
          <span className="stat-value">
            {formatNumber(usage.summary.reasoning_tokens)}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Error Rate</span>
          <span className="stat-value">
            {formatPercent(usage.summary.error_rate)}
          </span>
        </div>
      </div>

      <div className="usage-grid-two grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="settings-section usage-insight-card usage-trend-card">
          <h2 className="section-title">Token Trend</h2>
          {usage.timeseries.length === 0 ? (
            <p className="empty-note">No usage events yet for this range.</p>
          ) : (
            <div className="token-chart grid auto-cols-[minmax(24px,1fr)] grid-flow-col items-end gap-1.5 overflow-x-auto pt-2">
              {usage.timeseries.map((point) => (
                <div
                  className="token-bar flex min-w-6 flex-col items-center gap-1.5"
                  key={`${point.bucket}-${point.total_tokens}`}
                >
                  <div
                    className="token-bar-fill w-full rounded-md bg-[color:var(--accent)] opacity-85"
                    style={{
                      height: `${Math.max(
                        6,
                        Math.round((point.total_tokens / maxPointTokens) * 100),
                      )}%`,
                    }}
                    title={`${point.bucket}: ${formatNumber(point.total_tokens)} tokens`}
                  />
                  <span className="token-bar-label text-[10px] text-[color:var(--text-muted)]">{point.bucket}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="settings-section usage-insight-card usage-provider-card">
          <h2 className="section-title">Provider Share</h2>
          {providerBreakdown.length === 0 ? (
            <p className="empty-note">No provider usage yet.</p>
          ) : (
            <div className="provider-share-list flex flex-col gap-2.5">
              {providerBreakdown.map((row) => (
                <div className="provider-share-row flex flex-col gap-1.5" key={row.provider}>
                  <div className="provider-share-label flex items-baseline justify-between gap-2 text-sm text-[color:var(--text-secondary)]">
                    <span>{row.provider}</span>
                    <span>
                      {formatNumber(row.tokens)} tokens |{" "}
                      {formatPercent(
                        totalProviderTokens > 0
                          ? (row.tokens / totalProviderTokens) * 100
                          : 0,
                      )}
                    </span>
                  </div>
                  <div className="provider-share-track h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--track)]">
                    <div
                      className="provider-share-fill h-full rounded-full bg-[color:var(--accent)]"
                      style={{
                        width: `${Math.max(
                          2,
                          Math.round((row.tokens / maxProviderTokens) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="settings-section usage-breakdown-section">
        <h2 className="section-title">Detailed Breakdown</h2>
        {usage.breakdown.length === 0 ? (
          <p className="empty-note">No detailed usage data available yet.</p>
        ) : (
          <div className="usage-table-wrap overflow-auto rounded-md border border-[color:var(--border)]">
            <table className="usage-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Account</th>
                  <th>Requests</th>
                  <th>Tokens</th>
                  <th>Cached</th>
                  <th>Reasoning</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {usage.breakdown.map((row) => (
                  <tr key={`${row.provider}-${row.model}-${row.account_key}`}>
                    <td>{row.provider}</td>
                    <td>{row.model}</td>
                    <td>{row.account_label || row.account_key}</td>
                    <td>{formatNumber(row.requests)}</td>
                    <td>{formatNumber(row.total_tokens)}</td>
                    <td>{formatNumber(row.cached_tokens)}</td>
                    <td>{formatNumber(row.reasoning_tokens)}</td>
                    <td>
                      {row.last_seen
                        ? new Date(row.last_seen).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
