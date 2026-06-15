import { prisma } from "@/lib/prisma";

export type NotificationType = "budget" | "report" | "zoho" | "lead" | "system";

export interface NotifyInput {
  orgId: string;
  userId?: string | null; // null/undefined → org-wide broadcast
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/** Persist an in-app notification (best-effort; never throws to callers). */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        orgId: input.orgId,
        userId: input.userId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      },
    });
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

/** Broadcast to every user holding one of the given roles in the org. */
export async function notifyRoles(
  orgId: string,
  roles: string[],
  input: Omit<NotifyInput, "orgId" | "userId">,
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { orgId, role: { in: roles as never } },
    select: { id: true },
  });
  await Promise.all(users.map((u) => notify({ ...input, orgId, userId: u.id })));
}
