export function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function isValidDob(dob: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const date = new Date(dob);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;

export function isValidCnic(cnic: string): boolean {
  return CNIC_REGEX.test(cnic);
}

// Reformats raw digit input into the 12345-1234567-1 CNIC pattern as the
// user types, so they never have to type the dashes themselves.
export function formatCnicInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 13);
  const part1 = digits.slice(0, 5);
  const part2 = digits.slice(5, 12);
  const part3 = digits.slice(12, 13);
  return [part1, part2, part3].filter(Boolean).join('-');
}
