function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const SEGMENT_CLASSES = [
  "bg-tank-1",
  "bg-tank-2",
  "bg-tank-3",
  "bg-tank-4",
  "bg-tank-5",
  "bg-tank-6",
];

interface AccountSegment {
  id: string;
  label: string;
  used: number;
}

export function CapacityTank({
  accounts,
  totalLimit,
}: {
  accounts: AccountSegment[];
  totalLimit: number;
}) {
  const totalUsed = accounts.reduce((sum, a) => sum + a.used, 0);
  const usedPct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Pool Capacity</p>
        <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-medium text-on-primary-fixed-variant">
          {accounts.length} accounts connected
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold text-on-surface">
          {formatBytes(totalUsed)}
        </span>
        <span className="text-sm text-outline">/ {formatBytes(totalLimit)}</span>
      </div>

      <div className="mt-4 flex h-14 w-full overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
        {accounts.map((a, i) => {
          const widthPct = totalLimit > 0 ? (a.used / totalLimit) * 100 : 0;
          if (widthPct <= 0) return null;
          return (
            <div
              key={a.id}
              title={`${a.label}: ${formatBytes(a.used)}`}
              style={{ width: `${widthPct}%` }}
              className={`flex items-center justify-center overflow-hidden text-[10px] font-semibold text-on-primary/90 transition-all ${
                SEGMENT_CLASSES[i % SEGMENT_CLASSES.length]
              }`}
            >
              {widthPct > 8 && <span className="truncate px-1">{a.label}</span>}
            </div>
          );
        })}
        <div
          className="flex-1"
          style={{
            width: `${Math.max(0, 100 - usedPct)}%`,
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--color-tank-empty-stripe), var(--color-tank-empty-stripe) 4px, var(--color-tank-empty-bg) 4px, var(--color-tank-empty-bg) 8px)",
          }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-outline">
        <span>{usedPct.toFixed(0)}% Used</span>
        <span>{formatBytes(totalLimit)} Total</span>
      </div>
    </div>
  );
}
