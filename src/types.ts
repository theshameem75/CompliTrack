export type Entity = Record<string, any> & { id?: string; itemId?: string; ItemId?: string };

export type DashboardData = {
  courses: Entity[];
  assignments: Entity[];
  completions: Entity[];
  certificates: Entity[];
  settings: Entity[];
  complianceStatuses: Entity[];
};

export type User = Entity & {
  firstName?: string;
  lastName?: string;
  email?: string;
  organizationId?: string;
  OrganizationId?: string;
  language?: string;
  permissions?: Array<string | { name?: string; slug?: string }>;
};

export type ModalState =
  | { kind: "course"; item?: Entity }
  | { kind: "assignment" }
  | { kind: "completion"; item: Entity }
  | { kind: "notifications" }
  | null;

export const idOf = (item?: Entity) => item?.itemId || item?.ItemId || item?.id || "";
export const formatDate = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "—";
