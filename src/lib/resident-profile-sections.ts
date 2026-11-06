// FILE: src/lib/resident-profile-sections.ts
//
// The sections of a printed resident profile, shared by the "Print profile"
// dialog (client) and GET /api/pdf/resident/[id] (server). Each needs its
// permission on top of residents:read. Blotter involvement is off by
// default in the dialog because it's sensitive.
export const PROFILE_SECTIONS = [
  { key: "personal", label: "Personal information", hint: "Name, birth, civil status, contacts, address", permission: "residents:read", defaultOn: true },
  { key: "household", label: "Household & members", hint: "Household no., housing, everyone in the household", permission: "households:read", defaultOn: true },
  { key: "certificates", label: "Certificates issued", hint: "Every document requested, with status", permission: "certificates:read", defaultOn: true },
  { key: "health", label: "Health records & vaccinations", hint: "Check-ups, conditions, vaccines given", permission: "health:read", defaultOn: false },
  { key: "assistance", label: "Government assistance & sectors", hint: "4Ps, senior, PWD, programs enrolled", permission: "residents:read", defaultOn: true },
  { key: "blotter", label: "Blotter involvement", hint: "Cases as complainant or respondent (sensitive)", permission: "blotter:read", defaultOn: false },
] as const;

export type ProfileSectionKey = (typeof PROFILE_SECTIONS)[number]["key"];