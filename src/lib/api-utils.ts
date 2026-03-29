import { NextResponse } from "next/server";

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function serverError(err: unknown, context: string) {
  console.error(`${context}:`, err);
  return errorResponse("Internal server error", 500);
}
