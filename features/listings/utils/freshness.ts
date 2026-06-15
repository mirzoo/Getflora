export function getReceivedAgeDays(receivedAt?: string | Date | null) {
  if (!receivedAt) {
    return null;
  }

  const receivedDate = receivedAt instanceof Date ? receivedAt : new Date(receivedAt);

  if (Number.isNaN(receivedDate.getTime())) {
    return null;
  }

  const todayStart = getLocalDayStart(new Date());
  const receivedStart = getLocalDayStart(receivedDate);
  const ageDays = Math.floor((todayStart.getTime() - receivedStart.getTime()) / 86_400_000);

  return Math.max(0, ageDays);
}

export function getFreshnessLabel(receivedAt: string | Date | null | undefined, freshnessScore: number) {
  return `Получен ${getFreshnessValueLabel(receivedAt, freshnessScore).toLocaleLowerCase("ru-RU")}`;
}

export function getFreshnessValueLabel(receivedAt: string | Date | null | undefined, freshnessScore: number) {
  const ageDays = getReceivedAgeDays(receivedAt);

  if (ageDays !== null) {
    if (ageDays === 0) {
      return "Сегодня";
    }

    if (ageDays === 1) {
      return "Вчера";
    }

    if (ageDays === 2) {
      return "2 дня назад";
    }

    return "3+ дня назад";
  }

  if (freshnessScore >= 90) {
    return "Сегодня";
  }

  if (freshnessScore >= 80) {
    return "Вчера";
  }

  if (freshnessScore >= 70) {
    return "2 дня назад";
  }

  return "3+ дня назад";
}

export function getCompactFreshnessLabel(receivedAt: string | Date | null | undefined, freshnessScore: number) {
  const ageDays = getReceivedAgeDays(receivedAt);

  if (ageDays !== null) {
    if (ageDays === 0) {
      return "Новый";
    }

    if (ageDays === 1) {
      return "Свежий";
    }

    if (ageDays === 2) {
      return "Хороший";
    }

    if (ageDays === 3) {
      return "Теряет свежесть";
    }

    if (ageDays === 4) {
      return "Немного вянут";
    }

    return "Увядшие";
  }

  if (freshnessScore >= 90) {
    return "Новый";
  }

  if (freshnessScore >= 80) {
    return "Свежий";
  }

  if (freshnessScore >= 70) {
    return "Хороший";
  }

  if (freshnessScore >= 60) {
    return "Теряет свежесть";
  }

  if (freshnessScore >= 50) {
    return "Немного вянут";
  }

  return "Увядшие";
}

export function getFreshnessTone(receivedAt: string | Date | null | undefined, freshnessScore: number) {
  const ageDays = getReceivedAgeDays(receivedAt);

  if (ageDays !== null) {
    if (ageDays === 0) {
      return "today";
    }

    if (ageDays === 1) {
      return "yesterday";
    }

    if (ageDays === 2) {
      return "two-days";
    }

    return "older";
  }

  if (freshnessScore >= 90) {
    return "today";
  }

  if (freshnessScore >= 80) {
    return "yesterday";
  }

  if (freshnessScore >= 70) {
    return "two-days";
  }

  return "older";
}

function getLocalDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
