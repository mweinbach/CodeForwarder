import { RefreshCw, AlertCircle } from "lucide-react";
import type {
  UsageDashboardPayload,
  UsageRange,
  UsageBreakdownRow,
} from "../types";
import TabHeader from "./TabHeader";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Progress } from "./ui/progress";

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
    <div className="flex flex-col gap-6 pb-6 animate-in">
      <TabHeader
        title="Usage"
        subtitle="Track requests and token usage by provider, model, and account."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={onDismissError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 p-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${range === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => onRangeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Total Tokens</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {formatNumber(usage.summary.total_tokens)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Input</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {formatNumber(usage.summary.input_tokens)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Output</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {formatNumber(usage.summary.output_tokens)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Cached</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {formatNumber(usage.summary.cached_tokens)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Reasoning</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {formatNumber(usage.summary.reasoning_tokens)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Error Rate</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {formatPercent(usage.summary.error_rate)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Token Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {usage.timeseries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No usage events yet for this range.</p>
            ) : (
              <div className="flex h-[140px] items-end gap-1.5 pt-2">
                {usage.timeseries.map((point) => (
                  <div
                    className="flex min-w-6 flex-1 flex-col items-center gap-1.5"
                    key={`${point.bucket}-${point.total_tokens}`}
                  >
                    <div
                      className="w-full rounded-t-sm bg-primary opacity-80 transition-all hover:opacity-100"
                      style={{
                        height: `${Math.max(
                          4,
                          Math.round((point.total_tokens / maxPointTokens) * 100),
                        )}%`,
                      }}
                      title={`${point.bucket}: ${formatNumber(point.total_tokens)} tokens`}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Provider Share</CardTitle>
          </CardHeader>
          <CardContent>
            {providerBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No provider usage yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {providerBreakdown.map((row) => (
                  <div className="flex flex-col gap-2" key={row.provider}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{row.provider}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatNumber(row.tokens)} tokens ({formatPercent(
                          totalProviderTokens > 0
                            ? (row.tokens / totalProviderTokens) * 100
                            : 0,
                        )})
                      </span>
                    </div>
                    <Progress
                      value={(row.tokens / maxProviderTokens) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usage.breakdown.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No detailed usage data available yet.</div>
          ) : (
            <div className="max-h-[400px] overflow-auto overscroll-none">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cached</TableHead>
                    <TableHead className="text-right">Reasoning</TableHead>
                    <TableHead>Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage.breakdown.map((row) => (
                    <TableRow key={`${row.provider}-${row.model}-${row.account_key}`}>
                      <TableCell className="font-medium">{row.provider}</TableCell>
                      <TableCell>{row.model}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={row.account_label || row.account_key}>
                        {row.account_label || row.account_key}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.requests)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.total_tokens)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatNumber(row.cached_tokens)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatNumber(row.reasoning_tokens)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.last_seen
                          ? new Date(row.last_seen).toLocaleString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
