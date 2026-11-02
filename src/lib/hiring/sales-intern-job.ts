import { COMMISSION_FORM_TYPE, COMMISSION_MONTHS, COMMISSION_SHARE_PERCENT } from "./commission";

/** The commission-only AwaazOS sales posting. Published by scripts/publish-sales-intern-job.mts. */
export const SALES_INTERN_JOB = {
  slug: "sales-associate-intern-awaazos",
  title: "AI-Native Outreach Associate Intern (AwaazOS)",
  description:
    "Work on our AI-native outreach system, not traditional sales. There are no cold-call scripts or bought lists: AI agents find home sellers on Instagram and WhatsApp, score how well each one fits and give you a ranked list. You bring the human part: you check each lead, build the seller a demo store, personalise and send the message yourself, and bring them on to AwaazOS. This role is commission only, with no fixed stipend. AwaazOS is at an early stage and you would be among our first outreach associates, so the pitch is still being proven and earnings are not guaranteed.",
  skills: ["AI-Native Outreach", "AI Tools", "WhatsApp", "Instagram", "Communication", "Product Demos"],
  location: "Remote (India)",
  employmentType: "INTERNSHIP",
  duration: "3 Months",
  salaryInfo: `Commission only: ${COMMISSION_SHARE_PERCENT}% of revenue from stores you bring in · No fixed stipend`,
  applicationEmail: "hr@intelliforge.tech",
  formType: COMMISSION_FORM_TYPE,
  responsibilities: [
    "Work from the ranked list our AI agents prepare for your localities: home bakers, cloud kitchens and other home sellers, each with a score and the reason they fit",
    "Check each lead yourself, and flag where the AI got it wrong so the system improves",
    "Build a demo store for each seller from your AwaazOS sales login",
    "Start from the ready-made message, personalise it and send it yourself, one seller at a time, saying who you are and that the store is a demo with sample orders",
    "Show sellers how the store works, answer their questions and send them the link to claim it",
    "Report your messages, replies, demos and paying stores every week",
  ],
  requirements: [
    {
      title: "Curious about AI",
      description: "You like using AI tools, you check what they give you, and you can tell when an answer is wrong.",
    },
    {
      title: "Comfortable talking to strangers",
      description: "You can start a polite conversation with a business owner, and you take a no without pushing.",
    },
    {
      title: "Clear written messages",
      description: "You write short, honest WhatsApp and Instagram messages in English and at least one local language.",
    },
    {
      title: "Own smartphone and WhatsApp",
      description: "You need your own phone and a WhatsApp number you are happy to use for this work.",
    },
    {
      title: "Comfortable with commission pay",
      description: "You understand that you earn only when a store you brought in pays, and that it can take more than a month.",
    },
  ],
  bonusSkills: ["Using ChatGPT or Claude", "Instagram selling", "Telugu", "Kannada", "Hindi", "Local food or home business contacts"],
  perks: [
    {
      icon: "🤖",
      title: "An AI-native way to do outreach",
      description:
        "AI agents do the searching and scoring, so your time goes on real conversations with sellers. You see how an AI outreach system works from the inside. AI never messages a seller for you: every message is yours.",
    },
    {
      icon: "💰",
      title: `${COMMISSION_SHARE_PERCENT}% commission, no stipend`,
      description: `${COMMISSION_SHARE_PERCENT}% of what each store you bring in pays, excluding GST and net of refunds. There is no fixed stipend and no guaranteed minimum.`,
    },
    {
      icon: "🧮",
      title: "What that means in rupees",
      description:
        "One store on the ₹299 monthly plan earns you ₹149.50 a month. One on the ₹2,990 yearly plan earns you ₹1,495 once. 20 monthly stores earn ₹2,990 a month. These are examples, not a promise.",
    },
    {
      icon: "📅",
      title: `Paid for ${COMMISSION_MONTHS} months`,
      description: `Commission runs for ${COMMISSION_MONTHS} months from a store's first payment, even after your internship ends. Nothing is earned during a store's free trial.`,
    },
    {
      icon: "🏦",
      title: "Paid monthly",
      description:
        "Paid by the 15th of the following month, less any tax the law requires us to deduct. Commission on refunded amounts is taken off later payments.",
    },
    {
      icon: "🚫",
      title: "You never pay us",
      description: "There is no joining fee, deposit or training charge.",
    },
    {
      icon: "📄",
      title: "Certificate",
      description: "A certificate of completion when you finish the internship.",
    },
  ],
  interviewSteps: [
    {
      step: "1",
      title: "Apply with a short exercise",
      description: "Name 5 home sellers who take orders by DM, and write the first message you would send one of them.",
    },
    {
      step: "2",
      title: "Short call",
      description: "We talk through your exercise and the commission terms, so you know exactly how you get paid.",
    },
    {
      step: "3",
      title: "Offer and training",
      description: "You get an offer letter with the full terms, then watch two live demos and run one yourself with us.",
    },
  ],
} as const;
