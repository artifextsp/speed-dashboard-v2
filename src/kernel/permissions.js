const SPEED_ROLE_MAP = {
  admin: "designer",
  author: "designer",
  supervisor: "supervisor",
};

const PERMISSIONS = {
  designer: new Set([
    "class.create",
    "class.edit",
    "class.changeStatus",
    "class.publish",
    "class.downloadPdf",
    "class.view",
    "attendance.view",
    "attendance.record",
    "quiz.create",
    "quiz.manage",
    "quiz.view",
  ]),
  supervisor: new Set([
    "class.view",
    "class.downloadPdf",
    "attendance.view",
    "quiz.view",
  ]),
  student: new Set(["class.view", "class.downloadPdf"]),
};

export function mapSpeedRole(speedRole) {
  return SPEED_ROLE_MAP[speedRole] || "student";
}

export function can(role, action) {
  const kernelRole = typeof role === "string" && PERMISSIONS[role]
    ? role
    : mapSpeedRole(role);
  return PERMISSIONS[kernelRole]?.has(action) ?? false;
}

export function getClassPermissions(speedRole) {
  const kernelRole = mapSpeedRole(speedRole);
  return {
    role: kernelRole,
    canEdit: can(kernelRole, "class.edit"),
    canChangeStatus: can(kernelRole, "class.changeStatus"),
    canPublish: can(kernelRole, "class.publish"),
    canView: can(kernelRole, "class.view"),
    canDownloadPdf: can(kernelRole, "class.downloadPdf"),
    canViewAttendance: can(kernelRole, "attendance.view"),
    canRecordAttendance: can(kernelRole, "attendance.record"),
    canCreateQuiz: can(kernelRole, "quiz.create"),
    canManageQuiz: can(kernelRole, "quiz.manage"),
    canViewQuiz: can(kernelRole, "quiz.view"),
    canManageStudents: speedRole === "admin",
    readOnly: kernelRole === "supervisor",
  };
}
