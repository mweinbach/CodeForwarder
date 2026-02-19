function normalizeKnownConnectionError(message: string): string {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const isGenericConnectionGuidance =
    lower.includes("connection error") &&
    (lower.includes("network issue") ||
      lower.includes("internet connection") ||
      lower.includes("firewall") ||
      lower.includes("proxy settings"));

  if (isGenericConnectionGuidance) {
    return "Connection failed. Check your internet connection and firewall/proxy settings, then retry.";
  }

  return trimmed;
}

export function toErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "string" && err.trim() !== "") {
    return normalizeKnownConnectionError(err);
  }

  if (err instanceof Error && err.message.trim() !== "") {
    return normalizeKnownConnectionError(err.message);
  }

  return `${fallback}: ${String(err)}`;
}
