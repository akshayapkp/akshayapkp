export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMillisecondsUntilNextMidnight(date = new Date()) {
  const nextMidnight = new Date(date);
  nextMidnight.setHours(24, 0, 0, 0);
  return Math.max(1_000, nextMidnight.getTime() - date.getTime());
}

export function clearLoginSession() {
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("loginSessionDate");
  window.dispatchEvent(new StorageEvent("storage", { key: "loggedInUser", newValue: null }));
}

export function isSessionFromToday() {
  return localStorage.getItem("loginSessionDate") === getLocalDateKey();
}
