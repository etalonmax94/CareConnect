import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ComplianceStatus = "compliant" | "due-soon" | "overdue" | "none";

interface ComplianceIndicatorProps {
  status: ComplianceStatus;
  date?: string;
  label?: string;
}

export function getComplianceStatus(dateString?: string): ComplianceStatus {
  if (!dateString) return "none";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "overdue";
  if (diffDays <= 30) return "due-soon";
  return "compliant";
}

export default function ComplianceIndicator({ status, date, label }: ComplianceIndicatorProps) {
  if (status === "none") {
    return (
      <Badge variant="secondary" className="text-muted-foreground">
        <Clock className="w-3 h-3 mr-1" />
        Not Set
      </Badge>
    );
  }

  const statusConfig = {
    compliant: {
      icon: CheckCircle,
      className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
      text: label || "Compliant"
    },
    "due-soon": {
      icon: Clock,
      className: "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
      text: label || "Due Soon"
    },
    overdue: {
      icon: AlertCircle,
      className: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400",
      text: label || "Overdue"
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={config.className} data-testid={`status-compliance-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </Badge>
  );
}
