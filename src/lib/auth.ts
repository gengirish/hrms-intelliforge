import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getAuthIntern() {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.intern.findUnique({ where: { clerkId: userId } });
}

export async function getAuthAdmin() {
  const { userId } = await auth();
  if (!userId) return null;

  let admin = await prisma.admin.findUnique({ where: { clerkId: userId } });
  if (admin) return admin;

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!email) return null;

  admin = await prisma.admin.findUnique({ where: { email } });
  if (admin) {
    await prisma.admin.update({
      where: { id: admin.id },
      data: { clerkId: userId },
    });
  }
  return admin;
}
