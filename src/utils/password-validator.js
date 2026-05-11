/**
 * HIPAA-compliant password validation
 * Requirements: 12+ characters with uppercase, lowercase, number, and special character
 */
export function validatePassword(password) {
  if (!password) return true; // Empty password allowed for optional changes
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-[\]{}|\\:;"'<>,./`~]).{12,}$/;
  return regex.test(password);
}

export const PASSWORD_REQUIREMENTS =
  'Minimum 12 characters with uppercase, lowercase, number, and special character.';
