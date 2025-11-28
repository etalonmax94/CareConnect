// Shared Compliance Calculation Utility
// Used consistently across Dashboard, Client List, Client Profile, and Server

export type ComplianceStatus = "compliant" | "due-soon" | "overdue" | "none";

export interface DocumentStatus {
  key: string;
  label: string;
  date: string | null;
  status: ComplianceStatus;
  dueDate: string | null;
  renewalPeriod: "6-monthly" | "annual";
}

export interface ClientComplianceResult {
  overallStatus: ComplianceStatus;
  percentage: number;
  compliantCount: number;
  totalRequired: number;
  documents: DocumentStatus[];
  missingDocuments: string[];
  overdueDocuments: string[];
  dueSoonDocuments: string[];
}

// Required documents for compliance calculation
export const REQUIRED_DOCUMENTS = [
  { key: "serviceAgreementDate", label: "Service Agreement", renewalPeriod: "annual" as const },
  { key: "consentFormDate", label: "Consent Form", renewalPeriod: "annual" as const },
  { key: "riskAssessmentDate", label: "Risk Assessment", renewalPeriod: "annual" as const },
  { key: "carePlanDate", label: "Care Plan", renewalPeriod: "6-monthly" as const },
];

// All trackable documents (required + optional)
export const ALL_DOCUMENTS = [
  { key: "serviceAgreementDate", label: "Service Agreement", renewalPeriod: "annual" as const },
  { key: "consentFormDate", label: "Consent Form", renewalPeriod: "annual" as const },
  { key: "riskAssessmentDate", label: "Risk Assessment", renewalPeriod: "annual" as const },
  { key: "carePlanDate", label: "Care Plan", renewalPeriod: "6-monthly" as const },
  { key: "healthSummaryDate", label: "Health Summary", renewalPeriod: "6-monthly" as const },
  { key: "selfAssessmentMedxDate", label: "Self Assessment Medx", renewalPeriod: "annual" as const },
  { key: "medicationConsentDate", label: "Medication Consent", renewalPeriod: "annual" as const },
  { key: "personalEmergencyPlanDate", label: "Personal Emergency Plan", renewalPeriod: "annual" as const },
  { key: "woundCarePlanDate", label: "Wound Care Plan", renewalPeriod: "6-monthly" as const },
];

export type ClinicalDocuments = {
  serviceAgreementDate?: string;
  consentFormDate?: string;
  riskAssessmentDate?: string;
  selfAssessmentMedxDate?: string;
  medicationConsentDate?: string;
  personalEmergencyPlanDate?: string;
  carePlanDate?: string;
  healthSummaryDate?: string;
  woundCarePlanDate?: string;
};

/**
 * Calculate the due date for a document based on its last completion date and renewal period
 */
export function calculateDueDate(dateString: string, renewalPeriod: "6-monthly" | "annual"): Date {
  const date = new Date(dateString);
  if (renewalPeriod === "6-monthly") {
    date.setMonth(date.getMonth() + 6);
  } else {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date;
}

/**
 * Get the compliance status for a single document
 */
export function getDocumentStatus(
  dateString: string | undefined | null,
  renewalPeriod: "6-monthly" | "annual"
): { status: ComplianceStatus; dueDate: string | null } {
  if (!dateString) {
    return { status: "none", dueDate: null };
  }

  const dueDate = calculateDueDate(dateString, renewalPeriod);
  const now = new Date();
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: "overdue", dueDate: dueDate.toISOString() };
  }
  if (diffDays <= 30) {
    return { status: "due-soon", dueDate: dueDate.toISOString() };
  }
  return { status: "compliant", dueDate: dueDate.toISOString() };
}

/**
 * Simple status check for a single date (backwards compatible)
 */
export function getComplianceStatus(dateString?: string): ComplianceStatus {
  if (!dateString) return "none";

  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays <= 30) return "due-soon";
  return "compliant";
}

/**
 * Calculate comprehensive compliance for a client
 * This is the main function that should be used everywhere for consistency
 */
export function calculateClientCompliance(
  clinicalDocuments: ClinicalDocuments | undefined | null
): ClientComplianceResult {
  const docs = clinicalDocuments || {};
  const documentStatuses: DocumentStatus[] = [];
  const missingDocuments: string[] = [];
  const overdueDocuments: string[] = [];
  const dueSoonDocuments: string[] = [];
  let compliantCount = 0;

  for (const docDef of REQUIRED_DOCUMENTS) {
    const dateValue = docs[docDef.key as keyof ClinicalDocuments];
    const { status, dueDate } = getDocumentStatus(dateValue, docDef.renewalPeriod);

    documentStatuses.push({
      key: docDef.key,
      label: docDef.label,
      date: dateValue || null,
      status,
      dueDate,
      renewalPeriod: docDef.renewalPeriod,
    });

    if (status === "none") {
      missingDocuments.push(docDef.label);
    } else if (status === "overdue") {
      overdueDocuments.push(docDef.label);
    } else if (status === "due-soon") {
      dueSoonDocuments.push(docDef.label);
      compliantCount++; // Due soon still counts as having the document
    } else if (status === "compliant") {
      compliantCount++;
    }
  }

  const totalRequired = REQUIRED_DOCUMENTS.length;
  const percentage = totalRequired > 0 ? Math.round((compliantCount / totalRequired) * 100) : 0;

  // Determine overall status
  let overallStatus: ComplianceStatus;
  if (overdueDocuments.length > 0) {
    overallStatus = "overdue";
  } else if (missingDocuments.length > 0) {
    overallStatus = "none"; // Missing docs = incomplete
  } else if (dueSoonDocuments.length > 0) {
    overallStatus = "due-soon";
  } else if (compliantCount === totalRequired) {
    overallStatus = "compliant";
  } else {
    overallStatus = "none";
  }

  return {
    overallStatus,
    percentage,
    compliantCount,
    totalRequired,
    documents: documentStatuses,
    missingDocuments,
    overdueDocuments,
    dueSoonDocuments,
  };
}

/**
 * Determine if a client meets minimum compliance threshold (75%)
 * Used for dashboard stats
 */
export function isClientCompliant(clinicalDocuments: ClinicalDocuments | undefined | null): boolean {
  const result = calculateClientCompliance(clinicalDocuments);
  return result.percentage >= 75 && result.overdueDocuments.length === 0;
}

/**
 * Get simple compliance status for display (backwards compatible)
 * Uses overall compliance, not just a single document
 */
export function getOverallComplianceStatus(
  clinicalDocuments: ClinicalDocuments | undefined | null
): ComplianceStatus {
  const result = calculateClientCompliance(clinicalDocuments);
  return result.overallStatus;
}
