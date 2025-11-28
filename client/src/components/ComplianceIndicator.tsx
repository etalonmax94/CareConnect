import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
// Re-export compliance functions from shared module for backwards compatibility
export { 
  getComplianceStatus, 
  calculateClientCompliance, 
  getOverallComplianceStatus,
  isClientCompliant,
  getDocumentStatus,
  REQUIRED_DOCUMENTS,
  ALL_DOCUMENTS,
  type ComplianceStatus,
  type ClientComplianceResult,
  type DocumentStatus,
  type ClinicalDocuments,
} from "@shared/compliance";

import type { ComplianceStatus } from "@shared/compliance";

interface ComplianceIndicatorProps {
  status: ComplianceStatus;
  date?: string;
  label?: string;
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
