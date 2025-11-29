/**
 * Time Clock Service
 *
 * Handles clock in/out events with GPS validation,
 * overlap detection, and automatic timesheet generation
 */

import { db } from '../db.js';
import {
  timeClockRecords,
  appointments,
  clients,
  staff,
  type ClockEventType,
  type ClockEventStatus,
} from '../../shared/schema.js';
import { eq, and, gte, lte, isNull, or } from 'drizzle-orm';
import {
  validateGpsForClockEvent,
  logGpsCompliance,
  type GpsCoordinates,
  parseCoordinates,
} from './gps-validator.js';

export interface ClockInRequest {
  staffId: string;
  appointmentId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  deviceType?: string;
  notes?: string;
}

export interface ClockOutRequest {
  staffId: string;
  appointmentId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  deviceType?: string;
  notes?: string;
}

export interface ClockEventResult {
  success: boolean;
  recordId?: string;
  errors: string[];
  warnings: string[];
  gpsCompliant?: boolean;
  distance?: number;
  overlappingEvents?: OverlappingEvent[];
}

export interface OverlappingEvent {
  recordId: string;
  appointmentId?: string;
  clockInTime: Date;
  expectedClockOutTime?: Date;
}

/**
 * Check for overlapping clock events (staff already clocked in elsewhere)
 */
export async function checkOverlappingEvents(
  staffId: string,
  excludeRecordId?: string
): Promise<OverlappingEvent[]> {
  // Find all clock-in events without corresponding clock-out for this staff member
  const openClockIns = await db
    .select()
    .from(timeClockRecords)
    .where(
      and(
        eq(timeClockRecords.staffId, staffId),
        eq(timeClockRecords.eventType, 'clock_in'),
        or(
          eq(timeClockRecords.eventStatus, 'valid'),
          eq(timeClockRecords.eventStatus, 'gps_warning')
        )
      )
    );

  const overlapping: OverlappingEvent[] = [];

  for (const clockIn of openClockIns) {
    if (excludeRecordId && clockIn.id === excludeRecordId) continue;

    // Check if there's a corresponding clock-out
    const clockOut = await db
      .select()
      .from(timeClockRecords)
      .where(
        and(
          eq(timeClockRecords.staffId, staffId),
          eq(timeClockRecords.eventType, 'clock_out'),
          clockIn.appointmentId
            ? eq(timeClockRecords.appointmentId, clockIn.appointmentId)
            : isNull(timeClockRecords.appointmentId),
          gte(timeClockRecords.timestamp, clockIn.timestamp)
        )
      )
      .limit(1);

    // If no clock-out found, this is an overlapping event
    if (clockOut.length === 0) {
      overlapping.push({
        recordId: clockIn.id,
        appointmentId: clockIn.appointmentId || undefined,
        clockInTime: new Date(clockIn.timestamp),
        expectedClockOutTime: clockIn.expectedClockOutTime
          ? new Date(clockIn.expectedClockOutTime)
          : undefined,
      });
    }
  }

  return overlapping;
}

/**
 * Get expected GPS coordinates for an appointment
 */
