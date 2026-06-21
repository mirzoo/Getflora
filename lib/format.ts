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

  if (diffInMinutes < 1) {
    return "только что";
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${formatMinutesWord(diffInMinutes)} назад`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 12) {
    return `${diffInHours} ${formatHoursWord(diffInHours)} назад`;
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

export function formatAuctionTimeLeft(endsAt?: string) {
  if (!endsAt) {
    return "—";
  }

  const endDate = new Date(endsAt);

  if (Number.isNaN(endDate.getTime())) {
    return endsAt;
  }

  const diffInMinutes = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 60000));

  if (diffInMinutes <= 0) {
    return "Завершен";
  }

  const hours = Math.floor(diffInMinutes / 60);
  const minutes = diffInMinutes % 60;

  if (hours <= 0) {
    return `${minutes} ${formatMinutesWord(minutes)}`;
  }

  if (minutes === 0) {
    return `${hours} ${formatHoursWord(hours)}`;
  }

  return `${hours} ${formatHoursWord(hours)} : ${minutes} ${formatMinutesWord(minutes)}`;
}

export function formatCompactAuctionTimeLeft(endsAt?: string) {
  if (!endsAt) {
    return "—";
  }

  const endDate = new Date(endsAt);

  if (Number.isNaN(endDate.getTime())) {
    return endsAt;
  }

  const diffInMinutes = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 60000));

  if (diffInMinutes <= 0) {
    return "Завершен";
  }

  const hours = Math.floor(diffInMinutes / 60);
  const minutes = diffInMinutes % 60;

  if (hours <= 0) {
    return `${minutes} м`;
  }

  if (minutes === 0) {
    return `${hours} ч`;
  }

  return `${hours} ч : ${minutes} м`;
}

export function getAuctionTimeTone(endsAt?: string): "positive" | "warning" | "negative" {
  if (!endsAt) {
    return "warning";
  }

  const endDate = new Date(endsAt);

  if (Number.isNaN(endDate.getTime())) {
    return "warning";
  }

  const diffInMinutes = Math.ceil((endDate.getTime() - Date.now()) / 60000);

  if (diffInMinutes <= 15) {
    return "negative";
  }

  if (diffInMinutes <= 45) {
    return "warning";
  }

  return "positive";
}

function formatMinutesWord(value: number) {
  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;

  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return "минуту";
  }

  if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) {
    return "минуты";
  }

  return "минут";
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
