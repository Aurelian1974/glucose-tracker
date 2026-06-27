/** Returns the current datetime as a `datetime-local` input value in the device's local timezone. */
export function localNow(): string {
  const now = new Date();
  const offsetMs = -now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() + offsetMs).toISOString().slice(0, 16);
}
