function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getBusScheduleStatus(schedules, now = new Date()) {
  if (!schedules?.length) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const running = [];
  const upcoming = [];

  for (const schedule of schedules) {
    const departure = toMinutes(schedule.departureTime);
    const arrival = toMinutes(schedule.arrivalTime);
    const crossesMidnight = arrival < departure;
    const isRunning = crossesMidnight
      ? nowMinutes >= departure || nowMinutes <= arrival
      : nowMinutes >= departure && nowMinutes <= arrival;

    if (isRunning) {
      const minutesUntilArrival = (arrival - nowMinutes + 1440) % 1440;
      running.push({ schedule, minutesUntilArrival });
      continue;
    }

    const minutesUntilDeparture = (departure - nowMinutes + 1440) % 1440;
    upcoming.push({ schedule, minutesUntilDeparture });
  }

  if (running.length) {
    running.sort((a, b) => a.minutesUntilArrival - b.minutesUntilArrival);
    return { running: true, schedule: running[0].schedule, minutes: 0 };
  }

  upcoming.sort((a, b) => a.minutesUntilDeparture - b.minutesUntilDeparture);
  return {
    running: false,
    schedule: upcoming[0].schedule,
    minutes: upcoming[0].minutesUntilDeparture,
    nextDay: nowMinutes + upcoming[0].minutesUntilDeparture >= 1440,
  };
}

export function sortRoutesBySchedule(routes, now = new Date()) {
  return routes
    .map((route, index) => ({
      route,
      index,
      status: getBusScheduleStatus(route.schedules, now),
    }))
    .sort((a, b) => {
      if (a.status?.running !== b.status?.running) return a.status?.running ? -1 : 1;
      if (a.status && b.status && a.status.minutes !== b.status.minutes) {
        return a.status.minutes - b.status.minutes;
      }
      if (a.status) return -1;
      if (b.status) return 1;
      return a.index - b.index;
    })
    .map(({ route }) => route);
}
