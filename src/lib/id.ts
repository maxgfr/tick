/** IDs that survive a reload without colliding with earlier siblings. */
export function makeId(): string {
  return crypto.randomUUID()
}
