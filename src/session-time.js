(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PrayerSessionTime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function forDate(value, eveningBoundaryHour = 4) {
    const now = value instanceof Date ? new Date(value) : new Date(value || Date.now());
    const lateNight = now.getHours() < eveningBoundaryHour;
    const effectiveDate = new Date(now);
    if (lateNight) effectiveDate.setDate(effectiveDate.getDate() - 1);
    const office = lateNight || now.getHours() >= 15 ? 'Evening' : 'Morning';
    const greeting = lateNight
      ? 'The evening continues'
      : now.getHours() < 12
        ? 'Good morning'
        : now.getHours() < 15
          ? 'A quiet afternoon'
          : 'Good evening';
    return {
      day: days[effectiveDate.getDay()],
      office,
      lateNight,
      greeting,
      effectiveDate,
      dateLabel: effectiveDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    };
  }

  return { forDate };
});
