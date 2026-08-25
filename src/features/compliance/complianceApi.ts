import { blocksClient } from "../../lib/blocks/client";
import { daysFromNow } from "./compliance-domain";

type DataRecord = Record<string, unknown> & { ItemId?: string; id?: string; itemId?: string };

export type Course = DataRecord & {
  certificateTemplate?: string;
  code?: string;
  department?: string;
  description?: string;
  durationMinutes?: number;
  isActive?: boolean;
  localizedLabels?: string;
  targetRoles?: string[];
  title?: string;
  validityDays?: number;
};

export type CourseAssignment = DataRecord & {
  assignedAt?: string;
  assignedBy?: string;
  autoAssigned?: boolean;
  courseId?: string;
  courseTitle?: string;
  department?: string;
  dueAt?: string;
  role?: string;
  status?: string;
  userEmail?: string;
  userId?: string;
  userName?: string;
};

export type Completion = DataRecord & {
  assignmentId?: string;
  completedAt?: string;
  courseId?: string;
  managerNote?: string;
  progressPercent?: number;
  startedAt?: string;
  status?: string;
  userId?: string;
  verifiedAt?: string;
  verifiedBy?: string;
};

export type Certificate = DataRecord & {
  certificateNumber?: string;
  completionId?: string;
  courseId?: string;
  courseTitle?: string;
  expiresAt?: string;
  graceEndsAt?: string;
  issuedAt?: string;
  pdfFileId?: string;
  revokedAt?: string;
  revokedBy?: string;
  status?: string;
  userEmail?: string;
  userId?: string;
  userName?: string;
};

export type ComplianceSetting = DataRecord & {
  autoAssignOnRoleChange?: boolean;
  complianceLabel?: string;
  defaultLanguage?: string;
  gracePeriodDays?: number;
  managerVerificationRequired?: boolean;
  organizationId?: string;
  reminderDays?: number[];
  restrictedRoleSlug?: string;
};

const courseFields = ["title", "code", "description", "department", "targetRoles", "durationMinutes", "validityDays", "certificateTemplate", "localizedLabels", "isActive"];
const assignmentFields = ["courseId", "courseTitle", "userId", "userName", "userEmail", "role", "department", "status", "assignedAt", "dueAt", "assignedBy", "autoAssigned"];
const completionFields = ["assignmentId", "courseId", "userId", "status", "progressPercent", "startedAt", "completedAt", "verifiedAt", "verifiedBy", "managerNote"];
const certificateFields = ["certificateNumber", "courseId", "courseTitle", "completionId", "userId", "userName", "userEmail", "issuedAt", "expiresAt", "graceEndsAt", "status", "pdfFileId", "revokedAt", "revokedBy"];
const settingFields = ["organizationId", "gracePeriodDays", "autoAssignOnRoleChange", "managerVerificationRequired", "reminderDays", "defaultLanguage", "complianceLabel", "restrictedRoleSlug"];

const courses = blocksClient.data.collection<Course>("Course", { fields: courseFields });
const assignments = blocksClient.data.collection<CourseAssignment>("CourseAssignment", { fields: assignmentFields });
const completions = blocksClient.data.collection<Completion>("Completion", { fields: completionFields });
const certificates = blocksClient.data.collection<Certificate>("Certificate", { fields: certificateFields });
const settings = blocksClient.data.collection<ComplianceSetting>("ComplianceSetting", { fields: settingFields });

export const listCourses = () => listAll(courses.list({ pageNo: 1, pageSize: 200 }), "getCourses") as Promise<Course[]>;
export const listAssignments = () => listAll(assignments.list({ pageNo: 1, pageSize: 500 }), "getCourseAssignments") as Promise<CourseAssignment[]>;
export const listCompletions = () => listAll(completions.list({ pageNo: 1, pageSize: 500 }), "getCompletions") as Promise<Completion[]>;
export const listCertificates = () => listAll(certificates.list({ pageNo: 1, pageSize: 500 }), "getCertificates") as Promise<Certificate[]>;
export const listSettings = () => listAll(settings.list({ pageNo: 1, pageSize: 20 }), "getComplianceSettings") as Promise<ComplianceSetting[]>;

export function createCourse(input: Omit<Course, keyof DataRecord>) {
  return courses.create(input);
}

export function createAssignment(input: Omit<CourseAssignment, keyof DataRecord>) {
  return assignments.create(input);
}

export function updateAssignment(input: CourseAssignment) {
  return assignments.update(recordId(input), withoutIds(input));
}

export function createCompletion(input: Omit<Completion, keyof DataRecord>) {
  return completions.create(input);
}

