export const reportReasons = [
  { value: "spam", label: "Спам или дубликат" },
  { value: "fraud", label: "Мошенничество" },
  { value: "inappropriate", label: "Неподходящий контент" },
  { value: "wrong_info", label: "Неверная информация" },
  { value: "other", label: "Другое" },
] as const;

export type ReportReasonValue = (typeof reportReasons)[number]["value"];

const allowedReasons = new Set<string>(reportReasons.map((reason) => reason.value));

export function isReportReason(value: string): value is ReportReasonValue {
  return allowedReasons.has(value);
}

export function getReportReasonLabel(value: string) {
  return reportReasons.find((reason) => reason.value === value)?.label ?? value;
}
