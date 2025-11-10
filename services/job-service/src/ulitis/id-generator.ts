/**
 * Generate task ID with format: TASK{YYYYMMDDHHmmss}
 * Example: TASK20251110143025
 */
export function generateTaskId(): string {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `TASK${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generate task ID with milliseconds to ensure uniqueness
 * Format: TASK{YYYYMMDDHHmmssSSS}
 * Example: TASK20251110143025123
 */
export function generateUniqueTaskId(): string {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  
  return `TASK${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
}
