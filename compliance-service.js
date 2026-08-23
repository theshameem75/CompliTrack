import { blocks } from "./blocks-client.js";
import { apiResponseMessage } from "./api-response.js";

const fields = {
  Course: ["organizationId", "createdAt", "updatedAt", "name", "code", "localizedNameKey", "description", "category", "trainingType", "provider", "department", "requiredRoles", "supportedLanguages", "durationMinutes", "validityDays", "isMandatory", "managerVerificationRequired", "renewalCourseId", "certificateTemplateId", "isActive"],
  CourseRequirement: ["organizationId", "courseId", "ruleType", "attribute", "operator", "values", "effectiveFrom", "effectiveUntil", "isActive", "createdAt", "updatedAt"],
  CourseAssignment: ["organizationId", "createdAt", "updatedAt", "courseId", "employeeId", "assignedBy", "sourceRole", "assignmentSource", "status", "isActive", "assignedAt", "startedAt", "completedAt", "dueAt", "cancellationReason", "lastReminderAt"],
  Completion: ["organizationId", "createdAt", "updatedAt", "assignmentId", "courseId", "employeeId", "completedAt", "completionMethod", "evidenceFileId", "score", "passed", "trainerId", "notes", "verificationStatus", "verifiedBy", "verifiedAt", "rejectionReason"],
  Verification: ["organizationId", "completionId", "assignmentId", "employeeId", "verifierId", "status", "comments", "verifiedAt", "createdAt", "updatedAt"],
  Certificate: ["organizationId", "createdAt", "updatedAt", "completionId", "employeeId", "courseId", "certificateNumber", "issuedAt", "issuedBy", "expiresAt", "status", "pdfFileId", "templateId", "verificationCode", "sentReminderDays", "revokedAt", "revokedReason"],
  ComplianceStatus: ["organizationId", "employeeId", "status", "score", "requiredCount", "validCount", "graceEndsAt", "evaluatedAt", "createdAt", "updatedAt"],
  ComplianceHistory: ["organizationId", "employeeId", "previousStatus", "newStatus", "previousScore", "newScore", "reason", "correlationId", "occurredAt", "createdAt"],
  AccessRestriction: ["organizationId", "employeeId", "status", "reason", "originalRoles", "restrictedRoleSlug", "restrictedAt", "restoredAt", "correlationId", "createdAt", "updatedAt"],
  ComplianceNotification: ["organizationId", "recipientId", "eventType", "entityType", "entityId", "channel", "status", "deduplicationKey", "scheduledAt", "sentAt", "failureReason", "createdAt", "updatedAt"],
  ComplianceOrgSettings: ["organizationId", "createdAt", "updatedAt", "gracePeriodDays", "autoAssignOnRoleChange", "managerVerificationRequired", "autoRestrictNonCompliant", "autoRestoreAccess", "reminderDays", "defaultLocale", "restrictedRoleSlug"],
  ComplianceAuditEvent: ["organizationId", "createdAt", "updatedAt", "actorId", "action", "entityType", "entityId", "metadata", "occurredAt"],
};

const collection = (name) => blocks.data.collection(name, { fields: fields[name] });

async function listIrregular(name, candidates, options = {}) {
  const selectedFields = ["ItemId", ...fields[name]].join("\n        ");
  const input = {
    pageNo: options.pageNo ?? 1,
    pageSize: options.pageSize ?? 20,
    filter: options.filter && (typeof options.filter === "string" ? options.filter : JSON.stringify(options.filter)),
    sort: options.sort && (typeof options.sort === "string" ? options.sort : JSON.stringify(options.sort)),
  };
  let lastResult;
  for (const field of candidates) {
    try {
      const result = await blocks.data.graphql({
        operationName: field,
        query: `query ${field}($input: DynamicQueryInput) {
  ${field}(input: $input) {
    items {
        ${selectedFields}
    }
    totalCount
  }
}`,
        variables: { input },
      });
      lastResult = result;
      const messages = (result?.errors || []).map((error) => error.message || "");
      if (!messages.some((value) => value.includes(`Field \`${field}\` does not exist`))) return result;
    } catch (error) {
      const messages = (error?.body?.errors || []).map((item) => item.message || "");
      if (!messages.some((value) => value.includes(`Field \`${field}\` does not exist`))) throw error;
      lastResult = error.body;
    }
  }
  return lastResult;
}

