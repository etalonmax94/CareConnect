import type { FallsRiskAssessment } from "./schema";

export const FRAT_SCORING = {
  recentFalls: { 
    none12Months: 2, 
    between3And12Months: 4, 
    within3Months: 6, 
    within3MonthsInpatient: 8 
  },
  medications: { 
    none: 1, 
    one: 2, 
    two: 3, 
    moreThanTwo: 4 
  },
  psychological: { 
    none: 1, 
    mild: 2, 
    moderate: 3, 
    severe: 4 
  },
  cognitiveStatus: { 
    intact: 1, 
    mildImpaired: 2, 
    modImpaired: 3, 
    severeImpaired: 4 
  }
};

export const FRAT_LABELS = {
  recentFalls: {
    2: "No falls in past 12 months",
    4: "One or more falls between 3-12 months ago",
    6: "One or more falls within past 3 months",
    8: "One or more falls within past 3 months (inpatient/hospital)"
  },
  medications: {
    1: "Not taking any sedatives, antipsychotics, or blood pressure medications",
    2: "Taking one of these medication types",
    3: "Taking two of these medication types",
    4: "Taking more than two of these medication types"
  },
  psychological: {
    1: "Does not appear to have any depression, anxiety, or behavioral issues",
    2: "Appears to have mild symptoms",
    3: "Appears to have moderate symptoms",
    4: "Appears to have severe symptoms"
  },
  cognitiveStatus: {
    1: "Intact cognition",
    2: "Mildly impaired",
    3: "Moderately impaired",
    4: "Severely impaired"
  }
};

export function calculateFRATScore(assessment: Partial<FallsRiskAssessment>): { 
  totalScore: number; 
  riskCategory: "Low" | "Medium" | "High" 
} {
  const recentFalls = assessment.recentFalls ?? 2;
  const medications = assessment.medications ?? 1;
  const psychological = assessment.psychological ?? 1;
  const cognitiveStatus = assessment.cognitiveStatus ?? 1;
  
  const totalScore = recentFalls + medications + psychological + cognitiveStatus;
  
  const autoHighRisk = assessment.autoHighRiskDizziness || assessment.autoHighRiskFunctionalChange;
  
  let riskCategory: "Low" | "Medium" | "High";
  
  if (autoHighRisk) {
    riskCategory = "High";
  } else if (totalScore >= 5 && totalScore <= 11) {
    riskCategory = "Low";
  } else if (totalScore >= 12 && totalScore <= 15) {
    riskCategory = "Medium";
  } else {
    riskCategory = "High";
  }
  
  return { totalScore, riskCategory };
}

export function getRiskCategoryColor(category: "Low" | "Medium" | "High"): string {
  switch (category) {
    case "Low":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "High":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

export function createDefaultFallsRiskAssessment(): FallsRiskAssessment {
  return {
    recentFalls: 2,
    medications: 1,
    psychological: 1,
    cognitiveStatus: 1,
    autoHighRiskDizziness: false,
    autoHighRiskFunctionalChange: false,
    totalScore: 5,
    riskCategory: "Low"
  };
}
