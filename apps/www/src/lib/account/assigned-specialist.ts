export type AssignedSpecialist = {
    name: string;
};

/**
 * Local preview only. Stays null so staging does not invent a specialist.
 * PROD-2281 Full portal (messaging with the account manager) replaces this
 * with the real assignment read.
 */
const STUB_ASSIGNED_SPECIALIST: AssignedSpecialist | null = null;

/** Signed-out buyers never have an assignment. The stub is null for everyone else. */
export function assignedSpecialist(
    signedIn: boolean,
): AssignedSpecialist | null {
    if (!signedIn) return null;
    return STUB_ASSIGNED_SPECIALIST;
}
