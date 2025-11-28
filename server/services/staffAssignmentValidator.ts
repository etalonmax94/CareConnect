import { db } from "../db";
import { eq, and, or, lte, gte, not, inArray } from "drizzle-orm";
import {
  appointments,
  appointmentAssignments,
  clientStaffRestrictions,
  clientStaffPreferences,
  staffAvailabilityWindows,
  staffUnavailabilityPeriods,
  staff,
  clients,
  type StaffAvailabilityWindow,
  type SchedulingConflictType,
  type ConflictSeverity,
  type InsertSchedulingConflict,
} from "@shared/schema";
import { storage } from "../storage";

export interface ValidationContext {
  appointmentId: string;
  clientId: string;
  clientName: string;
  staffId: string;
  staffName: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  checkingUserId?: string;
  checkingUserName?: string;
}

export interface ValidationResult {
  isValid: boolean;
  canProceed: boolean; // false only for hard blocks
  conflicts: ConflictInfo[];
  warnings: ConflictInfo[];
  info: ConflictInfo[];
}

export interface ConflictInfo {
  type: SchedulingConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  details: Record<string, any>;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export class StaffAssignmentValidator {
  async validateAssignment(context: ValidationContext): Promise<ValidationResult> {
    const conflicts: ConflictInfo[] = [];
    const warnings: ConflictInfo[] = [];
    const info: ConflictInfo[] = [];

    const checks = await Promise.all([
      this.checkRestrictions(context),
      this.checkAvailabilityWindows(context),
      this.checkUnavailabilityPeriods(context),
      this.checkDoubleBooking(context),
      this.checkPreferences(context),
    ]);

    for (const result of checks) {
      for (const conflict of result) {
        if (conflict.severity === "critical") {
          conflicts.push(conflict);
        } else if (conflict.severity === "warning") {
          warnings.push(conflict);
        } else {
          info.push(conflict);
        }
      }
    }

    const hasCritical = conflicts.length > 0;
    const hasWarning = warnings.length > 0;

    return {
      isValid: !hasCritical && !hasWarning,
      canProceed: !hasCritical, // Only hard blocks prevent proceeding
      conflicts,
      warnings,
      info,
    };
  }

  async checkRestrictions(context: ValidationContext): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    const now = new Date();

    const restrictions = await db.select()
      .from(clientStaffRestrictions)
      .where(and(
        eq(clientStaffRestrictions.clientId, context.clientId),
        eq(clientStaffRestrictions.staffId, context.staffId),
        eq(clientStaffRestrictions.isActive, "yes"),
        lte(clientStaffRestrictions.effectiveFrom, now),
        or(
          eq(clientStaffRestrictions.effectiveTo, null as any),
          gte(clientStaffRestrictions.effectiveTo, now)
        )
      ));

    for (const restriction of restrictions) {
      const severity: ConflictSeverity = 
        restriction.severity === "hard_block" ? "critical" :
        restriction.severity === "soft_block" ? "warning" : "info";

      conflicts.push({
        type: "restriction_violation",
        severity,
        title: severity === "critical" ? "Staff Restriction Block" : 
               severity === "warning" ? "Staff Restriction Warning" : "Staff Restriction Note",
        description: `${context.staffName} has a ${restriction.severity?.replace("_", " ")} restriction for ${context.clientName}: ${restriction.reason}`,
        details: {
          restrictionId: restriction.id,
          restrictionReason: restriction.reason,
          restrictionSeverity: restriction.severity,
          effectiveFrom: restriction.effectiveFrom,
          effectiveTo: restriction.effectiveTo,
        },
        relatedEntityType: "restriction",
        relatedEntityId: restriction.id,
      });
    }

    return conflicts;
  }

  async checkAvailabilityWindows(context: ValidationContext): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    const appointmentStart = context.scheduledStart;
    const appointmentEnd = context.scheduledEnd;
    const dayOfWeek = appointmentStart.getDay().toString() as "0" | "1" | "2" | "3" | "4" | "5" | "6";
    
    const appointmentStartTime = this.formatTimeHHMM(appointmentStart);
    const appointmentEndTime = this.formatTimeHHMM(appointmentEnd);
    const dateStr = appointmentStart.toISOString().split('T')[0];

    const availabilityWindows = await db.select()
      .from(staffAvailabilityWindows)
      .where(and(
        eq(staffAvailabilityWindows.staffId, context.staffId),
        eq(staffAvailabilityWindows.dayOfWeek, dayOfWeek),
        eq(staffAvailabilityWindows.isActive, "yes")
      ));

