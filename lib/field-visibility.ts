export type FieldVisibility = 'ALL_MEMBERS' | 'TEAM_MEMBERS' | 'SELF_ADMIN' | 'ADMIN_ONLY';
export type ViewerAccess  = 'ADMIN' | 'SELF' | 'TEAM' | 'MEMBER';

export const VISIBILITY_LABELS: Record<FieldVisibility, string> = {
  ALL_MEMBERS:  'All org members',
  TEAM_MEMBERS: 'Same-team members',
  SELF_ADMIN:   'Self & Admin only',
  ADMIN_ONLY:   'Admin / Maintainer only',
};

/** All profile fields that have configurable visibility */
export const PROFILE_FIELDS = [
  'email', 'phone', 'whatsapp', 'address',
  'githubUrl', 'linkedinUrl',
  'dob', 'parentOrg', 'designation', 'education',
  'introducedBy', 'bankAccount', 'upiId',
] as const;

export type ProfileField = typeof PROFILE_FIELDS[number];

/** Default visibility for each field */
export const DEFAULT_FIELD_VISIBILITY: Record<ProfileField, FieldVisibility> = {
  email:        'ALL_MEMBERS',
  phone:        'TEAM_MEMBERS',
  whatsapp:     'TEAM_MEMBERS',
  address:      'SELF_ADMIN',
  githubUrl:    'ALL_MEMBERS',
  linkedinUrl:  'ALL_MEMBERS',
  dob:          'SELF_ADMIN',
  parentOrg:    'ALL_MEMBERS',
  designation:  'ALL_MEMBERS',
  education:    'ALL_MEMBERS',
  introducedBy: 'SELF_ADMIN',
  bankAccount:  'ADMIN_ONLY',
  upiId:        'ADMIN_ONLY',
};

/** Minimum allowed visibility for sensitive fields (can't be set lower) */
export const MIN_VISIBILITY: Partial<Record<ProfileField, FieldVisibility>> = {
  bankAccount: 'SELF_ADMIN',
  upiId:       'SELF_ADMIN',
};

/** Resolve effective visibility for a field (merging saved config with defaults) */
export function effectiveVisibility(
  saved: Partial<Record<ProfileField, FieldVisibility>> | null | undefined,
  field: ProfileField
): FieldVisibility {
  return saved?.[field] ?? DEFAULT_FIELD_VISIBILITY[field];
}

/** Can a viewer at `access` level see a field with `visibility`? */
export function canViewField(visibility: FieldVisibility, access: ViewerAccess): boolean {
  switch (visibility) {
    case 'ALL_MEMBERS':  return true;
    case 'TEAM_MEMBERS': return access === 'ADMIN' || access === 'SELF' || access === 'TEAM';
    case 'SELF_ADMIN':   return access === 'ADMIN' || access === 'SELF';
    case 'ADMIN_ONLY':   return access === 'ADMIN';
  }
}

/** Strip profile fields the viewer cannot see; returns null if entirely hidden */
export function filterProfileFields(
  profile: Record<string, unknown> | null | undefined,
  savedVisibility: Partial<Record<ProfileField, FieldVisibility>> | null | undefined,
  access: ViewerAccess
): Record<string, unknown> | null {
  if (!profile) return null;
  const result: Record<string, unknown> = {};
  let hasData = false;

  for (const field of PROFILE_FIELDS) {
    const vis = effectiveVisibility(savedVisibility, field);
    if (canViewField(vis, access)) {
      const val = (profile as Record<string, unknown>)[field];
      if (val !== undefined) { result[field] = val; hasData = true; }
    }
  }

  // Always include non-sensitive metadata
  result.updatedAt = (profile as Record<string, unknown>).updatedAt;
  result.userId    = (profile as Record<string, unknown>).userId;
  return hasData ? result : null;
}
