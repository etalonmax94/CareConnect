/**
 * Budget Calculation Utilities
 * Handles conversions between different budget periods and totals
 */

export interface BudgetBreakdown {
  weeklyAmount: string;
  monthlyAmount: string;
  quarterlyAmount: string;
  annualAmount: string;
}

/**
 * Calculate all budget period amounts from a weekly total
 * @param weeklyTotal - Weekly amount as string
 * @returns All period breakdowns
 */
export function calculateBudgetPeriodsFromWeekly(weeklyTotal: string): BudgetBreakdown {
  const weekly = parseFloat(weeklyTotal) || 0;
  const monthly = weekly * 52 / 12; // Average 52 weeks / 12 months
  const quarterly = weekly * 13; // 13 weeks per quarter
  const annual = weekly * 52;

  return {
    weeklyAmount: weekly.toFixed(2),
    monthlyAmount: monthly.toFixed(2),
    quarterlyAmount: quarterly.toFixed(2),
    annualAmount: annual.toFixed(2),
  };
}

/**
 * Calculate all budget period amounts from an annual total
 * @param annualTotal - Annual amount as string
 * @returns All period breakdowns
 */
export function calculateBudgetPeriodsFromAnnual(annualTotal: string): BudgetBreakdown {
  const annual = parseFloat(annualTotal) || 0;
  const weekly = annual / 52;
  const monthly = annual / 12;
  const quarterly = annual / 4;

  return {
    weeklyAmount: weekly.toFixed(2),
    monthlyAmount: monthly.toFixed(2),
    quarterlyAmount: quarterly.toFixed(2),
    annualAmount: annual.toFixed(2),
  };
}

/**
 * Calculate remaining budget
 * @param allocated - Total allocated amount
 * @param used - Amount already used
 * @returns Remaining amount
 */
export function calculateRemainingBudget(allocated: string, used: string): string {
  const allocatedNum = parseFloat(allocated) || 0;
  const usedNum = parseFloat(used) || 0;
  const remaining = Math.max(0, allocatedNum - usedNum);
  return remaining.toFixed(2);
}

/**
 * Calculate budget utilization percentage
 * @param allocated - Total allocated amount
 * @param used - Amount already used
 * @returns Utilization percentage (0-100)
 */
export function calculateBudgetUtilization(allocated: string, used: string): number {
  const allocatedNum = parseFloat(allocated) || 0;
  const usedNum = parseFloat(used) || 0;

  if (allocatedNum === 0) return 0;

  const percentage = (usedNum / allocatedNum) * 100;
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Calculate weekly total from individual rate hours
 */
export interface WeeklyHours {
  weekdayHours: string;
  weekdayRate: string;
  saturdayHours: string;
  saturdayRate: string;
  sundayHours: string;
  sundayRate: string;
  publicHolidayHours: string;
  publicHolidayRate: string;
  eveningHours: string;
  eveningRate: string;
  nightHours: string;
  nightRate: string;
}

export function calculateWeeklyTotal(hours: WeeklyHours): string {
  const weekdayTotal = (parseFloat(hours.weekdayHours) || 0) * (parseFloat(hours.weekdayRate) || 0);
  const saturdayTotal = (parseFloat(hours.saturdayHours) || 0) * (parseFloat(hours.saturdayRate) || 0);
  const sundayTotal = (parseFloat(hours.sundayHours) || 0) * (parseFloat(hours.sundayRate) || 0);
  const publicHolidayTotal = (parseFloat(hours.publicHolidayHours) || 0) * (parseFloat(hours.publicHolidayRate) || 0);
  const eveningTotal = (parseFloat(hours.eveningHours) || 0) * (parseFloat(hours.eveningRate) || 0);
  const nightTotal = (parseFloat(hours.nightHours) || 0) * (parseFloat(hours.nightRate) || 0);

  const total = weekdayTotal + saturdayTotal + sundayTotal + publicHolidayTotal + eveningTotal + nightTotal;
  return total.toFixed(2);
}

/**
 * Calculate annual total with QLD holiday adjustments
 */
export interface AnnualCalculation extends WeeklyHours {
  weeksPerYear: string;
  includesQldHolidays: 'yes' | 'no';
  qldHolidayDays: string;
}

export function calculateAnnualTotal(calc: AnnualCalculation): string {
  const weeklyTotal = parseFloat(calculateWeeklyTotal(calc));
  const weeksPerYear = parseFloat(calc.weeksPerYear) || 52;

  let baseAnnual = weeklyTotal * weeksPerYear;

  // Add QLD holiday uplift if enabled
  if (calc.includesQldHolidays === 'yes') {
    const holidayDays = parseFloat(calc.qldHolidayDays) || 12;
    const weekdayHours = parseFloat(calc.weekdayHours) || 0;
    const weekdayRate = parseFloat(calc.weekdayRate) || 0;
    const publicHolidayRate = parseFloat(calc.publicHolidayRate) || 0;

    // Calculate average weekday hours per day (assuming 5 working days)
    const avgWeekdayHoursPerDay = weekdayHours / 5;

    // Holiday uplift = days × hours/day × (PH rate - weekday rate)
    const holidayUplift = holidayDays * avgWeekdayHoursPerDay * (publicHolidayRate - weekdayRate);
    baseAnnual += holidayUplift;
  }

  return baseAnnual.toFixed(2);
}