const irregularCollection = (name, candidates) => ({
  ...collection(name),
  list: (options) => listIrregular(name, candidates, options),
});

const data = Object.freeze({
  courses: collection("Course"),
  requirements: collection("CourseRequirement"),
  assignments: collection("CourseAssignment"),
  completions: collection("Completion"),
  verifications: collection("Verification"),
  certificates: collection("Certificate"),
  complianceStatuses: irregularCollection("ComplianceStatus", ["getComplianceStatuses", "getComplianceStatus"]),
  complianceHistory: irregularCollection("ComplianceHistory", ["getComplianceHistories", "getComplianceHistory"]),
  accessRestrictions: collection("AccessRestriction"),
  notifications: collection("ComplianceNotification"),
  settings: irregularCollection("ComplianceOrgSettings", ["getComplianceOrgSettings", "getComplianceOrgSettingses"]),
  audit: collection("ComplianceAuditEvent"),
});
const nowIso = () => new Date().toISOString();
let latestApiMessage = "";
const checked = (result) => {
  if (Array.isArray(result?.errors) && result.errors.length)
    throw new Error(
      result.errors.map((error) => error.message || String(error)).join("; "),
    );
  const message = apiResponseMessage(result, "");
  if (message) latestApiMessage = message;
  return result;
};
export function consumeApiMessage(fallback) {
  const message = latestApiMessage || fallback;
  latestApiMessage = "";
  return message;
}
const unwrap = (result) => {
  result = checked(result);
  const findItems = (value) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return undefined;
    if (Array.isArray(value.items)) return value.items;
    for (const child of Object.values(value)) {
      const items = findItems(child);
      if (items) return items;
    }
  };
  return findItems(result) || [];
};
const itemId = (item) => {
  if (!item || typeof item !== "object") return undefined;
  const direct = item.itemId || item.ItemId || item.id;
  if (direct) return direct;
  for (const value of Object.values(item)) {
    const nested = itemId(value);
    if (nested) return nested;
  }
};

async function optionalList(request, label) {
  try {
    return unwrap(await request);
  } catch (error) {
    console.warn(`${label} is unavailable for the current user`, error);
    return [];
  }
}

async function audit(
  organizationId,
  actorId,
  action,
  entityType,
  entityId,
  metadata = {},
) {
  const occurredAt = nowIso();
  return data.audit.create({
    organizationId,
    actorId,
    action,
    entityType,
    entityId,
    metadata: JSON.stringify(metadata),
    occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  });
}

export async function loadDashboard() {
  const [courses, assignments, completions, certificates, settings, complianceStatuses] =
    await Promise.all([
      data.courses.list({ pageNo: 1, pageSize: 100 }),
      data.assignments.list({ pageNo: 1, pageSize: 100 }),
      data.completions.list({ pageNo: 1, pageSize: 100 }),
      data.certificates.list({ pageNo: 1, pageSize: 100 }),
      optionalList(data.settings.list({ pageNo: 1, pageSize: 10 }), "Organization settings"),
      optionalList(data.complianceStatuses.list({ pageNo: 1, pageSize: 200 }), "Compliance status"),
    ]);
  return {
    courses: unwrap(courses),
    assignments: unwrap(assignments),
    completions: unwrap(completions),
    certificates: unwrap(certificates),
    settings: Array.isArray(settings) ? settings : unwrap(settings),
    complianceStatuses: Array.isArray(complianceStatuses) ? complianceStatuses : unwrap(complianceStatuses),
  };
}

