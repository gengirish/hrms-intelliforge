import type { Prisma } from "@prisma/client";

/** Which mentor profiles appear in the public directory and sitemap. */
export function publicMentorWhere(extra: Prisma.MentorProfileWhereInput = {}): Prisma.MentorProfileWhereInput {
  return { isPublic: true, ...extra };
}
