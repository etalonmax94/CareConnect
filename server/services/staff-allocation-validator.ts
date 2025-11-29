/**
 * Staff Allocation Validation Service
 *
 * Enforces compliance rules for staff-client assignments:
 * - Client-specific restrictions
 * - Service type blacklisting
 * - Category blacklisting
 * - Qualification requirements
 * - Preference levels
 */

import { db } from '../db.js';
import {
  clientStaffRestrictions,
  staffBlacklist,
  staffQualifications,
  clients,
  staff,
  type ClientCategory,
  type ServiceType
} from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

export interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
  warnings: ValidationWarning[];
}

export interface ValidationViolation {
  type: 'hard_block' | 'soft_block';
  reason: string;
  source: 'client_restriction' | 'blacklist' | 'qualification';
  severity: 'critical' | 'high' | 'medium';
}

export interface ValidationWarning {
  type: 'preference' | 'capability' | 'qualification_expiry';
  message: string;
}

/**
 * Validate if a staff member can be assigned to a client for a specific service
 */
export async function validateStaffAllocation(
  staffId: string,
  clientId: string,
  serviceType?: ServiceType,
  serviceCategory?: string
): Promise<ValidationResult> {
  const violations: ValidationViolation[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Check client-specific restrictions
  const clientRestrictions = await db
    .select()
    .from(clientStaffRestrictions)
    .where(and(
      eq(clientStaffRestrictions.clientId, clientId),
      eq(clientStaffRestrictions.staffId, staffId),
      eq(clientStaffRestrictions.isActive, 'yes')
    ));

  for (const restriction of clientRestrictions) {
    // Check if restriction is currently active (date range)
    const now = new Date();
    const effectiveFrom = new Date(restriction.effectiveFrom);
    const effectiveTo = restriction.effectiveTo ? new Date(restriction.effectiveTo) : null;

    if (now >= effectiveFrom && (!effectiveTo || now <= effectiveTo)) {
      if (restriction.severity === 'hard_block') {
        violations.push({
          type: 'hard_block',
          reason: `Staff member is blocked from working with this client: ${restriction.reason}`,
          source: 'client_restriction',
          severity: 'critical',
        });
      } else if (restriction.severity === 'soft_block') {
        violations.push({
          type: 'soft_block',
          reason: `Staff assignment not recommended: ${restriction.reason}`,
          source: 'client_restriction',
          severity: 'medium',
        });
      } else {
        warnings.push({
          type: 'preference',
          message: `Warning: ${restriction.reason}`,
        });
      }
    }
  }

  // 2. Check staff blacklist (service type, category, client category)
  const client = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (client.length === 0) {
    violations.push({
      type: 'hard_block',
      reason: 'Client not found',
      source: 'client_restriction',
      severity: 'critical',
    });
    return { isValid: false, violations, warnings };
  }

  const clientCategory = client[0].category;

  const blacklistEntries = await db
    .select()
    .from(staffBlacklist)
    .where(and(
      eq(staffBlacklist.staffId, staffId),
      eq(staffBlacklist.isActive, 'yes')
    ));

  for (const entry of blacklistEntries) {
    // Check if blacklist entry is currently active (date range)
    const now = new Date();
    const effectiveFrom = new Date(entry.effectiveFrom);
    const effectiveTo = entry.effectiveTo ? new Date(entry.effectiveTo) : null;

    if (now >= effectiveFrom && (!effectiveTo || now <= effectiveTo)) {
      // Check service type blacklist
      if (entry.blacklistType === 'service_type' && entry.serviceType === serviceType) {
        violations.push({
          type: entry.severity === 'hard_block' ? 'hard_block' : 'soft_block',
          reason: `Staff member is blocked from ${serviceType} services: ${entry.reason}`,
          source: 'blacklist',
          severity: entry.severity === 'hard_block' ? 'critical' : 'high',
        });
      }

      // Check client category blacklist
      if (entry.blacklistType === 'client_category' && entry.clientCategory === clientCategory) {
        violations.push({
          type: entry.severity === 'hard_block' ? 'hard_block' : 'soft_block',
          reason: `Staff member is blocked from ${clientCategory} clients: ${entry.reason}`,
          source: 'blacklist',
          severity: entry.severity === 'hard_block' ? 'critical' : 'high',
        });
      }

      // Check service category blacklist
      if (entry.blacklistType === 'service_category' && entry.serviceCategory === serviceCategory) {
        violations.push({
          type: entry.severity === 'hard_block' ? 'hard_block' : 'soft_block',
          reason: `Staff member is blocked from ${serviceCategory} category: ${entry.reason}`,
          source: 'blacklist',
          severity: entry.severity === 'hard_block' ? 'critical' : 'high',
        });
      }

      // Check general blacklist
      if (entry.blacklistType === 'general') {
        violations.push({
          type: entry.severity === 'hard_block' ? 'hard_block' : 'soft_block',
          reason: `Staff member has general restriction: ${entry.reason}`,
          source: 'blacklist',
          severity: entry.severity === 'hard_block' ? 'critical' : 'high',
        });
      }
    }
  }

  // 3. Check qualification requirements
  if (serviceCategory) {
    const requiredQualifications = getRequiredQualifications(serviceCategory);

    if (requiredQualifications.length > 0) {
      const staffQualsData = await db
        .select()
        .from(staffQualifications)
        .where(eq(staffQualifications.staffId, staffId));

      for (const requiredQual of requiredQualifications) {
        const hasQualification = staffQualsData.some(q =>
          q.qualificationType === requiredQual && q.status === 'current'
        );

        if (!hasQualification) {
          violations.push({
            type: 'hard_block',
            reason: `Staff member lacks required qualification: ${requiredQual}`,
            source: 'qualification',
            severity: 'critical',
          });
        }
      }

      // Check for expiring qualifications
      const expiringQuals = staffQualsData.filter(q => {
        if (!q.expiryDate) return false;
        const expiryDate = new Date(q.expiryDate);
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      });

      for (const qual of expiringQuals) {
        warnings.push({
          type: 'qualification_expiry',
          message: `${qual.qualificationName} expires soon (${qual.expiryDate})`,
        });
      }
    }
  }

  // Determine overall validity
  const isValid = !violations.some(v => v.type === 'hard_block');

  return { isValid, violations, warnings };
}

/**
 * Get required qualifications for a service category
 */
function getRequiredQualifications(serviceCategory: string): string[] {
  const requirementsMap: Record<string, string[]> = {
    'nursing': ['nursing'],
    'complex_nursing': ['nursing', 'complex_care'],
    'medication_administration': ['medication_admin'],
    'behavioral_support': ['behavioral_support'],
    'manual_handling': ['manual_handling'],
    'high_risk': ['first_aid', 'manual_handling'],
  };

  const normalized = serviceCategory.toLowerCase().replace(/[^a-z_]/g, '_');
  return requirementsMap[normalized] || [];
}

/**
 * Get all eligible staff for a client/service combination
 */
export async function getEligibleStaff(
  clientId: string,
  serviceType?: ServiceType,
  serviceCategory?: string
): Promise<{ staffId: string; staffName: string; hasWarnings: boolean }[]> {
  // Get all active staff
  const allStaff = await db
    .select()
    .from(staff)
    .where(eq(staff.isActive, 'yes'));

  const eligible: { staffId: string; staffName: string; hasWarnings: boolean }[] = [];

  for (const staffMember of allStaff) {
    const validation = await validateStaffAllocation(
      staffMember.id,
      clientId,
      serviceType,
      serviceCategory
    );

    // Only include staff without hard blocks
    if (validation.isValid) {
      eligible.push({
        staffId: staffMember.id,
        staffName: staffMember.name,
        hasWarnings: validation.warnings.length > 0 || validation.violations.some(v => v.type === 'soft_block'),
      });
    }
  }

  return eligible;
}

/**
 * Batch validate multiple staff assignments
 */
export async function validateBatchAssignments(
  assignments: { staffId: string; clientId: string; serviceType?: ServiceType; serviceCategory?: string }[]
): Promise<Map<string, ValidationResult>> {
  const results = new Map<string, ValidationResult>();

  for (const assignment of assignments) {
    const key = `${assignment.staffId}-${assignment.clientId}`;
    const result = await validateStaffAllocation(
      assignment.staffId,
      assignment.clientId,
      assignment.serviceType,
      assignment.serviceCategory
    );
    results.set(key, result);
  }

  return results;
}
