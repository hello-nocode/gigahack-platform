export function isProfileComplete(user: {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  expertiseDomain?: string | null;
}): boolean {
  return !!(
    user.firstName?.trim() &&
    user.lastName?.trim() &&
    user.phone?.trim() &&
    user.expertiseDomain?.trim()
  );
}
