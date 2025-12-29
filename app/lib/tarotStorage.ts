type TodayPick = {
  date: string; // YYYY-MM-DD (Taiwan)
  count: number;
  lastCardId?: number;
};

const KEY = "tarot_today_pick";

export function getTaiwanDateString() {
  // 以台灣時區（UTC+8）算日期
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const tw = new Date(utc + 8 * 60 * 60_000);
  const y = tw.getFullYear();
  const m = String(tw.getMonth() + 1).padStart(2, "0");
  const d = String(tw.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function loadTodayPick(): TodayPick | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TodayPick;
  } catch {
    return null;
  }
}

export function saveTodayPick(v: TodayPick) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

// ✅ 你原本的 VIP 判斷：保留
export function isVipDevice() {
  if (typeof window === "undefined") return false;

  // 你可以換成更正式的判斷方式
  // 例如：網址帶 ?vip=1、或某個 localStorage flag
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("vip") === "1") return true;
  } catch {}

  return false;
}