export function updateCompletion(input: Completion) {
  return completions.update(recordId(input), withoutIds(input));
}

export function createCertificate(input: Omit<Certificate, keyof DataRecord>) {
  return certificates.create(input);
}

export function updateCertificate(input: Certificate) {
  return certificates.update(recordId(input), withoutIds(input));
}

export async function saveSettings(input: ComplianceSetting) {
  if (input.ItemId || input.itemId || input.id) return settings.update(recordId(input), withoutIds(input));
  return settings.create(input);
}

export async function startAssignment(assignment: CourseAssignment) {
  const updated = { ...assignment, status: "In Progress" };
  await updateAssignment(updated);
  await createCompletion({
    assignmentId: recordId(assignment),
    courseId: assignment.courseId,
    progressPercent: 1,
    startedAt: new Date().toISOString(),
    status: "In Progress",
    userId: assignment.userId
  });
}

export async function finishAssignment(assignment: CourseAssignment, completion?: Completion, requireManager = true) {
  const status = requireManager ? "Manager Verification" : "Completed";
  await updateAssignment({ ...assignment, status });
  if (completion) {
    await updateCompletion({ ...completion, completedAt: new Date().toISOString(), progressPercent: 100, status: "Completed" });
  } else {
    await createCompletion({
      assignmentId: recordId(assignment),
      completedAt: new Date().toISOString(),
      courseId: assignment.courseId,
      progressPercent: 100,
      startedAt: new Date().toISOString(),
      status: "Completed",
      userId: assignment.userId
    });
  }
}

export async function verifyAndIssue({ assignment, completion, course, graceDays, verifier }: { assignment: CourseAssignment; completion: Completion; course?: Course; graceDays: number; verifier: string }) {
  const issuedAt = new Date().toISOString();
  const expiresAt = daysFromNow(Number(course?.validityDays ?? 365));
  const graceEnds = new Date(expiresAt);
  graceEnds.setDate(graceEnds.getDate() + graceDays);
  await updateCompletion({ ...completion, managerNote: "Verified", status: "Verified", verifiedAt: issuedAt, verifiedBy: verifier });
  await updateAssignment({ ...assignment, status: "Certificate Issued" });
  return createCertificate({
    certificateNumber: `CT-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
    completionId: recordId(completion),
    courseId: assignment.courseId,
    courseTitle: assignment.courseTitle,
    expiresAt,
    graceEndsAt: graceEnds.toISOString(),
    issuedAt,
    status: "Active",
    userEmail: assignment.userEmail,
    userId: assignment.userId,
    userName: assignment.userName
  });
}

export async function sendLifecycleMessage(event: "assigned" | "completed" | "certificate" | "expiry", data: { courseTitle?: string; days?: number; email?: string; userId?: string }) {
  const purpose = `complitrack-${event}`;
  const context = { courseTitle: data.courseTitle ?? "Training", days: String(data.days ?? "") };
  const calls: Promise<unknown>[] = [];
  if (data.email) calls.push(blocksClient.mail.send({ to: [data.email], purpose, language: "en-US", subjectDataContext: context, bodyDataContext: context }));
  if (data.userId) calls.push(blocksClient.notifier.notify({ userIds: [data.userId], denormalizedPayload: JSON.stringify({ context: "compliance", event, ...context }), saveDenormalizedPayloadAsAnObject: true }));
  if (event === "completed") calls.push(blocksClient.notifier.notify({ roles: ["manager"], denormalizedPayload: JSON.stringify({ context: "compliance", event, ...context }), saveDenormalizedPayloadAsAnObject: true }));
  await Promise.allSettled(calls);
}

export function recordId(record: DataRecord): string {
  const id = record.ItemId ?? record.itemId ?? record.id;
  if (!id) throw new Error("Blocks record id is missing.");
  return String(id);
}

function withoutIds<T extends DataRecord>(record: T): Omit<T, keyof DataRecord> {
  const copy = { ...record };
  delete copy.ItemId;
  delete copy.itemId;
  delete copy.id;
  return copy;
}

async function listAll(request: Promise<unknown>, key: string): Promise<DataRecord[]> {
  const response = await request as { data?: Record<string, unknown> | DataRecord[]; items?: DataRecord[] };
  if (Array.isArray(response.data)) return response.data;
  const data = response.data as Record<string, unknown> | undefined;
  const gateway = data?.[key] as { items?: DataRecord[] } | undefined;
  return gateway?.items ?? (data?.items as DataRecord[] | undefined) ?? response.items ?? [];
}
