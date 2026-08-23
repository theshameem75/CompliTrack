import {
  blocks,
  ensureSession,
  logout as endSession,
} from "./blocks-client.js";
import * as api from "./compliance-service.js";
import { apiErrorMessage, apiResponseMessage } from "./api-response.js";

const content = document.querySelector(".content");
const toast = document.querySelector("#toast");
const state = {
  me: null,
  permissions: new Set(),
  data: null,
  t: (_key, fallback) => fallback,
};
const idOf = (item) => item?.itemId || item?.ItemId || item?.id;
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ],
  );
const date = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
const notify = (text, error = false) => {
  toast.textContent = text;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
};
const can = (permission) =>
  state.permissions.has(permission) || state.permissions.has("*");
const orgId = () =>
  state.me?.organizationId || state.me?.OrganizationId || "default";
const userId = () => idOf(state.me);
const statusBadge = (status) =>
  `<span class="status ${status === "Completed" || status === "CertificateIssued" ? "complete" : status === "Overdue" || status === "Restricted" ? "overdue" : status === "ManagerVerification" ? "verify" : "progress-status"}">${esc(status)}</span>`;
const empty = (text) =>
  `<div class="empty-state"><b>${esc(text)}</b><small>Records will appear here when they are available.</small></div>`;

function page(title, subtitle, action = "") {
  return `<div class="title-row"><div><div class="eyebrow">COMPLITRACK</div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${action}</div>`;
}
function table(headers, rows) {
  return `<section class="panel table-panel"><div class="table-scroll"><table><thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div></section>`;
}
function courseName(id) {
  return state.data.courses.find((course) => idOf(course) === id)?.name || id;
}

async function bootstrap() {
  if (!(await ensureSession())) {
    location.href = `/login?returnTo=${encodeURIComponent(location.pathname + location.hash)}`;
    return;
  }
  try {
    const me = await blocks.iam.me();
    state.me = me?.data || me;
    const permissions = state.me?.permissions || [];
    state.permissions = new Set(
      permissions.map((item) =>
        typeof item === "string" ? item : item.name || item.slug,
      ),
    );
    document
      .querySelectorAll(".profile b,.header-actions + b")
      .forEach((node) => {
        node.textContent =
          `${state.me.firstName || ""} ${state.me.lastName || ""}`.trim() ||
          state.me.email ||
          "User";
      });
    state.data = await api.loadDashboard();
    const locale =
      state.data.settings[0]?.defaultLocale || state.me?.language || "en-US";
    try {
      state.t = await api.loadLocale(locale);
    } catch (error) {
      console.warn("Using localization fallbacks", error);
    }
    bindShell();
    await route();
  } catch (error) {
    console.error(error);
    notify(error.message || "Unable to initialize CompliTrack", true);
  }
}

function bindShell() {
  document.querySelectorAll("nav a").forEach(
    (link) =>
      (link.onclick = (event) => {
        event.preventDefault();
        location.hash = link.hash;
      }),
  );
  window.addEventListener("hashchange", route);
  document.querySelector(".profile")?.addEventListener("click", logout);
  document
    .querySelector(".notification")
    ?.addEventListener("click", showNotifications);
}

async function logout() {
  await endSession().catch(() => undefined);
  location.href = "/login";
}

async function refresh() {
  state.data = await api.loadDashboard();
}

async function route() {
  const routeName = (location.hash || "#dashboard").slice(1);
  document
    .querySelectorAll("nav a")
    .forEach((link) =>
      link.classList.toggle("active", link.hash === `#${routeName}`),
    );
  const routes = {
    dashboard: renderDashboard,
    assignments: renderAssignments,
    certificates: renderCertificates,
    people: renderPeople,
    courses: renderCourses,
    reports: renderReports,
    settings: renderSettings,
  };
  const renderer = routes[routeName] || renderDashboard;
  try {
    await renderer();
  } catch (error) {
    console.error(error);
    renderError(routeName.replace(/(^|-)\w/g, (value) => value.toUpperCase()), error);
  }
}

