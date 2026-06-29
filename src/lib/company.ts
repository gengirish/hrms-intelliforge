/** Legal entity and office details. */
export const COMPANY = {
  legalName: "Intelliforge Digital Services",
  brandName: "IntelliForge AI",
  tagline: "Artificial Intelligence • Machine Learning • Innovation",
  elevatorPitch: "AI Agent Development & Workflow Automation",
  website: "www.intelliforge.tech",
  websiteUrl: "https://www.intelliforge.tech",
  registeredOffice: {
    name: "Trend Works",
    line1: "Vamsiram's Jyothi Granules, Tower-2, Kondapur Main Road",
    line2: "Opp. Chirec School, Laxmi Nagar, Kondapur",
    line3: "Hyderabad, Telangana 500084",
  },
  state: "Telangana",
  stateCode: "36",
  email: "hr@intelliforge.tech",
  contactEmail: "contact@intelliforge.tech",
  phone: "+91 85559 60837",
  portalHost: "hrms.intelliforge.tech",
  missionLabel: "Aligned with Bharat AI Mission",
  proprietorship: "Individual Proprietorship — Hyderabad, Telangana, India",
} as const;

export function formatAddressLines(...lines: string[]): string {
  return lines.join("\n");
}

export const REGISTERED_OFFICE_TEXT = formatAddressLines(
  COMPANY.registeredOffice.name,
  COMPANY.registeredOffice.line1,
  COMPANY.registeredOffice.line2,
  COMPANY.registeredOffice.line3
);

export const REGISTERED_OFFICE_INLINE = `${COMPANY.registeredOffice.line1}, ${COMPANY.registeredOffice.line3}`;
