import { Trash2 } from "lucide-react";
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
    <div className={`account-row flex items-center gap-2 py-2 ${account.is_expired ? "is-expired opacity-60" : ""}`}>
      <span
        className={`account-dot h-1.5 w-1.5 shrink-0 rounded-full ${account.is_expired ? "expired" : "active"}`}
      />
      <span className="account-name flex-1 truncate text-sm" title={account.display_name}>
        {account.display_name}
      </span>
      {account.is_expired && (
        <span className="expired-badge text-xs font-medium text-[color:var(--warn)]">(expired)</span>
      )}
      <button type="button" className="btn-remove inline-flex items-center p-0 text-xs font-medium text-[color:var(--danger)] opacity-70 transition hover:opacity-100" onClick={handleRemove} title="Remove account">
        <Trash2 size={12} />
      </button>
    </div>
  );
}
