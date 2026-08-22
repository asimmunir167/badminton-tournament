import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
}

// Best-effort: a notification failing to write should never roll back or
// block the business action (match scoring, registration review) that
// triggered it, so callers fire-and-forget this rather than awaiting inline
// inside their own transactions.
export async function createNotification(input: CreateNotificationInput) {
  try {
    await prisma.notification.create({ data: input });
  } catch {
    // swallow — notifications are best-effort
  }
}

export async function listMyNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { sentAt: "desc" },
    take: 50,
  });
}

export async function markRead(id: string, userId: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    throw new ApiError(404, "Notification not found");
  }
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
