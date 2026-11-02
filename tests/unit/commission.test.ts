import { describe, expect, it } from "vitest";
import {
  COMMISSION_FORM_TYPE,
  COMMISSION_TERMS,
  isCommissionForm,
  isCommissionIntern,
  offerPayIsSet,
} from "@/lib/hiring/commission";
import { JOB_FORM_TYPES, usesInterviewBot } from "@/lib/hiring/expert-network";
import { SALES_INTERN_JOB } from "@/lib/hiring/sales-intern-job";

describe("commission internships", () => {
  it("lets a commission intern's offer go out with no stipend", () => {
    expect(offerPayIsSet({ compensationType: "COMMISSION", stipendPaise: 0 })).toBe(true);
  });

  it("still requires a stipend for everyone else", () => {
    expect(offerPayIsSet({ compensationType: "STIPEND", stipendPaise: 0 })).toBe(false);
    expect(offerPayIsSet({ compensationType: null, stipendPaise: 0 })).toBe(false);
    expect(offerPayIsSet({ compensationType: "STIPEND", stipendPaise: 100 })).toBe(true);
  });

  it("recognises only the commission form and compensation type", () => {
    expect(isCommissionForm(COMMISSION_FORM_TYPE)).toBe(true);
    expect(isCommissionForm("STANDARD")).toBe(false);
    expect(isCommissionIntern({ compensationType: "STIPEND" })).toBe(false);
  });

  it("sends only the standard form to the Interview Bot", () => {
    expect(usesInterviewBot("STANDARD")).toBe(true);
    expect(usesInterviewBot("EXPERT_NETWORK")).toBe(false);
    expect(usesInterviewBot(COMMISSION_FORM_TYPE)).toBe(false);
  });

  it("states the risk plainly in the letter and the job post", () => {
    expect(COMMISSION_TERMS[0].body).toContain("no guaranteed minimum");
    expect(SALES_INTERN_JOB.description).toContain("no fixed stipend");
    expect(SALES_INTERN_JOB.salaryInfo).toContain("No fixed stipend");
    expect(JOB_FORM_TYPES).toContain(SALES_INTERN_JOB.formType);
  });

  it("fits the limits the job form enforces", () => {
    expect(SALES_INTERN_JOB.salaryInfo.length).toBeLessThanOrEqual(200);
    expect(SALES_INTERN_JOB.description.length).toBeLessThanOrEqual(5000);
    expect(SALES_INTERN_JOB.skills.length).toBeLessThanOrEqual(20);
  });
});