async function renderDashboard() {
  const { assignments, certificates, completions } = state.data;
  const completed = assignments.filter(
    (item) => item.status === "CertificateIssued",
  ).length;
  const compliance = assignments.length
    ? Math.round((completed / assignments.length) * 1000) / 10
    : 100;
  const attention = assignments.filter((item) =>
    ["Overdue", "Restricted"].includes(item.status),
  ).length;
  const pending = completions.filter(
    (item) => item.verificationStatus === "Pending",
  ).length;
  content.innerHTML =
    page(
      state.t("dashboard.title", "Compliance dashboard"),
      "Live training and certification status across your organization.",
      can("course:assign")
        ? '<button class="primary" data-action="assign">＋ Assign training</button>'
        : "",
    ) +
    `<div class="stats"><article><div class="stat-top"><span>${esc(state.t("dashboard.overallCompliance", "Overall compliance"))}</span></div><strong>${compliance}%</strong><div class="progress"><i style="width:${compliance}%"></i></div></article><article><div class="stat-top"><span>${esc(state.t("dashboard.activeAssignments", "Active assignments"))}</span></div><strong>${assignments.length}</strong><small>${completed} certificate issued</small></article><article><div class="stat-top"><span>${esc(state.t("dashboard.attentionRequired", "Need attention"))}</span></div><strong>${attention}</strong><small>Overdue or restricted</small></article><article><div class="stat-top"><span>${esc(state.t("dashboard.pendingVerification", "Pending verification"))}</span></div><strong>${pending}</strong><small>Awaiting manager review</small></article></div>` +
    table(
      ["COURSE", "EMPLOYEE", "STATUS", "DUE"],
      assignments
        .slice(0, 10)
        .map(
          (item) =>
            `<tr><td>${esc(courseName(item.courseId))}</td><td>${esc(item.employeeId)}</td><td>${statusBadge(item.status)}</td><td>${date(item.dueAt)}</td></tr>`,
        ),
    );
  content
    .querySelector('[data-action="assign"]')
    ?.addEventListener("click", openAssignmentForm);
}

async function renderCourses() {
  const action = can("course:create")
    ? '<button class="primary" data-action="course">＋ New course</button>'
    : "";
  const rows = state.data.courses.map(
    (course) =>
      `<tr><td><b>${esc(course.name)}</b><small class="cell-sub">${esc(course.department)}</small></td><td>${esc((course.requiredRoles || []).join(", "))}</td><td>${esc(course.durationMinutes)} min</td><td>${esc(course.validityDays)} days</td><td>${course.isActive ? "Active" : "Inactive"}</td><td>${can("course:create") ? `<button class="outline" data-edit="${esc(idOf(course))}">Edit</button>` : ""}</td></tr>`,
  );
  content.innerHTML =
    page(
      "Courses",
      "Create and maintain mandatory training by role and department.",
      action,
    ) +
    (rows.length
      ? table(
          ["COURSE", "REQUIRED ROLES", "DURATION", "VALIDITY", "STATE", ""],
          rows,
        )
      : empty("No courses yet"));
  content
    .querySelector('[data-action="course"]')
    ?.addEventListener("click", () => openCourseForm());
  content
    .querySelectorAll("[data-edit]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          openCourseForm(
            state.data.courses.find(
              (course) => idOf(course) === button.dataset.edit,
            ),
          )),
    );
}