export const listCourses = async () =>
  unwrap(await data.courses.list({ pageNo: 1, pageSize: 200 }));
export const listAssignments = async () =>
  unwrap(await data.assignments.list({ pageNo: 1, pageSize: 200 }));
export const listCompletions = async () =>
  unwrap(await data.completions.list({ pageNo: 1, pageSize: 200 }));
export const listCertificates = async () =>
  unwrap(await data.certificates.list({ pageNo: 1, pageSize: 200 }));
export const listSettings = async () =>
  unwrap(await data.settings.list({ pageNo: 1, pageSize: 20 }));

export async function saveCourse(course, actor) {
  const timestamp = nowIso(),
    payload = {
      ...course,
      durationMinutes: Number(course.durationMinutes),
      validityDays: Number(course.validityDays),
      isMandatory: course.isMandatory !== false,
      managerVerificationRequired: course.managerVerificationRequired !== false,
      supportedLanguages: Array.isArray(course.supportedLanguages)
        ? course.supportedLanguages
        : String(course.supportedLanguages || "en-US").split(",").map((value) => value.trim()).filter(Boolean),
      requiredRoles: Array.isArray(course.requiredRoles)
        ? course.requiredRoles
        : String(course.requiredRoles || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
      isActive: course.isActive !== false,
      updatedAt: timestamp,
    };
  const id = itemId(course);
  const result = id
    ? await data.courses.update(id, payload)
    : await data.courses.create({ ...payload, createdAt: timestamp });
  await audit(
    course.organizationId,
    actor,
    id ? "course.updated" : "course.created",
    "Course",
    id || itemId(result),
  );
  return checked(result);
}

export async function assignCourse({
  courseId,
  employeeId,
  organizationId,
  assignedBy,
  sourceRole = "Manual",
  dueAt,
}) {
  const timestamp = nowIso();
  const result = await data.assignments.create({
    organizationId,
    courseId,
    employeeId,
    assignedBy,
    sourceRole,
    assignmentSource: sourceRole === "Manual" ? "Manual Assignment" : "Role Policy",
    status: "Assigned",
    isActive: true,
    assignedAt: timestamp,
    dueAt,
    lastReminderAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await audit(
    organizationId,
    assignedBy,
    "course.assigned",
    "CourseAssignment",
    itemId(result),
    { courseId, employeeId },
  );
  return checked(result);
}

export async function changeEmployeeRole({
  employee,
  role,
  organizationId,
  actorId,
  autoAssign = true,
}) {
  const employeeId = itemId(employee);
  await blocks.iam.users.update(employeeId, { roles: [role], organizationId });
  if (autoAssign) {
    const [courses, assignments] = await Promise.all([
      listCourses(),
      listAssignments(),
    ]);
    const timestamp = nowIso();
    const existing = assignments.filter((item) => item.employeeId === employeeId);
    const activeIds = new Set(
      existing
        .filter((item) => item.sourceRole === role && item.isActive !== false)
        .map((item) => item.courseId),
    );
    await Promise.all(
      existing
        .filter(
          (item) =>
            item.sourceRole !== role &&
            item.status !== "CertificateIssued" &&
            item.isActive !== false,
        )
        .map((item) =>
          data.assignments.update(itemId(item), {
            isActive: false,
            updatedAt: timestamp,
          }),
        ),
    );
    await Promise.all(
      courses
        .filter(
          (course) =>
            course.organizationId === organizationId &&
            course.isActive &&
            course.requiredRoles?.includes(role) &&
            !activeIds.has(itemId(course)),
        )
        .map((course) =>
          assignCourse({
            courseId: itemId(course),
            employeeId,
            organizationId,
            assignedBy: actorId,
            sourceRole: role,
            dueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          }),
        ),
    );
  }
  await audit(organizationId, actorId, "employee.role.changed", "User", employeeId, { role });
}

export async function saveOrgSettings(settings, actorId) {
  const timestamp = nowIso(),
    id = itemId(settings);
  const payload = {
    ...settings,
    gracePeriodDays: Number(settings.gracePeriodDays),
    reminderDays: Array.isArray(settings.reminderDays)
      ? settings.reminderDays.map(Number)
      : String(settings.reminderDays || "60,30,7")
          .split(",")
          .map(Number),
    autoAssignOnRoleChange: Boolean(settings.autoAssignOnRoleChange),
    managerVerificationRequired: Boolean(settings.managerVerificationRequired),
    autoRestrictNonCompliant: Boolean(settings.autoRestrictNonCompliant),
    autoRestoreAccess: Boolean(settings.autoRestoreAccess),
    updatedAt: timestamp,
  };
  const result = id
    ? await data.settings.update(id, payload)
    : await data.settings.create({ ...payload, createdAt: timestamp });
  await audit(
    settings.organizationId,
    actorId,
    "settings.saved",
    "ComplianceOrgSettings",
    id || itemId(result),
  );
  return checked(result);
}

export async function uploadEvidence(file) {
  const upload = checked(
    await blocks.data.files.presignedUploadUrl({
      name: file.name,
      configurationName: "default",
      parentDirectoryId: "root",
      accessModifier: "Private",
      contentType: file.type,
    }),
  );
  const details = upload?.data || upload;
  await blocks.data.files.uploadToUrl({
    url: details.uploadUrl,
    body: file,
    contentType: file.type,
  });
  return details.fileId || details.itemId;
}

export async function revokeCertificate(certificate, actorId, reason) {
  const timestamp = nowIso(),
    id = itemId(certificate);
  const result = await data.certificates.update(id, {
    status: "Revoked",
    revokedAt: timestamp,
    revokedReason: reason,
    updatedAt: timestamp,
  });
  await audit(
    certificate.organizationId,
    actorId,
    "certificate.revoked",
    "Certificate",
    id,
    { reason },
  );
  return checked(result);
}

export async function applyRestrictedAccess({
  userId,
  organizationId,
  restrictedRoleSlug,
  restoreRoles,
  actorId,
}) {
  const request = restoreRoles?.length
    ? { userId, organizationId, roles: restoreRoles }
    : { userId, organizationId, roles: [restrictedRoleSlug] };
  const result = await blocks.iam.users.updateAccess(request);
  await audit(
    organizationId,
    actorId,
    restoreRoles?.length ? "access.restored" : "access.restricted",
    "User",
    userId,
    { roles: request.roles },
  );
  return checked(result);
}

export const getNotifications = (options) =>
  blocks.notifier.getNotifications(options);
export const markNotificationRead = (id) =>
  blocks.notifier.markNotificationAsRead({ id });
export const markAllNotificationsRead = () =>
  blocks.notifier.markAllNotificationAsRead();

export async function startAssignment(assignment, actorId) {
  if (
    assignment.employeeId !== actorId ||
    !["Assigned", "Overdue", "Restricted"].includes(assignment.status)
  )
    throw new Error(
      "This assignment cannot be started by the current employee.",
    );
  const updatedAt = nowIso(),
    id = assignment.id || assignment.itemId;
  const result = await data.assignments.update(id, {
    status: "InProgress",
    startedAt: updatedAt,
    updatedAt,
  });
  await audit(
    assignment.organizationId,
    actorId,
    "assignment.started",
    "CourseAssignment",
    id,
  );
  return result;
}

export async function submitCompletion(
  assignment,
  actorId,
  evidenceFileId,
  score,
  notes = "",
) {
  if (assignment.employeeId !== actorId || assignment.status !== "InProgress")
    throw new Error(
      "Only the assigned employee can complete in-progress training.",
    );
  const completedAt = nowIso(),
    assignmentId = assignment.id || assignment.itemId;
  const completion = await data.completions.create({
    organizationId: assignment.organizationId,
    assignmentId,
    courseId: assignment.courseId,
    employeeId: actorId,
    completedAt,
    evidenceFileId,
    score,
    passed: score >= 0,
    completionMethod: evidenceFileId ? "Evidence" : "Self Attested",
    notes,
    verificationStatus: "Pending",
    createdAt: completedAt,
    updatedAt: completedAt,
  });
  await data.assignments.update(assignmentId, {
    status: "Completed",
    completedAt,
    updatedAt: completedAt,
  });
  await audit(
    assignment.organizationId,
    actorId,
    "completion.submitted",
    "Completion",
    completion.id || completion.itemId,
    { assignmentId },
  );
  return completion;
}

export async function verifyCompletion({
  completion,
  assignment,
  managerId,
  approved,
  reason = "",
}) {
  if (completion.employeeId === managerId)
    throw new Error("Employees cannot verify their own completion.");
  const verifiedAt = nowIso(),
    completionId = completion.id || completion.itemId,
    assignmentId = assignment.id || assignment.itemId;
  await data.completions.update(completionId, {
    verificationStatus: approved ? "Approved" : "Rejected",
    verifiedBy: managerId,
    verifiedAt,
    rejectionReason: approved ? null : reason,
    updatedAt: verifiedAt,
  });
  await data.assignments.update(assignmentId, {
    status: approved ? "ManagerVerification" : "InProgress",
    updatedAt: verifiedAt,
  });
  await data.verifications.create({
    organizationId: assignment.organizationId,
    completionId,
    assignmentId,
    employeeId: completion.employeeId,
    verifierId: managerId,
    status: approved ? "Approved" : "Rejected",
    comments: reason,
    verifiedAt,
    createdAt: verifiedAt,
    updatedAt: verifiedAt,
  });
  await audit(
    assignment.organizationId,
    managerId,
    approved ? "completion.approved" : "completion.rejected",
    "Completion",
    completionId,
    { reason },
  );
  return approved;
}

export async function issueCertificate({
  completion,
  assignment,
  course,
  settings,
  issuerId,
  pdfFileId,
}) {
  if (
    settings.managerVerificationRequired &&
    completion.verificationStatus !== "Approved"
  )
    throw new Error(
      "Manager verification is required before certificate issuance.",
    );
  const issuedAt = nowIso();
  const certificate = await data.certificates.create({
    organizationId: assignment.organizationId,
    completionId: completion.id || completion.itemId,
    employeeId: completion.employeeId,
    courseId: assignment.courseId,
    certificateNumber: crypto.randomUUID(),
    issuedAt,
    issuedBy: issuerId,
    expiresAt: new Date(
      Date.now() + course.validityDays * 86_400_000,
    ).toISOString(),
    status: "Active",
    pdfFileId,
    templateId: course.certificateTemplateId || null,
    verificationCode: crypto.randomUUID(),
    sentReminderDays: [],
    createdAt: issuedAt,
    updatedAt: issuedAt,
  });
  await data.assignments.update(assignment.id || assignment.itemId, {
    status: "CertificateIssued",
    updatedAt: issuedAt,
  });
  await audit(
    assignment.organizationId,
    issuerId,
    "certificate.issued",
    "Certificate",
    certificate.id || certificate.itemId,
    { completionId: completion.id || completion.itemId },
  );
  return certificate;
}

export const notifyManager = (userIds, assignmentId) =>
  blocks.notifier.notify({
    userIds,
    denormalizedPayload: JSON.stringify({
      type: "manager-verification-pending",
      assignmentId,
    }),
    saveDenormalizedPayloadAsAnObject: true,
  });
export const sendComplianceMail = (
  to,
  purpose,
  language = "en-US",
  context = {},
) => blocks.mail.send({ to, purpose, language, subjectDataContext: context });
export async function loadLocale(locale = "en-US") {
  await blocks.localization.load(locale, ["complitrack"]);
  return (key, fallback) => blocks.localization.t(key, fallback);
}
