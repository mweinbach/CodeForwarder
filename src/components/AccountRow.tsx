import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import type { AuthAccount } from "../types";

interface AccountRowProps {
  account: AuthAccount;
  serviceName: string;
  onRemove: () => void;
}

export default function AccountRow({
  account,
  serviceName,
  onRemove,
}: AccountRowProps) {
  const handleRemove = () => {
    if (
      window.confirm(
        `Are you sure you want to remove ${account.display_name} from ${serviceName}?`
      )
    ) {
      onRemove();
    }
  };

  return (
    <div className={`flex items-center gap-3 py-2 rounded-md hover:bg-muted/30 px-2 transition-colors ${account.is_expired ? "opacity-70 grayscale-[0.2]" : ""}`}>
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${account.is_expired ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"}`}
      />
      <span className="flex-1 truncate text-sm font-medium" title={account.display_name}>
        {account.display_name}
      </span>
      {account.is_expired && (
        <span className="text-xs font-semibold tracking-wide uppercase text-amber-600 dark:text-amber-500">(expired)</span>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleRemove} title="Remove account">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