async function renderAssignments() {
  const rows = state.data.assignments.map((item) => {
    const completion = state.data.completions.find(
      (value) =>
        value.assignmentId === idOf(item) &&
        value.verificationStatus === "Pending",
    );
    return `<tr><td>${esc(courseName(item.courseId))}</td><td>${esc(item.employeeId)}</td><td>${statusBadge(item.status)}</td><td>${date(item.dueAt)}</td><td class="row-actions">${item.employeeId === userId() && ["Assigned", "Overdue", "Restricted"].includes(item.status) ? `<button class="outline" data-start="${esc(idOf(item))}">Start</button>` : ""}${item.employeeId === userId() && item.status === "InProgress" ? `<button class="primary small" data-complete="${esc(idOf(item))}">Complete</button>` : ""}${completion && can("course:verify") ? `<button class="primary small" data-approve="${esc(idOf(item))}" data-completion="${esc(idOf(completion))}">Approve</button><button class="outline danger" data-reject="${esc(idOf(item))}" data-completion="${esc(idOf(completion))}">Reject</button>` : ""}</td></tr>`;
  });
  content.innerHTML =
    page(
      "Assignments",
      "Follow assigned training from start through certification.",
      can("course:assign")
        ? '<button class="primary" data-action="assign">＋ Assign training</button>'
        : "",
    ) +
    (rows.length
      ? table(["COURSE", "EMPLOYEE", "STATUS", "DUE", "ACTION"], rows)
      : empty("No assignments"));
  content
    .querySelector('[data-action="assign"]')
    ?.addEventListener("click", openAssignmentForm);
  content.querySelectorAll("[data-start]").forEach(
    (button) =>
      (button.onclick = () =>
        run(async () => {
          const assignment = state.data.assignments.find(
            (item) => idOf(item) === button.dataset.start,
          );
          await api.startAssignment(assignment, userId());
          await refresh();
          await renderAssignments();
        }, "Assignment started")),
  );
  content
    .querySelectorAll("[data-complete]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          openCompletionForm(
            state.data.assignments.find(
              (item) => idOf(item) === button.dataset.complete,
            ),
          )),
    );
  content
    .querySelectorAll("[data-approve]")
    .forEach(
      (button) => (button.onclick = () => reviewCompletion(button, true)),
    );
  content
    .querySelectorAll("[data-reject]")
    .forEach(
      (button) => (button.onclick = () => reviewCompletion(button, false)),
    );
}

async function reviewCompletion(button, approved) {
  const assignment = state.data.assignments.find(
    (item) => idOf(item) === button.dataset[approved ? "approve" : "reject"],
  );
  const completion = state.data.completions.find(
    (item) => idOf(item) === button.dataset.completion,
  );
  const reason = approved ? "" : prompt("Reason for rejection");
  if (!approved && !reason) return;
  await run(
    async () => {
      await api.verifyCompletion({
        completion,
        assignment,
        managerId: userId(),
        approved,
        reason,
      });
      if (approved && can("certificate:issue")) {
        const course = state.data.courses.find(
            (item) => idOf(item) === assignment.courseId,
          ),
          settings = state.data.settings[0] || {
            managerVerificationRequired: true,
          };
        await api.issueCertificate({
          completion: { ...completion, verificationStatus: "Approved" },
          assignment,
          course,
          settings,
          issuerId: userId(),
          pdfFileId: null,
        });
      }
      await refresh();
      await renderAssignments();
    },
    approved ? "Completion approved" : "Completion rejected",
  );
}

async function renderCertificates() {
  const rows = state.data.certificates.map(
    (item) =>
      `<tr><td>${esc(item.certificateNumber)}</td><td>${esc(courseName(item.courseId))}</td><td>${esc(item.employeeId)}</td><td>${statusBadge(item.status)}</td><td>${date(item.expiresAt)}</td><td>${can("certificate:revoke") && item.status !== "Revoked" ? `<button class="outline danger" data-revoke="${esc(idOf(item))}">Revoke</button>` : ""}</td></tr>`,
  );
  content.innerHTML =
    page(
      "Certificates",
      "Issued, expiring, expired, and revoked certificates.",
    ) +
    (rows.length
      ? table(["NUMBER", "COURSE", "EMPLOYEE", "STATUS", "EXPIRES", ""], rows)
      : empty("No certificates"));
  content.querySelectorAll("[data-revoke]").forEach(
    (button) =>
      (button.onclick = async () => {
        const reason = prompt("Reason for revocation");
        if (!reason) return;
        await run(async () => {
          await api.revokeCertificate(
            state.data.certificates.find(
              (item) => idOf(item) === button.dataset.revoke,
            ),
            userId(),
            reason,
          );
          await refresh();
          await renderCertificates();
        }, "Certificate revoked");
      }),
  );
}