async function getExpectedCoordinates(
  appointmentId?: string
): Promise<GpsCoordinates | null> {
  if (!appointmentId) return null;

  const appointment = await db
    .select({
      appointment: appointments,
      client: clients,
    })
    .from(appointments)
    .leftJoin(clients, eq(appointments.clientId, clients.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (appointment.length === 0 || !appointment[0].client) return null;

  const client = appointment[0].client;

  // Try to get coordinates from client's address or stored GPS location
  if (client.gpsLatitude && client.gpsLongitude) {
    return {
      latitude: parseFloat(client.gpsLatitude),
      longitude: parseFloat(client.gpsLongitude),
    };
  }

  // Could also parse from address using a geocoding service
  return null;
}

/**
 * Clock in a staff member
 */
export async function clockIn(
  request: ClockInRequest
): Promise<ClockEventResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Check for overlapping events
    const overlapping = await checkOverlappingEvents(request.staffId);
    if (overlapping.length > 0) {
      errors.push(
        `Staff member is already clocked in to ${overlapping.length} other appointment(s). Please clock out first.`
      );
      return {
        success: false,
        errors,
        warnings,
        overlappingEvents: overlapping,
      };
    }

    // 2. Validate staff exists
    const staffMember = await db
      .select()
      .from(staff)
      .where(eq(staff.id, request.staffId))
      .limit(1);

    if (staffMember.length === 0) {
      errors.push('Staff member not found');
      return { success: false, errors, warnings };
    }

    // 3. Get expected GPS coordinates
    const expectedCoords = await getExpectedCoordinates(request.appointmentId);
    let gpsValidation;
    let gpsCompliant = true;
    let eventStatus: ClockEventStatus = 'valid';

    if (expectedCoords) {
      const actualCoords: GpsCoordinates = {
        latitude: request.latitude,
        longitude: request.longitude,
        accuracy: request.accuracy,
      };

      // Validate GPS with configurable radius (default 100m)
      gpsValidation = await validateGpsForClockEvent(
        actualCoords,
        expectedCoords,
        100 // radius in meters
      );

      if (!gpsValidation.isValid) {
        gpsCompliant = false;
        eventStatus = 'gps_violation';
        errors.push(...gpsValidation.errors);
      } else if (gpsValidation.warnings.length > 0) {
        eventStatus = 'gps_warning';
        warnings.push(...gpsValidation.warnings);
      }
    }

    // 4. Get appointment details for expected clock-out time
    let expectedClockOutTime: Date | null = null;
    if (request.appointmentId) {
      const appointment = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, request.appointmentId))
        .limit(1);

      if (appointment.length > 0) {
        expectedClockOutTime = new Date(appointment[0].endTime);
      }
    }

    // 5. Create clock-in record
    const clockRecord = await db
      .insert(timeClockRecords)
      .values({
        staffId: request.staffId,
        appointmentId: request.appointmentId,
        eventType: 'clock_in',
        eventStatus,
        timestamp: new Date(),
        latitude: request.latitude.toString(),
        longitude: request.longitude.toString(),
        accuracy: request.accuracy?.toString(),
        expectedLatitude: expectedCoords?.latitude.toString(),
        expectedLongitude: expectedCoords?.longitude.toString(),
        distanceFromExpected: gpsValidation?.distance?.distanceMeters.toString(),
        isWithinRadius: gpsValidation?.isValid ? 'yes' : 'no',
        radiusThreshold: '100',
        deviceType: request.deviceType,
        expectedClockOutTime: expectedClockOutTime,
        notes: request.notes,
      })
      .returning();

    // 6. Log GPS compliance event
    if (expectedCoords) {
      await logGpsCompliance({
        eventType: 'clock_in',
        staffId: request.staffId,
        appointmentId: request.appointmentId,
        timeClockRecordId: clockRecord[0].id,
        recordedCoords: {
          latitude: request.latitude,
          longitude: request.longitude,
        },
        expectedCoords,
        distance: gpsValidation?.distance,
        isCompliant: gpsCompliant,
        requiresReview: !gpsCompliant,
        notes: request.notes,
      });
    }

    return {
      success: true,
      recordId: clockRecord[0].id,
      errors,
      warnings,
      gpsCompliant,
      distance: gpsValidation?.distance?.distanceMeters,
    };
  } catch (error) {
    console.error('Clock in error:', error);
    errors.push('Failed to process clock in event');
    return { success: false, errors, warnings };
  }
}

/**
 * Clock out a staff member
 */
