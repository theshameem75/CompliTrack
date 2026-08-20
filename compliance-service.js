import { blocks } from './blocks-client.js';

const data = Object.freeze({
  courses: blocks.data.collection('Course'), assignments: blocks.data.collection('CourseAssignment'),
  completions: blocks.data.collection('Completion'), certificates: blocks.data.collection('Certificate'),
  settings: blocks.data.collection('ComplianceOrgSettings'), audit: blocks.data.collection('ComplianceAuditEvent')
});
const nowIso = () => new Date().toISOString();
const unwrap = result => result?.items || result?.data?.items || result?.data || result || [];

async function audit(organizationId, actorId, action, entityType, entityId, metadata = {}) {
  const occurredAt = nowIso();
  return data.audit.create({ organizationId, actorId, action, entityType, entityId, metadata: JSON.stringify(metadata), occurredAt, createdAt: occurredAt, updatedAt: occurredAt });
}

export async function loadDashboard() {
  const [courses, assignments, certificates] = await Promise.all([data.courses.list({ pageNo: 1, pageSize: 100 }), data.assignments.list({ pageNo: 1, pageSize: 100 }), data.certificates.list({ pageNo: 1, pageSize: 100 })]);
  return { courses: unwrap(courses), assignments: unwrap(assignments), certificates: unwrap(certificates) };
}

export async function startAssignment(assignment, actorId) {
  if (assignment.employeeId !== actorId || !['Assigned', 'Overdue', 'Restricted'].includes(assignment.status)) throw new Error('This assignment cannot be started by the current employee.');
  const updatedAt = nowIso(), id = assignment.id || assignment.itemId;
  const result = await data.assignments.update(id, { status: 'InProgress', updatedAt });
  await audit(assignment.organizationId, actorId, 'assignment.started', 'CourseAssignment', id);
  return result;
}

export async function submitCompletion(assignment, actorId, evidenceFileId, score, notes = '') {
  if (assignment.employeeId !== actorId || assignment.status !== 'InProgress') throw new Error('Only the assigned employee can complete in-progress training.');
  const completedAt = nowIso(), assignmentId = assignment.id || assignment.itemId;
  const completion = await data.completions.create({ organizationId: assignment.organizationId, assignmentId, employeeId: actorId, completedAt, evidenceFileId, score, notes, verificationStatus: 'Pending', createdAt: completedAt, updatedAt: completedAt });
  await data.assignments.update(assignmentId, { status: 'Completed', updatedAt: completedAt });
  await audit(assignment.organizationId, actorId, 'completion.submitted', 'Completion', completion.id || completion.itemId, { assignmentId });
  return completion;
}

export async function verifyCompletion({ completion, assignment, managerId, approved, reason = '' }) {
  if (completion.employeeId === managerId) throw new Error('Employees cannot verify their own completion.');
  const verifiedAt = nowIso(), completionId = completion.id || completion.itemId, assignmentId = assignment.id || assignment.itemId;
  await data.completions.update(completionId, { verificationStatus: approved ? 'Approved' : 'Rejected', verifiedBy: managerId, verifiedAt, notes: approved ? completion.notes : reason, updatedAt: verifiedAt });
  await data.assignments.update(assignmentId, { status: approved ? 'ManagerVerification' : 'InProgress', updatedAt: verifiedAt });
  await audit(assignment.organizationId, managerId, approved ? 'completion.approved' : 'completion.rejected', 'Completion', completionId, { reason });
  return approved;
}

export async function issueCertificate({ completion, assignment, course, settings, issuerId, pdfFileId }) {
  if (settings.managerVerificationRequired && completion.verificationStatus !== 'Approved') throw new Error('Manager verification is required before certificate issuance.');
  const issuedAt = nowIso();
  const certificate = await data.certificates.create({ organizationId: assignment.organizationId, completionId: completion.id || completion.itemId, employeeId: completion.employeeId, courseId: assignment.courseId, certificateNumber: crypto.randomUUID(), issuedAt, expiresAt: new Date(Date.now() + course.validityDays * 86_400_000).toISOString(), status: 'Active', pdfFileId, createdAt: issuedAt, updatedAt: issuedAt });
  await data.assignments.update(assignment.id || assignment.itemId, { status: 'CertificateIssued', updatedAt: issuedAt });
  await audit(assignment.organizationId, issuerId, 'certificate.issued', 'Certificate', certificate.id || certificate.itemId, { completionId: completion.id || completion.itemId });
  return certificate;
}

export const notifyManager = (userIds, assignmentId) => blocks.notifier.notify({ userIds, denormalizedPayload: JSON.stringify({ type: 'manager-verification-pending', assignmentId }), saveDenormalizedPayloadAsAnObject: true });
export const sendComplianceMail = (to, purpose, language = 'en-US', context = {}) => blocks.mail.send({ to, purpose, language, subjectDataContext: context });
export async function loadLocale(locale = 'en-US') { await blocks.localization.load(locale, ['complitrack']); return (key, fallback) => blocks.localization.t(key, fallback); }
