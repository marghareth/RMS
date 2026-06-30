type Status =
  | "FILED" | "ONGOING" | "RESOLVED" | "DISMISSED" | "ESCALATED"
  | "SERVICEABLE" | "UNSERVICEABLE" | "MISSING"
  | "ACTIVE" | "INACTIVE" | "ARCHIVED"
  | "INCOME" | "EXPENSE"
  | string;

const statusMap: Record<string, { label: string; classes: string }> = {
  FILED:         { label: "Filed",         classes: "bg-blue-50 text-blue-600" },
  ONGOING:       { label: "Ongoing",       classes: "bg-amber-50 text-amber-600" },
  RESOLVED:      { label: "Resolved",      classes: "bg-green-50 text-green-600" },
  DISMISSED:     { label: "Dismissed",     classes: "bg-gray-100 text-gray-500" },
  ESCALATED:     { label: "Escalated",     classes: "bg-red-50 text-red-600" },
  SERVICEABLE:   { label: "Serviceable",   classes: "bg-green-50 text-green-600" },
  UNSERVICEABLE: { label: "Unserviceable", classes: "bg-amber-50 text-amber-600" },
  MISSING:       { label: "Missing",       classes: "bg-red-50 text-red-600" },
  ACTIVE:        { label: "Active",        classes: "bg-green-50 text-green-600" },
  INACTIVE:      { label: "Inactive",      classes: "bg-gray-100 text-gray-500" },
  ARCHIVED:      { label: "Archived",      classes: "bg-gray-100 text-gray-400" },
  INCOME:        { label: "Income",        classes: "bg-green-50 text-green-600" },
  EXPENSE:       { label: "Expense",       classes: "bg-red-50 text-red-600" },
};

export default function StatusBadge({ status }: { status: Status }) {
  const s = statusMap[status] ?? { label: status, classes: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.classes}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
}