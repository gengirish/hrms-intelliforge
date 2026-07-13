import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = await bcrypt.hash("Test1234!", 12);

  // 1. Organization (must exist before admins / interns reference it)
  const org = await prisma.organization.upsert({
    where: { slug: "intelliforge-ai" },
    update: { maxInterns: 500 },
    create: {
      name: "IntelliForge AI",
      slug: "intelliforge-ai",
      domain: "intelliforge.tech",
      plan: "growth",
      maxInterns: 500,
    },
  });
  console.log("Organization:", org.name);

  // 2. Admin
  const admin = await prisma.admin.upsert({
    where: { email: "gen.girish@gmail.com" },
    update: { orgId: org.id },
    create: {
      email: "gen.girish@gmail.com",
      passwordHash: defaultPassword,
      emailVerified: true,
      orgId: org.id,
    },
  });
  console.log("Admin:", admin.email);

  // 3. Interns with varying statuses
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
      update: { orgId: org.id },
      create: { ...data, orgId: org.id },
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

  // 5. AI Native Software Engineer Intern — Job Posting
  const existingJob = await prisma.jobPosting.findFirst({
    where: { orgId: org.id, title: "AI Native Software Engineer Intern" },
  });

  if (!existingJob) {
    await prisma.jobPosting.create({
      data: {
        orgId: org.id,
        title: "AI Native Software Engineer Intern",
        description:
          "Build real AI agents, ship production-grade SaaS products, and learn what it means to engineer at the intersection of LLMs and full-stack systems — from day one.",
        skills: [
          "Next.js",
          "LangGraph",
          "RAG",
          "Multi-Agent",
          "Prisma",
          "Supabase",
          "n8n",
          "FastAPI",
          "Vercel",
        ],
        location: "Hyderabad / Remote",
        employmentType: "INTERNSHIP",
        duration: "3–6 Months",
        salaryInfo: "Stipend + PPO Potential",
        applicationEmail: "hr@intelliforge.tech",
        responsibilities: [
          "Build and deploy AI agents (RAG pipelines, multi-agent workflows, tool-calling systems) on real client and product workloads",
          "Develop full-stack features across IntelliForge's SaaS product suite — GarageOS, KinderOS, MedForge, and others — using Next.js, Prisma, and Supabase",
          "Integrate LLM APIs (Claude, OpenAI, Gemini) into production applications with proper prompt engineering, context management, and evaluation",
          "Automate workflows using n8n, Zapier, and custom API tooling — connecting AI models to real business systems",
          "Use Cursor IDE (or equivalent AI coding assistants) as your primary development environment — not as a crutch, but as a force multiplier",
          "Contribute to architecture decisions, write clean Cursor-ready prompts, and document your work for async-first collaboration",
        ],
        requirements: [
          {
            title: "AI-First Mindset",
            description:
              "You reach for an LLM before a for-loop when appropriate. You've built something with Claude, OpenAI, or an open-source model — not just called an API.",
          },
          {
            title: "Full-Stack Foundations",
            description:
              "Comfortable with React/Next.js on the frontend, Node.js or Python on the backend, and at least one database (SQL preferred).",
          },
          {
            title: "Ships Fast, Iterates Faster",
            description:
              "You get something live, gather feedback, and improve. You don't over-engineer. You've used Vercel, Railway, or similar for deployment.",
          },
          {
            title: "Agent & Automation Curiosity",
            description:
              "You've tinkered with LangChain, LangGraph, AutoGen, CrewAI, or n8n — or you're deeply curious and can prove it through your projects.",
          },
          {
            title: "Cursor / AI Dev Tool Fluency",
            description:
              "You work in Cursor, GitHub Copilot, or similar. You know how to write effective prompts for code generation, not just hit Tab.",
          },
          {
            title: "Ownership Mentality",
            description:
              "You ask \"what's the goal?\" before writing code. You document your decisions. You care about the outcome, not just the output.",
          },
        ],
        bonusSkills: [
          "LangGraph / CrewAI",
          "RAG + vector DBs",
          "Prompt engineering depth",
          "Clerk / multi-tenancy",
          "Razorpay integration",
          "India B2B SaaS context",
          "GST / Tally awareness",
          "n8n workflow design",
          "FastAPI / Python backend",
          "Supabase / Prisma ORM",
        ],
        perks: [
          {
            icon: "💰",
            title: "Competitive Stipend",
            description:
              "Performance-linked. Discussed based on skills and engagement.",
          },
          {
            icon: "🚀",
            title: "Real Production Work",
            description:
              "Your code ships to real users, not a staging environment that no one looks at.",
          },
          {
            icon: "🤖",
            title: "AI-First Culture",
            description:
              "Access to all major LLM APIs, AI coding tools, and automation platforms.",
          },
          {
            icon: "🎓",
            title: "Direct Mentorship",
            description:
              "Work directly with a 14-year enterprise engineer and M.Tech DSAI student.",
          },
          {
            icon: "📄",
            title: "Certificate + LOR",
            description:
              "Detailed letter of recommendation and project certificates on completion.",
          },
          {
            icon: "🌐",
            title: "PPO Potential",
            description:
              "Top performers will be considered for a full-time role as IntelliForge scales.",
          },
        ],
        interviewSteps: [
          {
            step: "01",
            title: "Portfolio Review",
            description:
              "Share GitHub, deployed projects, or anything you've built with AI. No AI-generated portfolios with zero code behind them.",
          },
          {
            step: "02",
            title: "Async Technical Task",
            description:
              "A short, focused build task (4–6 hrs). We respect your time; this isn't a free project disguised as an assignment.",
          },
          {
            step: "03",
            title: "Culture & Vision Call",
            description:
              "30 min with the founder. We're checking for alignment, not grilling on algorithms.",
          },
        ],
        isActive: true,
      },
    });
    console.log("Job Posting: AI Native Software Engineer Intern created");
  } else {
    console.log("Job Posting: AI Native Software Engineer Intern already exists");
  }

  console.log("\nSeed completed successfully!");
  console.log("Default password for all accounts: Test1234!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