async function renderPeople() {
  try {
    const result = await blocks.iam.users.list({ pageNo: 1, pageSize: 100 });
    const users = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : result?.users || result?.data?.users || result?.items || result?.data?.items || [];
    content.innerHTML =
      page("People", "Employees and their compliance access state.") +
      (users.length
        ? table(
            ["NAME", "EMAIL", "ROLES", "STATUS", ""],
            users.map(
              (user) =>
                `<tr><td>${esc(`${user.firstName || ""} ${user.lastName || ""}`.trim())}</td><td>${esc(user.email)}</td><td>${esc((user.roles || []).join(", "))}</td><td>${user.active === false ? "Inactive" : "Active"}</td><td>${can("course:assign") ? `<button class="outline" data-role="${esc(idOf(user))}">Change role</button>` : ""}</td></tr>`,
            ),
          )
        : empty("No people available"));
    content.querySelectorAll("[data-role]").forEach((button) => {
      button.onclick = async () => {
        const role = prompt("New role slug");
        if (!role) return;
        const settings = state.data.settings[0] || { autoAssignOnRoleChange: true };
        await run(async () => {
          await api.changeEmployeeRole({
            employee: users.find((user) => idOf(user) === button.dataset.role),
            role,
            organizationId: orgId(),
            actorId: userId(),
            autoAssign: settings.autoAssignOnRoleChange,
          });
          await refresh();
          await renderPeople();
        }, "Role and assignments updated");
      };
    });
  } catch (error) {
    renderError("People", error);
  }
}

async function renderReports() {
  const departments = new Map();
  state.data.courses.forEach((course) => {
    const assignments = state.data.assignments.filter(
      (item) => item.courseId === idOf(course),
    );
    const complete = assignments.filter(
      (item) => item.status === "CertificateIssued",
    ).length;
    const current = departments.get(course.department) || {
      total: 0,
      complete: 0,
    };
    current.total += assignments.length;
    current.complete += complete;
    departments.set(course.department, current);
  });
  const rows = [...departments].map(
    ([department, value]) =>
      `<tr><td><b>${esc(department || "Unassigned")}</b></td><td>${value.total}</td><td>${value.complete}</td><td>${value.total ? Math.round((value.complete / value.total) * 100) : 100}%</td></tr>`,
  );
  content.innerHTML =
    page(
      "Compliance reports",
      "Completion and certification performance by department.",
    ) +
    (rows.length
      ? table(["DEPARTMENT", "ASSIGNMENTS", "COMPLIANT", "RATE"], rows)
      : empty("No report data"));
}

