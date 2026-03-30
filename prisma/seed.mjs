import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = await bcrypt.hash("Test1234!", 12);

  // 1. Admin
  const admin = await prisma.admin.upsert({
    where: { email: "gen.girish@gmail.com" },
    update: {},
    create: {
      email: "gen.girish@gmail.com",
      passwordHash: defaultPassword,
      emailVerified: true,
    },
  });
  console.log("Admin:", admin.email);

  // 2. Interns with varying statuses
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);

  const internsData = [
    {
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      phone: "+919876543210",
      college: "IIT Delhi",
      branch: "Computer Science",
      year: "3rd Year",
      role: "AI Intern",
      startDate: fourWeeksAgo,
      durationWeeks: 12,
      stipendPaise: 1500000,
      status: "ACTIVE",
      acceptedAt: new Date(fourWeeksAgo.getTime() + 2 * 86400000),
      passwordHash: defaultPassword,
      emailVerified: true,
    },
    {
      name: "Rahul Verma",
      email: "rahul.verma@example.com",
      phone: "+919123456789",
      college: "BITS Pilani",
      branch: "Electronics",
      year: "4th Year",
      role: "Dev Intern",
      startDate: twoWeeksAgo,
      durationWeeks: 8,
      stipendPaise: 1200000,
      status: "ACTIVE",
      acceptedAt: new Date(twoWeeksAgo.getTime() + 86400000),
      passwordHash: defaultPassword,
      emailVerified: true,
    },
    {
      name: "Ananya Gupta",
      email: "ananya.gupta@example.com",
      phone: "+918765432109",
      college: "NIT Trichy",
      branch: "Information Technology",
      year: "2nd Year",
      role: "Research Intern",
      startDate: oneWeekAgo,
      durationWeeks: 16,
      stipendPaise: 1000000,
      status: "PENDING",
      acceptedAt: null,
      passwordHash: defaultPassword,
      emailVerified: false,
    },
    {
      name: "Vikram Singh",
      email: "vikram.singh@example.com",
      phone: "+917654321098",
      college: "IIIT Hyderabad",
      branch: "Computer Science",
      year: "Graduated",
      role: "AI Intern",
      startDate: new Date(now.getTime() - 90 * 86400000),
      durationWeeks: 12,
      stipendPaise: 2000000,
      status: "COMPLETED",
      acceptedAt: new Date(now.getTime() - 88 * 86400000),
      passwordHash: defaultPassword,
      emailVerified: true,
    },
    {
      name: "Sneha Patel",
      email: "sneha.patel@example.com",
      phone: "+916543210987",
      college: "VIT Vellore",
      branch: "Data Science",
      year: "3rd Year",
      role: "Dev Intern",
      startDate: now,
      durationWeeks: 10,
      stipendPaise: 0,
      status: "PENDING",
      acceptedAt: null,
      passwordHash: defaultPassword,
      emailVerified: false,
    },
  ];

  const interns = [];
  for (const data of internsData) {
    const intern = await prisma.intern.upsert({
      where: { email: data.email },
      update: {},
      create: data,
    });
    interns.push(intern);
    console.log(`Intern: ${intern.name} (${intern.status})`);
  }

  // 3. Attendance records for active interns
  const priya = interns[0];
  const rahul = interns[1];

  const attendanceDays = [];
  for (let i = 0; i < 5; i++) {
    const day = new Date(oneWeekAgo.getTime() + i * 86400000);
    day.setHours(0, 0, 0, 0);
    attendanceDays.push(day);
  }

  for (let idx = 0; idx < attendanceDays.length; idx++) {
    const day = attendanceDays[idx];
    const punchIn = new Date(day);
    punchIn.setHours(9, 30, 0, 0);
    const punchOut = new Date(day);
    punchOut.setHours(18, 0, 0, 0);

    await prisma.attendance.upsert({
      where: { internId_date: { internId: priya.id, date: day } },
      update: {},
      create: {
        internId: priya.id,
        date: day,
        punchIn,
        punchOut,
        mode: idx % 2 === 0 ? "WFH" : "Office",
      },
    });
  }
  console.log(`Attendance: ${attendanceDays.length} records for ${priya.name}`);

  for (let i = 0; i < 3; i++) {
    const day = new Date(oneWeekAgo.getTime() + (i + 1) * 86400000);
    day.setHours(0, 0, 0, 0);
    const punchIn = new Date(day);
    punchIn.setHours(10, 0, 0, 0);
    const punchOut = new Date(day);
    punchOut.setHours(17, 30, 0, 0);

    await prisma.attendance.upsert({
      where: { internId_date: { internId: rahul.id, date: day } },
      update: {},
      create: {
        internId: rahul.id,
        date: day,
        punchIn,
        punchOut,
        mode: "WFH",
      },
    });
  }
  console.log(`Attendance: 3 records for ${rahul.name}`);

  // 4. Tasks
  const priyaTasks = [
    { title: "Set up development environment", description: "Install Python, VS Code, clone repos, configure virtual env", status: "DONE", hours: 4, week: "2026-W12" },
    { title: "Complete ML fundamentals course", description: "Andrew Ng's ML course on Coursera — Weeks 1-3", status: "DONE", hours: 12, week: "2026-W12" },
    { title: "Build sentiment analysis pipeline", description: "Implement text preprocessing, feature extraction, and model training for product reviews", status: "IN_PROGRESS", hours: 8, week: "2026-W13" },
    { title: "Write API documentation", description: "Document all REST endpoints using OpenAPI spec format", status: "TODO", hours: 3, week: "2026-W13" },
  ];

  for (const task of priyaTasks) {
    await prisma.task.create({
      data: { internId: priya.id, ...task },
    });
  }
  console.log(`Tasks: ${priyaTasks.length} for ${priya.name}`);

  const rahulTasks = [
    { title: "Frontend dashboard mockup", description: "Create Figma mockups for the admin dashboard redesign", status: "DONE", hours: 6, week: "2026-W13" },
    { title: "Implement responsive navbar", description: "Build mobile-first navigation with hamburger menu using Tailwind CSS", status: "IN_PROGRESS", hours: 5, week: "2026-W13" },
    { title: "Database schema design", description: "Design ERD for the new reporting module with PostgreSQL", status: "TODO", hours: 4, week: "2026-W13" },
  ];

  for (const task of rahulTasks) {
    await prisma.task.create({
      data: { internId: rahul.id, ...task },
    });
  }
  console.log(`Tasks: ${rahulTasks.length} for ${rahul.name}`);

  console.log("\nSeed completed successfully!");
  console.log("Default password for all accounts: Test1234!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
