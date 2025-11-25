import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ComplianceIndicator, { getComplianceStatus } from "./ComplianceIndicator";
import { Upload, Eye } from "lucide-react";
import type { ClinicalDocuments } from "@shared/schema";

interface Document {
  name: string;
  date?: string;
  frequency: "annual" | "6-monthly" | "as-needed";
  key: keyof ClinicalDocuments;
}

const documentList: Document[] = [
  { name: "Service Agreement", key: "serviceAgreementDate", frequency: "annual" },
  { name: "Consent Form", key: "consentFormDate", frequency: "annual" },
  { name: "Risk Assessment", key: "riskAssessmentDate", frequency: "annual" },
  { name: "Self Assessment (Medx Tool)", key: "selfAssessmentMedxDate", frequency: "annual" },
  { name: "Medication Consent", key: "medicationConsentDate", frequency: "annual" },
  { name: "Personal Emergency Plan", key: "personalEmergencyPlanDate", frequency: "annual" },
  { name: "Care Plan", key: "carePlanDate", frequency: "6-monthly" },
  { name: "Health Summary", key: "healthSummaryDate", frequency: "6-monthly" },
  { name: "Wound Care Plan", key: "woundCarePlanDate", frequency: "as-needed" },
];

interface DocumentTrackerProps {
  documents: ClinicalDocuments;
}

export default function DocumentTracker({ documents }: DocumentTrackerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documentList.map((doc) => {
        const date = documents[doc.key];
        const status = getComplianceStatus(date);
        
        return (
          <Card 
            key={doc.key} 
            className={`${
              status === "overdue" ? "border-red-300 dark:border-red-800" :
              status === "due-soon" ? "border-amber-300 dark:border-amber-800" :
              status === "compliant" ? "border-emerald-300 dark:border-emerald-800" :
              ""
            }`}
            data-testid={`card-document-${doc.key}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-medium">{doc.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {doc.frequency}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <ComplianceIndicator status={status} />
              </div>
              {date && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                  <p className="text-sm font-mono">{new Date(date).toLocaleDateString()}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" data-testid={`button-upload-${doc.key}`}>
                  <Upload className="w-3 h-3 mr-1" />
                  Upload
                </Button>
                {date && (
                  <Button size="sm" variant="ghost" data-testid={`button-view-${doc.key}`}>
                    <Eye className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