async function renderSettings() {
  const settings = state.data.settings[0] || {
    organizationId: orgId(),
    gracePeriodDays: 7,
    autoAssignOnRoleChange: true,
    managerVerificationRequired: true,
    autoRestrictNonCompliant: true,
    autoRestoreAccess: true,
    reminderDays: [60, 30, 7],
    defaultLocale: "en-US",
    restrictedRoleSlug: "restricted-user",
  };
  const disabled = can("settings:update") ? "" : "disabled";
  content.innerHTML =
    page(
      "Organization settings",
      "Configure assignment, verification, expiry, and restricted-access policy.",
    ) +
    `<section class="panel form-panel"><form id="settingsForm"><label>Grace period (days)<input name="gracePeriodDays" type="number" min="0" value="${esc(settings.gracePeriodDays)}" ${disabled}></label><label>Reminder days<input name="reminderDays" value="${esc((settings.reminderDays || []).join(","))}" ${disabled}></label><label>Default locale<input name="defaultLocale" value="${esc(settings.defaultLocale)}" ${disabled}></label><label>Restricted role slug<input name="restrictedRoleSlug" value="${esc(settings.restrictedRoleSlug)}" ${disabled}></label><label class="check"><input name="autoAssignOnRoleChange" type="checkbox" ${settings.autoAssignOnRoleChange ? "checked" : ""} ${disabled}> Auto-assign after role change</label><label class="check"><input name="managerVerificationRequired" type="checkbox" ${settings.managerVerificationRequired ? "checked" : ""} ${disabled}> Require manager verification</label><label class="check"><input name="autoRestrictNonCompliant" type="checkbox" ${settings.autoRestrictNonCompliant ? "checked" : ""} ${disabled}> Restrict access after grace period</label><label class="check"><input name="autoRestoreAccess" type="checkbox" ${settings.autoRestoreAccess ? "checked" : ""} ${disabled}> Restore access when compliant</label>${can("settings:update") ? '<button class="primary">Save settings</button>' : ""}</form></section>`;
  content
    .querySelector("#settingsForm")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      run(async () => {
        await api.saveOrgSettings(
          {
            ...settings,
            ...values,
            autoAssignOnRoleChange:
              event.currentTarget.autoAssignOnRoleChange.checked,
            managerVerificationRequired:
              event.currentTarget.managerVerificationRequired.checked,
            autoRestrictNonCompliant:
              event.currentTarget.autoRestrictNonCompliant.checked,
            autoRestoreAccess:
              event.currentTarget.autoRestoreAccess.checked,
          },
          userId(),
        );
        await refresh();
      }, "Settings saved");
    });
}

function modal(title, body) {
  const shell = document.createElement("div");
  shell.className = "modal-shell";
  shell.innerHTML = `<section class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button data-close>×</button></div>${body}</section>`;
  document.body.append(shell);
  shell.querySelector("[data-close]").onclick = () => shell.remove();
  shell.onclick = (event) => {
    if (event.target === shell) shell.remove();
  };
  return shell;
}

function openCourseForm(course = {}) {
  const shell = modal(
    course.name ? "Edit course" : "Create course",
    `<form id="courseForm"><div class="form-grid"><label>Course code<input name="code" required value="${esc(course.code)}"></label><label>Name<input name="name" required value="${esc(course.name)}"></label></div><label>Localization key<input name="localizedNameKey" required value="${esc(course.localizedNameKey || "course.name")}"></label><label>Description<textarea name="description">${esc(course.description)}</textarea></label><div class="form-grid"><label>Category<input name="category" value="${esc(course.category)}"></label><label>Training type<input name="trainingType" value="${esc(course.trainingType)}"></label></div><label>Provider<input name="provider" value="${esc(course.provider)}"></label><label>Department<input name="department" required value="${esc(course.department)}"></label><label>Required roles (comma separated)<input name="requiredRoles" required value="${esc((course.requiredRoles || []).join(","))}"></label><label>Supported languages<input name="supportedLanguages" value="${esc((course.supportedLanguages || ["en-US"]).join(","))}"></label><div class="form-grid"><label>Duration minutes<input name="durationMinutes" type="number" min="1" required value="${esc(course.durationMinutes || 30)}"></label><label>Validity days<input name="validityDays" type="number" min="1" required value="${esc(course.validityDays || 365)}"></label></div><label>Certificate template ID<input name="certificateTemplateId" value="${esc(course.certificateTemplateId)}"></label><label class="check"><input name="isMandatory" type="checkbox" ${course.isMandatory !== false ? "checked" : ""}> Mandatory training</label><label class="check"><input name="managerVerificationRequired" type="checkbox" ${course.managerVerificationRequired !== false ? "checked" : ""}> Require manager verification</label><label class="check"><input name="isActive" type="checkbox" ${course.isActive !== false ? "checked" : ""}> Active</label><button class="primary">Save course</button></form>`,
  );
  shell.querySelector("form").onsubmit = (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    run(async () => {
      await api.saveCourse(
        {
          ...course,
          ...values,
          organizationId: course.organizationId || orgId(),
          isActive: event.currentTarget.isActive.checked,
          isMandatory: event.currentTarget.isMandatory.checked,
          managerVerificationRequired:
            event.currentTarget.managerVerificationRequired.checked,
        },
        userId(),
      );
      shell.remove();
      await refresh();
      await renderCourses();
    }, "Course saved");
  };
}

