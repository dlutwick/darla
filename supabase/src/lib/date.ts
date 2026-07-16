export const APP_TIME_ZONE = 'America/Moncton';

export function getLocalDay(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}
