export const DAY_MS = 86_400_000;
export const STATUS = Object.freeze({ ASSIGNED: 'Assigned', IN_PROGRESS: 'InProgress', COMPLETED: 'Completed', VERIFY: 'ManagerVerification', ISSUED: 'CertificateIssued', OVERDUE: 'Overdue', RESTRICTED: 'Restricted' });
export const CERTIFICATE_STATUS = Object.freeze({ ACTIVE: 'Active', EXPIRING: 'Expiring', EXPIRED: 'Expired', REVOKED: 'Revoked' });

const transitions = {
  Assigned: ['InProgress'], InProgress: ['Completed'], Completed: ['ManagerVerification', 'CertificateIssued'],
  ManagerVerification: ['CertificateIssued', 'InProgress'], CertificateIssued: [], Overdue: ['InProgress'], Restricted: ['InProgress']
};

export function transitionAssignment(assignment, next, actor, now = new Date()) {
  if (!transitions[assignment.status]?.includes(next)) throw new Error(`Invalid transition ${assignment.status} -> ${next}`);
  return { ...assignment, status: next, updatedAt: now.toISOString(), updatedBy: actor };
}

export function assignmentsForRole(courses, employee, existing, settings, now = new Date(), id = () => crypto.randomUUID()) {
  if (!settings.autoAssignOnRoleChange) return existing;
  const activeCourseIds = new Set(existing.filter(item => item.employeeId === employee.id && item.sourceRole === employee.role && item.isActive !== false).map(item => item.courseId));
  const updated = existing.map(item => item.employeeId === employee.id && item.sourceRole !== employee.role && item.status !== STATUS.ISSUED ? { ...item, isActive: false, updatedAt: now.toISOString() } : item);
  const created = courses.filter(course => course.organizationId === employee.organizationId && course.isActive && course.requiredRoles?.includes(employee.role) && !activeCourseIds.has(course.id)).map(course => ({
    id: id(), organizationId: employee.organizationId, courseId: course.id, employeeId: employee.id, assignedBy: 'system', sourceRole: employee.role,
    status: STATUS.ASSIGNED, isActive: true, assignedAt: now.toISOString(), dueAt: new Date(now.getTime() + 30 * DAY_MS).toISOString(), lastReminderAt: null, createdAt: now.toISOString(), updatedAt: now.toISOString()
  }));
  return updated.concat(created);
}

export function nextCompletionStatus(settings) { return settings.managerVerificationRequired ? STATUS.VERIFY : STATUS.ISSUED; }

export function verifyCompletion(completion, managerId, approved, reason = '', now = new Date()) {
  if (completion.employeeId === managerId) throw new Error('Employees cannot verify their own completion.');
  return { ...completion, verificationStatus: approved ? 'Approved' : 'Rejected', verifiedBy: managerId, verifiedAt: now.toISOString(), rejectionReason: approved ? null : reason, updatedAt: now.toISOString() };
}

export function certificateState(certificate, settings, now = new Date()) {
  if (certificate.status === CERTIFICATE_STATUS.REVOKED) return CERTIFICATE_STATUS.REVOKED;
  const expiry = new Date(certificate.expiresAt), days = (expiry - now) / DAY_MS;
  if (days < 0) return CERTIFICATE_STATUS.EXPIRED;
  if (days <= Math.max(...(settings.reminderDays || [60, 30, 7]))) return CERTIFICATE_STATUS.EXPIRING;
  return CERTIFICATE_STATUS.ACTIVE;
}

export function reminderDue(certificate, reminderDays = [60, 30, 7], now = new Date()) {
  const day = Math.ceil((new Date(certificate.expiresAt) - now) / DAY_MS);
  const sent = new Set(certificate.sentReminderDays || []);
  return reminderDays.includes(day) && !sent.has(day) ? day : null;
}

export function accessDecision(certificates, employeeId, settings, now = new Date()) {
  const employeeCertificates = certificates.filter(item => item.employeeId === employeeId && item.status !== CERTIFICATE_STATUS.REVOKED);
  if (employeeCertificates.some(item => new Date(item.expiresAt) >= now)) return { restricted: false, restore: true };
  const latestExpiry = employeeCertificates.reduce((latest, item) => Math.max(latest, new Date(item.expiresAt).getTime()), 0);
  if (!latestExpiry) return { restricted: false, restore: false };
  const restrictAt = new Date(latestExpiry + settings.gracePeriodDays * DAY_MS);
  return { restricted: now > restrictAt, restore: false, restrictAt: restrictAt.toISOString(), restrictedRoleSlug: settings.restrictedRoleSlug };
}

export function makeAuditEvent({ organizationId, actorId, action, entityType, entityId, metadata = {}, now = new Date() }) {
  const occurredAt = now.toISOString();
  return { organizationId, actorId, action, entityType, entityId, metadata: JSON.stringify(metadata), occurredAt, createdAt: occurredAt, updatedAt: occurredAt };
}