function openAssignmentForm() {
  const options = state.data.courses
    .filter((course) => course.isActive)
    .map(
      (course) =>
        `<option value="${esc(idOf(course))}">${esc(course.name)}</option>`,
    )
    .join("");
  const shell = modal(
    "Assign training",
    `<form><label>Course<select name="courseId" required>${options}</select></label><label>Employee ID<input name="employeeId" required></label><label>Employee role<input name="sourceRole" required></label><label>Due date<input name="dueAt" type="date" required></label><button class="primary">Assign course</button></form>`,
  );
  shell.querySelector("form").onsubmit = (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    run(async () => {
      await api.assignCourse({
        ...values,
        dueAt: new Date(`${values.dueAt}T23:59:59`).toISOString(),
        organizationId: orgId(),
        assignedBy: userId(),
      });
      shell.remove();
      await refresh();
      await renderAssignments();
    }, "Training assigned");
  };
}

function openCompletionForm(assignment) {
  const shell = modal(
    "Complete training",
    `<form><label>Evidence file<input name="evidence" type="file" required></label><label>Score<input name="score" type="number" min="0" max="100" required></label><label>Notes<textarea name="notes"></textarea></label><button class="primary">Submit completion</button></form>`,
  );
  shell.querySelector("form").onsubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    run(async () => {
      const evidenceFileId = await api.uploadEvidence(form.evidence.files[0]);
      await api.submitCompletion(
        assignment,
        userId(),
        evidenceFileId,
        Number(form.score.value),
        form.notes.value,
      );
      shell.remove();
      await refresh();
      await renderAssignments();
    }, "Completion submitted");
  };
}

async function showNotifications() {
  try {
    const result = await api.getNotifications({
      isUnreadOnly: false,
      page: 1,
      pageSize: 20,
    });
    const notifications = result?.notifications || [];
    const shell = modal(
      "Notifications",
      `<div class="notification-list">${notifications.length ? notifications.map((item) => `<button data-id="${esc(item.id)}"><b>${esc(item.title || "Compliance alert")}</b><small>${esc(item.message || item.denormalizedPayload || "")}</small></button>`).join("") : empty("No notifications")}</div>${notifications.length ? '<button class="text-btn" data-all>Mark all as read</button>' : ""}`,
    );
    shell
      .querySelectorAll("[data-id]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            run(
              () => api.markNotificationRead(button.dataset.id),
              "Notification marked as read",
            )),
      );
    shell.querySelector("[data-all]")?.addEventListener("click", async () => {
      await run(async () => {
        const response = await api.markAllNotificationsRead();
        shell.remove();
        return response;
      }, "All notifications marked as read");
    });
  } catch (error) {
    notify(apiErrorMessage(error), true);
  }
}

async function run(operation, success) {
  try {
    const response = await operation();
    notify(api.consumeApiMessage(apiResponseMessage(response, success)));
    return response;
  } catch (error) {
    console.error(error);
    notify(apiErrorMessage(error), true);
    return undefined;
  }
}
function renderError(title, error) {
  content.innerHTML =
    page(title, "This section could not be loaded.") +
    `<section class="panel"><p class="red-text">${esc(apiErrorMessage(error))}</p></section>`;
}

bootstrap();
