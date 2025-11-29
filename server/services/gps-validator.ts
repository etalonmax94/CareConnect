/**
 * GPS Validation and Distance Calculation Service
 *
 * Provides GPS coordinate validation, distance calculations,
 * and compliance checking for time clock events
 */

import { db } from '../db.js';
import { gpsComplianceLogs, type GpsComplianceEventType } from '../../shared/schema.js';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface DistanceResult {
  distanceMeters: number;
  distanceKilometers: number;
  isWithinRadius: boolean;
  radiusThresholdMeters: number;
}

export interface GpsValidationResult {
  isValid: boolean;
  distance?: DistanceResult;
  errors: string[];
  warnings: string[];
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  coord1: GpsCoordinates,
  coord2: GpsCoordinates
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Validate GPS coordinates are within valid ranges
 */
export function validateCoordinates(coords: GpsCoordinates): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate latitude (-90 to 90)
  if (coords.latitude < -90 || coords.latitude > 90) {
    errors.push(
      `Invalid latitude: ${coords.latitude}. Must be between -90 and 90.`
    );
  }

  // Validate longitude (-180 to 180)
  if (coords.longitude < -180 || coords.longitude > 180) {
    errors.push(
      `Invalid longitude: ${coords.longitude}. Must be between -180 and 180.`
    );
  }

  // Check for null island (0,0) which often indicates GPS failure
  if (coords.latitude === 0 && coords.longitude === 0) {
    errors.push('Coordinates appear to be default (0,0) - GPS may not be enabled');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if coordinates are within a specified radius of expected location
 */
export function checkRadius(
  actual: GpsCoordinates,
  expected: GpsCoordinates,
  radiusMeters: number = 100
): DistanceResult {
  const distanceMeters = calculateDistance(actual, expected);
  const distanceKilometers = distanceMeters / 1000;
  const isWithinRadius = distanceMeters <= radiusMeters;

  return {
    distanceMeters,
    distanceKilometers,
    isWithinRadius,
    radiusThresholdMeters: radiusMeters,
  };
}

/**
 * Comprehensive GPS validation for time clock events
 */
export async function validateGpsForClockEvent(
  actualCoords: GpsCoordinates,
  expectedCoords: GpsCoordinates,
  radiusMeters: number = 100,
  accuracyThreshold: number = 50
): Promise<GpsValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate coordinate ranges
  const coordValidation = validateCoordinates(actualCoords);
  if (!coordValidation.isValid) {
    errors.push(...coordValidation.errors);
    return {
      isValid: false,
      errors,
      warnings,
    };
  }

  const expectedValidation = validateCoordinates(expectedCoords);
  if (!expectedValidation.isValid) {
    errors.push('Expected coordinates are invalid');
    return {
      isValid: false,
      errors,
      warnings,
    };
  }

  // 2. Check GPS accuracy if provided
  if (actualCoords.accuracy && actualCoords.accuracy > accuracyThreshold) {
    warnings.push(
      `GPS accuracy (${actualCoords.accuracy}m) exceeds recommended threshold (${accuracyThreshold}m). Location may be inaccurate.`
    );
  }

  // 3. Calculate distance and check radius
  const distance = checkRadius(actualCoords, expectedCoords, radiusMeters);

  if (!distance.isWithinRadius) {
    errors.push(
      `Clock event location is ${distance.distanceMeters.toFixed(0)}m away from expected location (threshold: ${radiusMeters}m)`
    );
  }

  // 4. Add warning if distance is close to threshold
  if (
    distance.isWithinRadius &&
    distance.distanceMeters > radiusMeters * 0.8
  ) {
    warnings.push(
      `Location is near the edge of approved radius (${distance.distanceMeters.toFixed(0)}m of ${radiusMeters}m)`
    );
  }

  return {
    isValid: errors.length === 0,
    distance,
    errors,
    warnings,
  };
}

/**
 * Log GPS compliance event to database
 */
export async function logGpsCompliance(params: {
  eventType: GpsComplianceEventType;
  staffId?: string;
  appointmentId?: string;
  timeClockRecordId?: string;
  recordedCoords?: GpsCoordinates;
  expectedCoords?: GpsCoordinates;
  distance?: DistanceResult;
  isCompliant: boolean;
  requiresReview?: boolean;
  notes?: string;
}) {
  const log = await db.insert(gpsComplianceLogs).values({
    eventType: params.eventType,
    staffId: params.staffId,
    appointmentId: params.appointmentId,
    timeClockRecordId: params.timeClockRecordId,
    recordedLatitude: params.recordedCoords?.latitude.toString(),
    recordedLongitude: params.recordedCoords?.longitude.toString(),
    expectedLatitude: params.expectedCoords?.latitude.toString(),
    expectedLongitude: params.expectedCoords?.longitude.toString(),
    distanceMeters: params.distance?.distanceMeters.toString(),
    isCompliant: params.isCompliant ? 'yes' : 'no',
    requiresReview: params.requiresReview ? 'yes' : 'no',
    notes: params.notes,
    reviewedAt: null,
    reviewedById: null,
  }).returning();

  return log[0];
}

/**
 * Get GPS compliance logs with filters
 */
export async function getGpsComplianceLogs(filters?: {
  staffId?: string;
  appointmentId?: string;
  eventType?: GpsComplianceEventType;
  isCompliant?: boolean;
  requiresReview?: boolean;
  startDate?: Date;
  endDate?: Date;
}) {
  // TODO: Implement filtering logic with Drizzle ORM
  // For now, return basic query
  const logs = await db.select().from(gpsComplianceLogs);
  return logs;
}

/**
 * Calculate the center point between multiple GPS coordinates
 * Useful for determining the "expected" location when staff work at multiple addresses
 */
export function calculateCenterPoint(
  coordinates: GpsCoordinates[]
): GpsCoordinates | null {
  if (coordinates.length === 0) return null;
  if (coordinates.length === 1) return coordinates[0];

  let x = 0;
  let y = 0;
  let z = 0;

  for (const coord of coordinates) {
    const latitude = (coord.latitude * Math.PI) / 180;
    const longitude = (coord.longitude * Math.PI) / 180;

    x += Math.cos(latitude) * Math.cos(longitude);
    y += Math.cos(latitude) * Math.sin(longitude);
    z += Math.sin(latitude);
  }

  const total = coordinates.length;
  x = x / total;
  y = y / total;
  z = z / total;

  const centralLongitude = Math.atan2(y, x);
  const centralSquareRoot = Math.sqrt(x * x + y * y);
  const centralLatitude = Math.atan2(z, centralSquareRoot);

  return {
    latitude: (centralLatitude * 180) / Math.PI,
    longitude: (centralLongitude * 180) / Math.PI,
  };
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

/**
 * Parse coordinates from string format "lat,lng"
 */
export function parseCoordinates(coordString: string): GpsCoordinates | null {
  try {
    const parts = coordString.split(',').map((s) => s.trim());
    if (parts.length !== 2) return null;

    const latitude = parseFloat(parts[0]);
    const longitude = parseFloat(parts[1]);

    if (isNaN(latitude) || isNaN(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null;
  }
}

/**
 * Format coordinates to string "lat,lng"
 */
export function formatCoordinates(coords: GpsCoordinates): string {
  return `${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
}
