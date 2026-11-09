import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Attendance",
  description: "Track daily attendance with punch in/out and WFH/Office mode.",
};

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
