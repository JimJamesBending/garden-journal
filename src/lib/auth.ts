export function checkPassword(password: string | undefined): boolean {
  const expected = process.env.LOG_PASSWORD || "garden2025";
  return password === expected;
}