export async function clockOut(
  request: ClockOutRequest
): Promise<ClockEventResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Find corresponding clock-in event
    const clockInQuery = await db
      .select()
      .from(timeClockRecords)
      .where(
        and(
          eq(timeClockRecords.staffId, request.staffId),
          eq(timeClockRecords.eventType, 'clock_in'),
          request.appointmentId
            ? eq(timeClockRecords.appointmentId, request.appointmentId)
            : isNull(timeClockRecords.appointmentId),
          or(
            eq(timeClockRecords.eventStatus, 'valid'),
            eq(timeClockRecords.eventStatus, 'gps_warning'),
            eq(timeClockRecords.eventStatus, 'gps_violation')
          )
        )
      )
      .orderBy(timeClockRecords.timestamp);

    if (clockInQuery.length === 0) {
      errors.push('No active clock-in event found for this staff member');
      return { success: false, errors, warnings };
    }

    // Get the most recent clock-in without a clock-out
    let matchingClockIn = null;
    for (const clockIn of clockInQuery) {
      // Check if this clock-in has a clock-out
      const hasClockOut = await db
        .select()
        .from(timeClockRecords)
        .where(
          and(
            eq(timeClockRecords.staffId, request.staffId),
            eq(timeClockRecords.eventType, 'clock_out'),
            clockIn.appointmentId
              ? eq(timeClockRecords.appointmentId, clockIn.appointmentId)
              : isNull(timeClockRecords.appointmentId),
            gte(timeClockRecords.timestamp, clockIn.timestamp)
          )
        )
        .limit(1);

      if (hasClockOut.length === 0) {
        matchingClockIn = clockIn;
        break;
      }
    }

    if (!matchingClockIn) {
      errors.push('No active clock-in event found (all have been clocked out)');
      return { success: false, errors, warnings };
    }

    // 2. Validate GPS if expected coordinates are available
    const expectedCoords = await getExpectedCoordinates(request.appointmentId);
    let gpsValidation;
    let gpsCompliant = true;
    let eventStatus: ClockEventStatus = 'valid';

    if (expectedCoords) {
      const actualCoords: GpsCoordinates = {
        latitude: request.latitude,
        longitude: request.longitude,
        accuracy: request.accuracy,
      };

      gpsValidation = await validateGpsForClockEvent(
        actualCoords,
        expectedCoords,
        100
      );

      if (!gpsValidation.isValid) {
        gpsCompliant = false;
        eventStatus = 'gps_violation';
        errors.push(...gpsValidation.errors);
      } else if (gpsValidation.warnings.length > 0) {
        eventStatus = 'gps_warning';
        warnings.push(...gpsValidation.warnings);
      }
    }

    // 3. Calculate duration
    const clockInTime = new Date(matchingClockIn.timestamp);
    const clockOutTime = new Date();
    const durationMinutes = Math.floor(
      (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60)
    );

    // Check if duration is reasonable
    if (durationMinutes < 5) {
      warnings.push(
        `Very short shift duration (${durationMinutes} minutes). Please verify.`
      );
    }

    if (durationMinutes > 16 * 60) {
      // More than 16 hours
      warnings.push(
        `Very long shift duration (${Math.floor(durationMinutes / 60)} hours). Please verify.`
      );
    }

    // 4. Create clock-out record
    const clockRecord = await db
      .insert(timeClockRecords)
      .values({
        staffId: request.staffId,
        appointmentId: request.appointmentId,
        eventType: 'clock_out',
        eventStatus,
        timestamp: clockOutTime,
        latitude: request.latitude.toString(),
        longitude: request.longitude.toString(),
        accuracy: request.accuracy?.toString(),
        expectedLatitude: expectedCoords?.latitude.toString(),
        expectedLongitude: expectedCoords?.longitude.toString(),
        distanceFromExpected: gpsValidation?.distance?.distanceMeters.toString(),
        isWithinRadius: gpsValidation?.isValid ? 'yes' : 'no',
        radiusThreshold: '100',
        deviceType: request.deviceType,
        pairId: matchingClockIn.id, // Link to clock-in event
        notes: request.notes,
      })
      .returning();

    // 5. Update clock-in record with pair ID
    await db
      .update(timeClockRecords)
      .set({
        pairId: clockRecord[0].id,
      })
      .where(eq(timeClockRecords.id, matchingClockIn.id));

    // 6. Log GPS compliance event
    if (expectedCoords) {
      await logGpsCompliance({
        eventType: 'clock_out',
        staffId: request.staffId,
        appointmentId: request.appointmentId,
        timeClockRecordId: clockRecord[0].id,
        recordedCoords: {
          latitude: request.latitude,
          longitude: request.longitude,
        },
        expectedCoords,
        distance: gpsValidation?.distance,
        isCompliant: gpsCompliant,
        requiresReview: !gpsCompliant,
        notes: request.notes,
      });
    }

    return {
      success: true,
      recordId: clockRecord[0].id,
      errors,
      warnings,
      gpsCompliant,
      distance: gpsValidation?.distance?.distanceMeters,
    };
  } catch (error) {
    console.error('Clock out error:', error);
    errors.push('Failed to process clock out event');
    return { success: false, errors, warnings };
  }
}

/**
 * Get active clock-in status for a staff member
 */
export async function getActiveClockIn(staffId: string) {
  const overlapping = await checkOverlappingEvents(staffId);
  return {
    isClockedIn: overlapping.length > 0,
    activeEvents: overlapping,
  };
}

/**
 * Get clock records for a staff member within a date range
 */
export async function getClockRecords(
  staffId: string,
  startDate: Date,
  endDate: Date
) {
  const records = await db
    .select()
    .from(timeClockRecords)
    .where(
      and(
        eq(timeClockRecords.staffId, staffId),
        gte(timeClockRecords.timestamp, startDate),
        lte(timeClockRecords.timestamp, endDate)
      )
    )
    .orderBy(timeClockRecords.timestamp);

  return records;
}

/**
 * Calculate total hours from clock records
 */
export function calculateHoursFromRecords(
  records: typeof timeClockRecords.$inferSelect[]
): number {
  let totalMinutes = 0;

  // Group records by pair
  const pairs = new Map<string, typeof timeClockRecords.$inferSelect>();

  for (const record of records) {
    if (record.eventType === 'clock_in') {
      pairs.set(record.id, record);
    } else if (record.eventType === 'clock_out' && record.pairId) {
      const clockIn = pairs.get(record.pairId);
      if (clockIn) {
        const duration = Math.floor(
          (new Date(record.timestamp).getTime() -
            new Date(clockIn.timestamp).getTime()) /
            (1000 * 60)
        );
        totalMinutes += duration;
      }
    }
  }

  return totalMinutes / 60; // Convert to hours
}