    const activeWindows = availabilityWindows.filter((w: StaffAvailabilityWindow) => {
      if (w.effectiveFrom && w.effectiveFrom > dateStr) return false;
      if (w.effectiveTo && w.effectiveTo < dateStr) return false;
      return true;
    });

    if (activeWindows.length === 0) {
      conflicts.push({
        type: "availability_conflict",
        severity: "warning",
        title: "No Availability Window",
        description: `${context.staffName} has no availability window set for ${this.getDayName(Number(dayOfWeek))}`,
        details: {
          dayOfWeek,
          dayName: this.getDayName(Number(dayOfWeek)),
          appointmentStart: appointmentStartTime,
          appointmentEnd: appointmentEndTime,
        },
      });
      return conflicts;
    }

    const isWithinAnyWindow = activeWindows.some((window: StaffAvailabilityWindow) => 
      appointmentStartTime >= window.startTime && appointmentEndTime <= window.endTime
    );

    if (!isWithinAnyWindow) {
      const windowsDescription = activeWindows
        .map((w: StaffAvailabilityWindow) => `${w.startTime} - ${w.endTime}`)
        .join(", ");

      conflicts.push({
        type: "availability_conflict",
        severity: "warning",
        title: "Outside Availability Window",
        description: `${context.staffName}'s appointment (${appointmentStartTime} - ${appointmentEndTime}) falls outside their availability on ${this.getDayName(Number(dayOfWeek))}: ${windowsDescription}`,
        details: {
          dayOfWeek,
          dayName: this.getDayName(Number(dayOfWeek)),
          appointmentStart: appointmentStartTime,
          appointmentEnd: appointmentEndTime,
          availableWindows: activeWindows.map((w: StaffAvailabilityWindow) => ({
            startTime: w.startTime,
            endTime: w.endTime,
          })),
        },
      });
    }

