export function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requiredString(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

export function intValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function dateValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`);
}
