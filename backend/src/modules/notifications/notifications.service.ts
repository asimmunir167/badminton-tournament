import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { sendExpoPush } from "../../lib/push";
import { ApiError } from "../../middleware/errorHandler";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    await prisma.notification.create({ data: input });
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { expoPushToken: true },
    });
    await sendExpoPush([user?.expoPushToken], {
      title: input.title,
      body: input.body,
      data: (input.data as Record<string, unknown> | undefined) ?? { type: input.type },
    });
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

export async function registerPushToken(userId: string, token: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { expoPushToken: token },
    select: { id: true, expoPushToken: true },
  });
}