    return conflicts;
  }

  async checkUnavailabilityPeriods(context: ValidationContext): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    const appointmentStart = context.scheduledStart;
    const appointmentEnd = context.scheduledEnd;

    const unavailabilityPeriods = await db.select()
      .from(staffUnavailabilityPeriods)
      .where(and(
        eq(staffUnavailabilityPeriods.staffId, context.staffId),
        eq(staffUnavailabilityPeriods.status, "approved"),
        lte(staffUnavailabilityPeriods.startDate, appointmentEnd),
        gte(staffUnavailabilityPeriods.endDate, appointmentStart)
      ));

    for (const period of unavailabilityPeriods) {
      const typeLabel = this.getUnavailabilityTypeLabel(period.unavailabilityType || "unavailable");
      
      conflicts.push({
        type: "availability_conflict",
        severity: "critical",
        title: "Staff Unavailable",
        description: `${context.staffName} is unavailable (${typeLabel}) from ${this.formatDate(period.startDate)} to ${this.formatDate(period.endDate)}${period.reason ? `: ${period.reason}` : ""}`,
        details: {
          unavailabilityId: period.id,
          unavailabilityType: period.unavailabilityType,
          startDate: period.startDate,
          endDate: period.endDate,
          reason: period.reason,
          isAllDay: period.isAllDay,
        },
        relatedEntityType: "unavailability",
        relatedEntityId: period.id,
      });
    }

    return conflicts;
  }

  async checkDoubleBooking(context: ValidationContext): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    const appointmentStart = context.scheduledStart;
    const appointmentEnd = context.scheduledEnd;

    const staffAssignments = await db.select({
      assignment: appointmentAssignments,
      appointment: appointments,
    })
      .from(appointmentAssignments)
      .innerJoin(appointments, eq(appointmentAssignments.appointmentId, appointments.id))
      .where(and(
        eq(appointmentAssignments.staffId, context.staffId),
        not(eq(appointmentAssignments.appointmentId, context.appointmentId)),
        inArray(appointmentAssignments.status, ["pending", "accepted"]),
        not(inArray(appointments.status, ["cancelled", "completed"])),
        lte(appointments.scheduledStart, appointmentEnd),
        gte(appointments.scheduledEnd, appointmentStart)
      ));

    for (const { assignment, appointment } of staffAssignments) {
      conflicts.push({
        type: "double_booking",
        severity: "critical",
        title: "Double Booking Detected",
        description: `${context.staffName} is already assigned to "${appointment.title}" (${this.formatTime(appointment.scheduledStart)} - ${this.formatTime(appointment.scheduledEnd)}) which overlaps with this appointment`,
        details: {
          conflictingAppointmentId: appointment.id,
          conflictingAppointmentTitle: appointment.title,
          conflictingStart: appointment.scheduledStart,
          conflictingEnd: appointment.scheduledEnd,
          assignmentId: assignment.id,
          assignmentStatus: assignment.status,
        },
        relatedEntityType: "appointment",
        relatedEntityId: appointment.id,
      });
    }

    return conflicts;
  }

  async checkPreferences(context: ValidationContext): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    const preferences = await db.select()
      .from(clientStaffPreferences)
      .where(and(
        eq(clientStaffPreferences.clientId, context.clientId),
        eq(clientStaffPreferences.isActive, "yes")
      ));

    if (preferences.length === 0) {
      return conflicts;
    }

    const isPreferred = preferences.some(p => p.staffId === context.staffId);
    
    if (!isPreferred) {
      const preferredStaffIds = preferences.map(p => p.staffId);
      const preferredStaff = await db.select()
        .from(staff)
        .where(inArray(staff.id, preferredStaffIds));
      
      const preferredNames = preferredStaff.map(s => s.name).join(", ");

      conflicts.push({
        type: "preference_override",
        severity: "info",
        title: "Non-Preferred Staff Assignment",
        description: `${context.staffName} is not on ${context.clientName}'s preferred staff list. Preferred staff: ${preferredNames || "None specified"}`,
        details: {
          preferredStaffIds,
          preferredStaffNames: preferredStaff.map(s => ({ id: s.id, name: s.name })),
          clientPreferences: preferences.map(p => ({
            staffId: p.staffId,
            level: p.preferenceLevel,
            notes: p.notes,
          })),
        },
      });
    }

    return conflicts;
  }

  async validateMultipleStaff(
    appointmentId: string,
    clientId: string,
    clientName: string,
    scheduledStart: Date,
    scheduledEnd: Date,
    staffAssignments: { staffId: string; staffName: string }[],
    checkingUserId?: string,
    checkingUserName?: string
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    const validations = await Promise.all(
      staffAssignments.map(({ staffId, staffName }) =>
        this.validateAssignment({
          appointmentId,
          clientId,
          clientName,
          staffId,
          staffName,
          scheduledStart,
          scheduledEnd,
          checkingUserId,
          checkingUserName,
        }).then(result => ({ staffId, result }))
      )
    );

    for (const { staffId, result } of validations) {
      results.set(staffId, result);
    }

    return results;
  }

  async createConflictRecords(
    context: ValidationContext,
    conflicts: ConflictInfo[]
  ): Promise<void> {
    const insertPromises = conflicts.map(conflict => {
      const record: InsertSchedulingConflict = {
        appointmentId: context.appointmentId,
        clientId: context.clientId,
        clientName: context.clientName,
        staffId: context.staffId,
        staffName: context.staffName,
        conflictType: conflict.type,
        severity: conflict.severity,
        title: conflict.title,
        description: conflict.description,
        conflictDetails: {
          ...conflict.details,
          relatedEntityType: conflict.relatedEntityType,
          relatedEntityId: conflict.relatedEntityId,
        },
        conflictDate: context.scheduledStart,
        detectedById: context.checkingUserId,
        detectedByName: context.checkingUserName,
        detectedBySystem: context.checkingUserId ? "no" : "yes",
        status: "open",
      };

      return storage.createSchedulingConflict(record);
    });

    await Promise.all(insertPromises);
  }

  async detectAndRecordConflicts(context: ValidationContext): Promise<ValidationResult> {
    const result = await this.validateAssignment(context);
    
    const allConflicts = [...result.conflicts, ...result.warnings, ...result.info];
    
    if (allConflicts.length > 0) {
      await this.createConflictRecords(context, allConflicts);
    }

    return result;
  }

  async validateAndRecordForAppointment(
    appointmentId: string
  ): Promise<Map<string, ValidationResult>> {
    const [appointment] = await db.select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId));

    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }

    const [client] = await db.select()
      .from(clients)
      .where(eq(clients.id, appointment.clientId));

    if (!client) {
      throw new Error(`Client ${appointment.clientId} not found`);
    }

    const assignments = await db.select({
      assignment: appointmentAssignments,
      staffMember: staff,
    })
      .from(appointmentAssignments)
      .innerJoin(staff, eq(appointmentAssignments.staffId, staff.id))
      .where(and(
        eq(appointmentAssignments.appointmentId, appointmentId),
        inArray(appointmentAssignments.status, ["pending", "accepted"])
      ));

    const results = new Map<string, ValidationResult>();

    for (const { assignment, staffMember } of assignments) {
      const context: ValidationContext = {
        appointmentId,
        clientId: client.id,
        clientName: client.participantName || `${client.firstName} ${client.lastName}`,
        staffId: staffMember.id,
        staffName: staffMember.name || "Unknown Staff",
        scheduledStart: appointment.scheduledStart,
        scheduledEnd: appointment.scheduledEnd,
      };

      const result = await this.detectAndRecordConflicts(context);
      results.set(staffMember.id, result);
    }

    return results;
  }

  async revalidateStaffFutureAppointments(staffId: string): Promise<{
    appointmentsChecked: number;
    conflictsFound: number;
  }> {
    const now = new Date();
    
    const futureAssignments = await db.select({
      assignment: appointmentAssignments,
      appointment: appointments,
      client: clients,
    })
      .from(appointmentAssignments)
      .innerJoin(appointments, eq(appointmentAssignments.appointmentId, appointments.id))
      .innerJoin(clients, eq(appointments.clientId, clients.id))
      .where(and(
        eq(appointmentAssignments.staffId, staffId),
        inArray(appointmentAssignments.status, ["pending", "accepted"]),
        not(inArray(appointments.status, ["cancelled", "completed"])),
        gte(appointments.scheduledStart, now)
      ));

    const [staffMember] = await db.select().from(staff).where(eq(staff.id, staffId));
    const staffName = staffMember?.name || "Unknown Staff";

    let totalConflicts = 0;

    for (const { assignment, appointment, client } of futureAssignments) {
      const context: ValidationContext = {
        appointmentId: appointment.id,
        clientId: client.id,
        clientName: client.participantName || `${client.firstName} ${client.lastName}`,
        staffId,
        staffName,
        scheduledStart: appointment.scheduledStart,
        scheduledEnd: appointment.scheduledEnd,
      };

      const result = await this.detectAndRecordConflicts(context);
      totalConflicts += result.conflicts.length + result.warnings.length;
    }

    return {
      appointmentsChecked: futureAssignments.length,
      conflictsFound: totalConflicts,
    };
  }

  async revalidateClientFutureAppointments(clientId: string): Promise<{
    appointmentsChecked: number;
    conflictsFound: number;
  }> {
    const now = new Date();
    
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    const clientName = client.participantName || `${client.firstName} ${client.lastName}`;

    const futureAppointments = await db.select({
      appointment: appointments,
      assignment: appointmentAssignments,
      staffMember: staff,
    })
      .from(appointments)
      .innerJoin(appointmentAssignments, eq(appointments.id, appointmentAssignments.appointmentId))
      .innerJoin(staff, eq(appointmentAssignments.staffId, staff.id))
      .where(and(
        eq(appointments.clientId, clientId),
        inArray(appointmentAssignments.status, ["pending", "accepted"]),
        not(inArray(appointments.status, ["cancelled", "completed"])),
        gte(appointments.scheduledStart, now)
      ));

    let totalConflicts = 0;

    for (const { appointment, assignment, staffMember } of futureAppointments) {
      const context: ValidationContext = {
        appointmentId: appointment.id,
        clientId,
        clientName,
        staffId: staffMember.id,
        staffName: staffMember.name || "Unknown Staff",
        scheduledStart: appointment.scheduledStart,
        scheduledEnd: appointment.scheduledEnd,
      };

      const result = await this.detectAndRecordConflicts(context);
      totalConflicts += result.conflicts.length + result.warnings.length;
    }

    return {
      appointmentsChecked: futureAppointments.length,
      conflictsFound: totalConflicts,
    };
  }

  private formatTimeHHMM(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  private getDayName(day: number): string {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day] || "Unknown";
  }

  private getUnavailabilityTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      annual_leave: "Annual Leave",
      sick_leave: "Sick Leave",
      personal_leave: "Personal Leave",
      training: "Training",
      unavailable: "Unavailable",
      other: "Other",
    };
    return labels[type] || type;
  }
}

export const staffAssignmentValidator = new StaffAssignmentValidator();
