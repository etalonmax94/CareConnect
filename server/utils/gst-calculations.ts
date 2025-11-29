/**
 * GST Calculation Utilities
 * Handles GST calculations for different service types
 */

import type { ServiceType } from '../../shared/schema.js';

const GST_RATE = 0.10; // 10% GST

/**
 * Determine if a service type requires GST
 * @param serviceType - The service type (NDIS, Support at Home, Private)
 * @returns true if GST applies, false otherwise
 */
export function requiresGST(serviceType: ServiceType): boolean {
  // NDIS services are GST-exempt
  // Private services require GST
  // Support at Home may vary - typically GST-exempt for registered providers
  return serviceType === 'Private';
}

/**
 * Calculate GST amount from a subtotal
 * @param subtotal - Subtotal amount as string
 * @param serviceType - Service type to determine if GST applies
 * @returns GST amount as string
 */
export function calculateGST(subtotal: string, serviceType: ServiceType): string {
  if (!requiresGST(serviceType)) {
    return '0.00';
  }

  const subtotalNum = parseFloat(subtotal) || 0;
  const gst = subtotalNum * GST_RATE;
  return gst.toFixed(2);
}

/**
 * Calculate total including GST
 * @param subtotal - Subtotal amount as string
 * @param serviceType - Service type to determine if GST applies
 * @returns Total amount including GST
 */
export function calculateTotalWithGST(subtotal: string, serviceType: ServiceType): string {
  const subtotalNum = parseFloat(subtotal) || 0;
  const gstNum = parseFloat(calculateGST(subtotal, serviceType));
  const total = subtotalNum + gstNum;
  return total.toFixed(2);
}

/**
 * Extract GST from a total that includes GST
 * @param totalIncludingGST - Total amount including GST
 * @param serviceType - Service type
 * @returns GST amount
 */
export function extractGSTFromTotal(totalIncludingGST: string, serviceType: ServiceType): string {
  if (!requiresGST(serviceType)) {
    return '0.00';
  }

  const total = parseFloat(totalIncludingGST) || 0;
  // If total includes GST, then: total = subtotal × 1.1
  // Therefore: GST = total - (total / 1.1) = total × (1 - 1/1.1)
  const gst = total - (total / (1 + GST_RATE));
  return gst.toFixed(2);
}

/**
 * Calculate subtotal from total including GST
 * @param totalIncludingGST - Total amount including GST
 * @param serviceType - Service type
 * @returns Subtotal (excluding GST)
 */
export function calculateSubtotalFromTotal(totalIncludingGST: string, serviceType: ServiceType): string {
  if (!requiresGST(serviceType)) {
    return totalIncludingGST;
  }

  const total = parseFloat(totalIncludingGST) || 0;
  const subtotal = total / (1 + GST_RATE);
  return subtotal.toFixed(2);
}

/**
 * Get GST label for display
 * @param serviceType - Service type
 * @returns Label to display (e.g., "GST Exempt" or "GST (10%)")
 */
export function getGSTLabel(serviceType: ServiceType): string {
  if (requiresGST(serviceType)) {
    return `GST (${(GST_RATE * 100).toFixed(0)}%)`;
  }
  return 'GST Exempt';
}

/**
 * Format currency with GST information
 * @param amount - Amount to format
 * @param serviceType - Service type
 * @returns Formatted string with GST info
 */
export function formatAmountWithGSTInfo(amount: string, serviceType: ServiceType): string {
  const amountNum = parseFloat(amount) || 0;
  const formatted = `$${amountNum.toFixed(2)}`;

  if (requiresGST(serviceType)) {
    return `${formatted} (inc. GST)`;
  }
  return `${formatted} (GST Exempt)`;
}

/**
 * Calculate quote totals with GST handling
 */
export interface QuoteTotals {
  subtotal: string;
  gstAmount: string;
  totalAmount: string;
}

export function calculateQuoteTotals(subtotal: string, serviceType: ServiceType): QuoteTotals {
  const gstAmount = calculateGST(subtotal, serviceType);
  const totalAmount = calculateTotalWithGST(subtotal, serviceType);

  return {
    subtotal,
    gstAmount,
    totalAmount,
  };
}
