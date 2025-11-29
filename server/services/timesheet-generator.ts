/**
 * Timesheet Generation Service
 *
 * Automatically generates timesheets from clock records,
 * calculates hours by rate type, and tracks budget usage
 */

import { db } from '../db.js';
import {
  timesheets,
  timesheetEntries,
  timeClockRecords,
  appointments,
  clients,
  budgets,
  staff,
  publicHolidays,
  type TimesheetStatus,
  type ServiceType,
} from '../../shared/schema.js';
import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import { calculateHoursFromRecords } from './time-clock.js';

export interface TimesheetGenerationOptions {
  staffId: string;
  periodStart: Date;
  periodEnd: Date;
  autoApprove?: boolean;
}

export interface TimesheetEntryData {
  appointmentId?: string;
  clientId: string;
  serviceType: ServiceType;
  date: Date;
  clockInTime: Date;
  clockOutTime: Date;
  totalHours: number;
  weekdayHours: number;
  saturdayHours: number;
  sundayHours: number;
  publicHolidayHours: number;
  eveningHours: number;
  nightHours: number;
  notes?: string;
}

export interface TimesheetSummary {
  timesheetId: string;
  staffId: string;
  staffName: string;
  periodStart: Date;
  periodEnd: Date;
  status: TimesheetStatus;
  totalHours: number;
  weekdayHours: number;
  saturdayHours: number;
  sundayHours: number;
  publicHolidayHours: number;
  eveningHours: number;
  nightHours: number;
  entries: TimesheetEntryData[];
}

/**
 * Check if a date is a public holiday
 */
async function isPublicHoliday(date: Date): Promise<boolean> {
  const dateStr = date.toISOString().split('T')[0];
  const holiday = await db
    .select()
    .from(publicHolidays)
    .where(eq(publicHolidays.date, dateStr))
    .limit(1);

  return holiday.length > 0;
}

/**
 * Determine the rate type based on date and time
 */
async function determineRateType(
  dateTime: Date
): Promise<'weekday' | 'saturday' | 'sunday' | 'public_holiday' | 'evening' | 'night'> {
  const dayOfWeek = dateTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = dateTime.getHours();

  // Check public holiday first
  const isHoliday = await isPublicHoliday(dateTime);
  if (isHoliday) {
    return 'public_holiday';
  }

  // Check time of day (evening: 6pm-12am, night: 12am-6am)
  if (hour >= 18 && hour < 24) {
    return 'evening';
  }
  if (hour >= 0 && hour < 6) {
    return 'night';
  }

  // Check day of week
  if (dayOfWeek === 0) {
    return 'sunday';
  }
  if (dayOfWeek === 6) {
    return 'saturday';
  }

  return 'weekday';
}

/**
 * Calculate hours breakdown by rate type for a time period
 */
