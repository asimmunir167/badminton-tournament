import { env } from "../config/env";

/** Best-effort Expo push. Never throws to callers. */
export async function sendExpoPush(
  tokens: (string | null | undefined)[],
  payload: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  const unique = [...new Set(tokens.filter((t): t is string => Boolean(t && t.startsWith("ExponentPushToken"))) )];
  if (unique.length === 0) return;

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        unique.map((to) => ({
          to,
          sound: "default",
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
        })),
      ),
    });
  } catch (err) {
    if (env.NODE_ENV === "development") {
      console.warn("[push] failed", err);
    }
  }
}
