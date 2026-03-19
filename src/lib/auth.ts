export function checkPassword(password: string | undefined): boolean {
  const expected = process.env.LOG_PASSWORD || "2303";
  return password === expected;
}