async function calculateHoursByRateType(
  startTime: Date,
  endTime: Date
): Promise<{
  totalHours: number;
  weekdayHours: number;
  saturdayHours: number;
  sundayHours: number;
  publicHolidayHours: number;
  eveningHours: number;
  nightHours: number;
}> {
  const breakdown = {
    totalHours: 0,
    weekdayHours: 0,
    saturdayHours: 0,
    sundayHours: 0,
    publicHolidayHours: 0,
    eveningHours: 0,
    nightHours: 0,
  };

  // Calculate in 1-hour increments
  let currentTime = new Date(startTime);
  const endTimeMs = endTime.getTime();

  while (currentTime.getTime() < endTimeMs) {
    const nextTime = new Date(
      Math.min(currentTime.getTime() + 60 * 60 * 1000, endTimeMs)
    );
    const hoursIncrement =
      (nextTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

    const rateType = await determineRateType(currentTime);

    breakdown.totalHours += hoursIncrement;

    switch (rateType) {
      case 'weekday':
        breakdown.weekdayHours += hoursIncrement;
        break;
      case 'saturday':
        breakdown.saturdayHours += hoursIncrement;
        break;
      case 'sunday':
        breakdown.sundayHours += hoursIncrement;
        break;
      case 'public_holiday':
        breakdown.publicHolidayHours += hoursIncrement;
        break;
      case 'evening':
        breakdown.eveningHours += hoursIncrement;
        break;
      case 'night':
        breakdown.nightHours += hoursIncrement;
        break;
    }

    currentTime = nextTime;
  }

  return breakdown;
}

/**
 * Generate a timesheet from clock records
 */
export async function generateTimesheet(
  options: TimesheetGenerationOptions
): Promise<TimesheetSummary> {
  const { staffId, periodStart, periodEnd, autoApprove = false } = options;

  // 1. Get all clock records for the period
  const clockRecords = await db
    .select()
    .from(timeClockRecords)
    .where(
      and(
        eq(timeClockRecords.staffId, staffId),
        gte(timeClockRecords.timestamp, periodStart),
        lte(timeClockRecords.timestamp, periodEnd)
      )
    )
    .orderBy(timeClockRecords.timestamp);

  // 2. Group clock records into pairs (clock-in/clock-out)
  const entries: TimesheetEntryData[] = [];
  const processedPairs = new Set<string>();

  for (const record of clockRecords) {
    if (
      record.eventType === 'clock_in' &&
      record.pairId &&
      !processedPairs.has(record.id)
    ) {
      // Find matching clock-out
      const clockOut = clockRecords.find((r) => r.id === record.pairId);

      if (clockOut) {
        processedPairs.add(record.id);
        processedPairs.add(clockOut.id);

        // Get appointment details
        let clientId = '';
        let serviceType: ServiceType = 'NDIS';

        if (record.appointmentId) {
          const appointment = await db
            .select({
              appointment: appointments,
              client: clients,
            })
            .from(appointments)
            .leftJoin(clients, eq(appointments.clientId, clients.id))
            .where(eq(appointments.id, record.appointmentId))
            .limit(1);

          if (appointment.length > 0) {
            clientId = appointment[0].appointment.clientId;
            serviceType = appointment[0].appointment.serviceType;
          }
        }

        // Calculate hours breakdown
        const breakdown = await calculateHoursByRateType(
          new Date(record.timestamp),
          new Date(clockOut.timestamp)
        );

        entries.push({
          appointmentId: record.appointmentId || undefined,
          clientId,
          serviceType,
          date: new Date(record.timestamp),
          clockInTime: new Date(record.timestamp),
          clockOutTime: new Date(clockOut.timestamp),
          totalHours: breakdown.totalHours,
          weekdayHours: breakdown.weekdayHours,
          saturdayHours: breakdown.saturdayHours,
          sundayHours: breakdown.sundayHours,
          publicHolidayHours: breakdown.publicHolidayHours,
          eveningHours: breakdown.eveningHours,
          nightHours: breakdown.nightHours,
          notes: record.notes || undefined,
        });
      }
    }
  }

  // 3. Calculate totals
  const totals = entries.reduce(
    (acc, entry) => ({
      totalHours: acc.totalHours + entry.totalHours,
      weekdayHours: acc.weekdayHours + entry.weekdayHours,
      saturdayHours: acc.saturdayHours + entry.saturdayHours,
      sundayHours: acc.sundayHours + entry.sundayHours,
      publicHolidayHours: acc.publicHolidayHours + entry.publicHolidayHours,
      eveningHours: acc.eveningHours + entry.eveningHours,
      nightHours: acc.nightHours + entry.nightHours,
    }),
    {
      totalHours: 0,
      weekdayHours: 0,
      saturdayHours: 0,
      sundayHours: 0,
      publicHolidayHours: 0,
      eveningHours: 0,
      nightHours: 0,
    }
  );

  // 4. Create timesheet record
  const timesheet = await db
    .insert(timesheets)
    .values({
      staffId,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      status: autoApprove ? 'approved' : 'pending_approval',
      totalHours: totals.totalHours.toFixed(2),
      weekdayHours: totals.weekdayHours.toFixed(2),
      saturdayHours: totals.saturdayHours.toFixed(2),
      sundayHours: totals.sundayHours.toFixed(2),
      publicHolidayHours: totals.publicHolidayHours.toFixed(2),
      eveningHours: totals.eveningHours.toFixed(2),
      nightHours: totals.nightHours.toFixed(2),
      approvedAt: autoApprove ? new Date() : null,
    })
    .returning();

  // 5. Create timesheet entries
  for (const entry of entries) {
    await db.insert(timesheetEntries).values({
      timesheetId: timesheet[0].id,
      appointmentId: entry.appointmentId,
      clientId: entry.clientId,
      serviceType: entry.serviceType,
      date: entry.date.toISOString().split('T')[0],
      clockInTime: entry.clockInTime,
      clockOutTime: entry.clockOutTime,
      totalHours: entry.totalHours.toFixed(2),
      weekdayHours: entry.weekdayHours.toFixed(2),
      saturdayHours: entry.saturdayHours.toFixed(2),
      sundayHours: entry.sundayHours.toFixed(2),
      publicHolidayHours: entry.publicHolidayHours.toFixed(2),
      eveningHours: entry.eveningHours.toFixed(2),
      nightHours: entry.nightHours.toFixed(2),
      notes: entry.notes,
    });
  }

  // 6. Get staff name
  const staffMember = await db
    .select()
    .from(staff)
    .where(eq(staff.id, staffId))
    .limit(1);

  return {
    timesheetId: timesheet[0].id,
    staffId,
    staffName: staffMember.length > 0 ? staffMember[0].name : 'Unknown',
    periodStart,
    periodEnd,
    status: timesheet[0].status,
    totalHours: totals.totalHours,
    weekdayHours: totals.weekdayHours,
    saturdayHours: totals.saturdayHours,
    sundayHours: totals.sundayHours,
    publicHolidayHours: totals.publicHolidayHours,
    eveningHours: totals.eveningHours,
    nightHours: totals.nightHours,
    entries,
  };
}

/**
 * Approve a timesheet
 */
export async function approveTimesheet(
  timesheetId: string,
  approvedById: string
) {
  const timesheet = await db
    .update(timesheets)
    .set({
      status: 'approved',
      approvedById,
      approvedAt: new Date(),
    })
    .where(eq(timesheets.id, timesheetId))
    .returning();

  return timesheet[0];
}

/**
 * Reject a timesheet
 */
export async function rejectTimesheet(
  timesheetId: string,
  rejectedById: string,
  rejectionReason: string
) {
  const timesheet = await db
    .update(timesheets)
    .set({
      status: 'rejected',
      rejectedById,
      rejectedAt: new Date(),
      rejectionReason,
    })
    .where(eq(timesheets.id, timesheetId))
    .returning();

  return timesheet[0];
}

/**
 * Get timesheets for a staff member
 */
export async function getTimesheets(
  staffId: string,
  status?: TimesheetStatus
) {
  const query = status
    ? and(eq(timesheets.staffId, staffId), eq(timesheets.status, status))
    : eq(timesheets.staffId, staffId);

  const results = await db
    .select()
    .from(timesheets)
    .where(query)
    .orderBy(timesheets.periodStart);

  return results;
}

/**
 * Get timesheet entries for a timesheet
 */
export async function getTimesheetEntries(timesheetId: string) {
  const entries = await db
    .select()
    .from(timesheetEntries)
    .where(eq(timesheetEntries.timesheetId, timesheetId))
    .orderBy(timesheetEntries.date);

  return entries;
}

/**
 * Update budget usage from approved timesheet
 */
export async function updateBudgetFromTimesheet(timesheetId: string) {
  // Get timesheet entries
  const entries = await getTimesheetEntries(timesheetId);

  // Group by client and service type
  const clientUsage = new Map<
    string,
    { clientId: string; serviceType: ServiceType; totalHours: number }
  >();

  for (const entry of entries) {
    const key = `${entry.clientId}-${entry.serviceType}`;
    const existing = clientUsage.get(key) || {
      clientId: entry.clientId,
      serviceType: entry.serviceType,
      totalHours: 0,
    };
    existing.totalHours += parseFloat(entry.totalHours);
    clientUsage.set(key, existing);
  }

  // Update budgets
  for (const usage of clientUsage.values()) {
    // Find relevant budget
    const budget = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.clientId, usage.clientId),
          eq(budgets.serviceType, usage.serviceType)
        )
      )
      .limit(1);

    if (budget.length > 0) {
      const currentUsed = parseFloat(budget[0].used);
      const newUsed = currentUsed + usage.totalHours;
      const totalAllocated = parseFloat(budget[0].totalAllocated);
      const newRemaining = totalAllocated - newUsed;

      await db
        .update(budgets)
        .set({
          used: newUsed.toFixed(2),
          remaining: newRemaining.toFixed(2),
        })
        .where(eq(budgets.id, budget[0].id));
    }
  }
}

/**
 * Generate weekly timesheets for all staff
 */
export async function generateWeeklyTimesheets(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Get all active staff
  const allStaff = await db
    .select()
    .from(staff)
    .where(eq(staff.isActive, 'yes'));

  const results = [];

  for (const staffMember of allStaff) {
    try {
      const timesheet = await generateTimesheet({
        staffId: staffMember.id,
        periodStart: weekStart,
        periodEnd: weekEnd,
        autoApprove: false,
      });
      results.push(timesheet);
    } catch (error) {
      console.error(`Failed to generate timesheet for ${staffMember.name}:`, error);
    }
  }

  return results;
}
