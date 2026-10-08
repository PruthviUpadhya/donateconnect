import { DonationStatus } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";

/**
 * Valid lifecycle transitions:
 * PENDING -> APPROVED (NGO accepted) | REJECTED | CANCELLED
 * APPROVED -> ASSIGNED (Volunteer assigned) | CANCELLED
 * ASSIGNED -> PICKED_UP (Volunteer confirmed pickup) | CANCELLED
 * PICKED_UP -> DELIVERED (Volunteer completed delivery)
 */
const VALID_TRANSITIONS: Record<DonationStatus, DonationStatus[]> = {
  PENDING: [DonationStatus.APPROVED, DonationStatus.REJECTED, DonationStatus.CANCELLED],
  APPROVED: [DonationStatus.ASSIGNED, DonationStatus.CANCELLED],
  ASSIGNED: [DonationStatus.PICKED_UP, DonationStatus.CANCELLED],
  PICKED_UP: [DonationStatus.DELIVERED],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
};

export class DonationStateMachine {
  /**
   * Validates if transition is permissible. Throws 409 Conflict if invalid.
   */
  static validateTransition(currentStatus: DonationStatus, nextStatus: DonationStatus): void {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new AppError({
        statusCode: 409,
        code: "INVALID_STATUS_TRANSITION",
        message: `Cannot transition donation status from ${currentStatus} to ${nextStatus}`,
        details: { currentStatus, nextStatus, allowedTransitions: allowed },
      });
    }
  }

  /**
   * Returns timestamp update mapping corresponding to status transition
   */
  static getTimestampUpdates(nextStatus: DonationStatus): Record<string, Date> {
    const now = new Date();
    switch (nextStatus) {
      case DonationStatus.APPROVED:
        return { approvedAt: now };
      case DonationStatus.ASSIGNED:
        return { assignedAt: now };
      case DonationStatus.PICKED_UP:
        return { pickedUpAt: now };
      case DonationStatus.DELIVERED:
        return { deliveredAt: now };
      case DonationStatus.REJECTED:
        return { rejectedAt: now };
      case DonationStatus.CANCELLED:
        return { cancelledAt: now };
      default:
        return {};
    }
  }
}
