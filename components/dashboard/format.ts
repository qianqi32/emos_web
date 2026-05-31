export function formatBoolean(value: boolean) {
  return value ? "已启用" : "未启用";
}

export function formatBytes(value: number) {
  if (!value) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export function displayValue(value: string | number | boolean | null | undefined) {
  if (typeof value === "boolean") {
    return formatBoolean(value);
  }

  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}
