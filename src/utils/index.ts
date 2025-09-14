export { safeAwait } from "./safe-await";

export function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a number between 100000 and 999999
}

export function addMinutesToCurrentTime(minutes: number) {
  const currentTime = new Date().getTime(); // Get current time in milliseconds
  const timeInFuture = currentTime + minutes * 60 * 1000; // Add the given minutes in milliseconds
  return new Date(timeInFuture); // Return the new time as a Date object
}
