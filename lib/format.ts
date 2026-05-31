export function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

export function formatListingPublishedAt(publishedAt?: string, fallback = "") {
  if (!publishedAt) {
    return fallback;
  }

  const publishedDate = new Date(publishedAt);

  if (Number.isNaN(publishedDate.getTime())) {
    return fallback;
  }

  const now = new Date();
  const diffInMinutes = Math.max(0, Math.floor((now.getTime() - publishedDate.getTime()) / 60000));
  const time = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(publishedDate);

  if (diffInMinutes < 120) {
    const hours = Math.max(1, Math.ceil(diffInMinutes / 60));
    return `${hours} ${formatHoursWord(hours)} назад`;
  }

  if (publishedDate.toDateString() === now.toDateString()) {
    return `сегодня в ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (publishedDate.toDateString() === yesterday.toDateString()) {
    return `вчера в ${time}`;
  }

  const date = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(publishedDate);

  return `${date} в ${time}`;
}

function formatHoursWord(value: number) {
  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;

  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return "час";
  }

  if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) {
    return "часа";
  }

  return "часов";
}
