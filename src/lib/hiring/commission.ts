/**
 * Commission-only sales internships (AwaazOS outreach). Pure and client-safe.
 *
 * A posting with the SALES_COMMISSION form makes its converted candidates
 * COMMISSION interns: stipend 0 is valid for them, and their offer letter
 * carries COMMISSION_TERMS instead of a monthly stipend.
 *
 * The numbers must match SALES_SHARE_BPS and SALES_SHARE_MONTHS in AwaazOS
 * (lib/sales-earnings.ts), which computes what is actually owed.
 */

export const COMMISSION_FORM_TYPE = "SALES_COMMISSION";
export const COMPENSATION_COMMISSION = "COMMISSION";
export const COMPENSATION_STIPEND = "STIPEND";

export const COMMISSION_SHARE_PERCENT = 50;
export const COMMISSION_MONTHS = 12;

export const COMMISSION_PAY_LABEL = "Commission only, no fixed stipend";
export const COMMISSION_RATE_SUMMARY = `${COMMISSION_SHARE_PERCENT}% of what each store you bring in pays us, excluding GST, for ${COMMISSION_MONTHS} months from its first payment.`;
export const COMMISSION_SUMMARY = `${COMMISSION_RATE_SUMMARY} No fixed stipend and no guaranteed minimum.`;

export const COMMISSION_TERMS: { title: string; body: string }[] = [
  {
    title: "Commission only",
    body: "Commission is your only pay for this internship. There is no fixed stipend and no guaranteed minimum, so you may earn nothing if no store you bring in pays. You will never be asked to pay us anything.",
  },
  {
    title: "Rate",
    body: `You earn ${COMMISSION_SHARE_PERCENT}% of what an eligible store pays for its AwaazOS subscription, excluding GST and net of refunds. At current prices (Rs. 299 a month or Rs. 2,990 a year, excluding GST), that is Rs. 149.50 a month or Rs. 1,495 for a yearly payment, per store.`,
  },
  {
    title: "Eligible stores",
    body: "A store is eligible when you built its demo store from your own AwaazOS sales login, and the seller then claimed that store and paid for a subscription. Direct sign-ups and stores built by anyone else do not count.",
  },
  {
    title: "When commission starts",
    body: "Nothing is earned during a store's free trial. Commission starts with the store's first payment.",
  },
  {
    title: "How long it lasts",
    body: `Commission runs for ${COMMISSION_MONTHS} months from a store's first payment, including after your internship ends. Commission stops if this engagement is ended for fraud or a serious breach of the conduct rules below.`,
  },
  {
    title: "Payment",
    body: "Commission is paid monthly, by the 15th of the following month, for payments we have received. It goes to the bank account you give us, after you provide your PAN, less any tax the law requires us to deduct. Your earnings are shown on your AwaazOS earnings page.",
  },
  {
    title: "Refunds",
    body: "If a store is refunded, the commission on the refunded amount is taken off your next payments.",
  },
  {
    title: "Lead ownership",
    body: "A seller belongs to whoever first built their demo store. If that seller has not become a paying store within 30 days, we may give the lead to someone else.",
  },
  {
    title: "Conduct",
    body: "Say from your first message that you are from IntelliForge, and never pose as a customer. Say that a demo store is a demo with sample orders. Quote only published prices and offer no discounts. Send at most 20 messages a day, send one follow-up, and stop when someone says no. Never take money from a seller, and never share seller details or your login.",
  },
];

type OfferPay = { compensationType?: string | null; stipendPaise: number };

export function isCommissionForm(formType: string | null | undefined): boolean {
  return formType === COMMISSION_FORM_TYPE;
}

export function isCommissionIntern(intern: { compensationType?: string | null }): boolean {
  return intern.compensationType === COMPENSATION_COMMISSION;
}

/** Whether an offer can go out: commission interns have no stipend to set. */
export function offerPayIsSet(intern: OfferPay): boolean {
  return isCommissionIntern(intern) || intern.stipendPaise > 0;
}
