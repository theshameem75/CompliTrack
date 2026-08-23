import test from 'node:test';
import assert from 'node:assert/strict';
import { STATUS, transitionAssignment, assignmentsForRole, nextCompletionStatus, verifyCompletion, certificateState, reminderDue, accessDecision, evaluateCompliance, makeAuditEvent } from './compliance-domain.js';

const now = new Date('2026-08-20T00:00:00Z');

test('enforces the assignment workflow', () => {
  const started = transitionAssignment({ status: STATUS.ASSIGNED }, STATUS.IN_PROGRESS, 'employee', now);
  assert.equal(started.status, STATUS.IN_PROGRESS);
  assert.throws(() => transitionAssignment(started, STATUS.ISSUED, 'employee', now));
});

test('role changes deactivate obsolete assignments and create each required assignment once', () => {
  const employee = { id: 'e1', organizationId: 'o1', role: 'Manager' };
  const courses = [{ id: 'c1', organizationId: 'o1', isActive: true, requiredRoles: ['Manager'] }, { id: 'foreign', organizationId: 'o2', isActive: true, requiredRoles: ['Manager'] }];
  const existing = [{ id: 'old', organizationId: 'o1', employeeId: 'e1', courseId: 'c0', sourceRole: 'Employee', status: STATUS.ASSIGNED, isActive: true }];
  const once = assignmentsForRole(courses, employee, existing, { autoAssignOnRoleChange: true }, now, () => 'new');
  const twice = assignmentsForRole(courses, employee, once, { autoAssignOnRoleChange: true }, now, () => 'duplicate');
  assert.equal(once.find(item => item.id === 'old').isActive, false);
  assert.equal(twice.filter(item => item.courseId === 'c1').length, 1);
  assert.equal(twice.some(item => item.courseId === 'foreign'), false);
});

test('manager verification is configurable and self-verification is denied', () => {
  assert.equal(nextCompletionStatus({ managerVerificationRequired: true }), STATUS.VERIFY);
  assert.equal(nextCompletionStatus({ managerVerificationRequired: false }), STATUS.ISSUED);
  assert.throws(() => verifyCompletion({ employeeId: 'e1' }, 'e1', true, '', now));
  assert.equal(verifyCompletion({ employeeId: 'e1' }, 'm1', true, '', now).verificationStatus, 'Approved');
});

test('certificate reminders are threshold-based and idempotent', () => {
  const certificate = { expiresAt: '2026-09-19T00:00:00Z', sentReminderDays: [] };
  assert.equal(reminderDue(certificate, [60, 30, 7], now), 30);
  assert.equal(reminderDue({ ...certificate, sentReminderDays: [30] }, [60, 30, 7], now), null);
  assert.equal(certificateState(certificate, { reminderDays: [60, 30, 7] }, now), 'Expiring');
});

test('restriction starts after grace and active replacement restores access', () => {
  const settings = { gracePeriodDays: 7, restrictedRoleSlug: 'restricted-user' };
  const expired = [{ employeeId: 'e1', expiresAt: '2026-08-10T00:00:00Z', status: 'Expired' }];
  assert.equal(accessDecision(expired, 'e1', settings, new Date('2026-08-17T00:00:00Z')).restricted, false);
  assert.equal(accessDecision(expired, 'e1', settings, now).restricted, true);
  assert.equal(accessDecision(expired.concat({ employeeId: 'e1', expiresAt: '2027-01-01T00:00:00Z', status: 'Active' }), 'e1', settings, now).restore, true);
});

test('audit events carry tenant ownership and timestamps', () => {
  const event = makeAuditEvent({ organizationId: 'o1', actorId: 'e1', action: 'assignment.started', entityType: 'CourseAssignment', entityId: 'a1', now });
  assert.equal(event.organizationId, 'o1'); assert.equal(event.occurredAt, now.toISOString());
});

test('compliance engine evaluates every active required course', () => {
  const assignments = [
    { employeeId: 'e1', courseId: 'c1', isActive: true },
    { employeeId: 'e1', courseId: 'c2', isActive: true },
  ];
  const certificates = [{ employeeId: 'e1', courseId: 'c1', status: 'Active', expiresAt: '2027-01-01T00:00:00Z' }];
  const result = evaluateCompliance(assignments, certificates, 'e1', { gracePeriodDays: 7, autoRestrictNonCompliant: true, reminderDays: [60, 30, 7] }, now);
  assert.equal(result.score, 50);
  assert.equal(result.status, 'Restricted');
});
