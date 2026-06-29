import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  COMPANY,
  REGISTERED_OFFICE_INLINE,
  REGISTERED_OFFICE_TEXT,
} from "@/lib/company";
import {
  BRAND_COLORS,
  BrandLogoMark,
  OfferLetterFooter,
  OfferLetterWatermark,
} from "@/lib/pdf-brand";

/* ── brand palette (matches intelliforge.tech) ─────────── */
const C = BRAND_COLORS;

/* ── shared styles ─────────────────────────────────────── */
const base = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 82,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    backgroundColor: C.white,
  },
});

/* ── offer letter styles ───────────────────────────────── */
const o = StyleSheet.create({
  accentBar: { height: 6, backgroundColor: C.indigo },
  header: {
    backgroundColor: C.slate900, paddingVertical: 16, paddingHorizontal: 50,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  headerBrandRow: { flexDirection: "row", alignItems: "center" },
  headerBrandText: { marginLeft: 12 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.white, letterSpacing: 0.5 },
  brandAccent: { color: C.indigoLight },
  legalName: { fontSize: 8.5, color: C.slate300, marginTop: 3, letterSpacing: 0.2 },
  brandTag: { fontSize: 8.5, color: C.slate300, marginTop: 2, letterSpacing: 0.3 },
  missionBadge: {
    fontSize: 6.5,
    color: C.indigoLight,
    marginTop: 4,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3,
  },
  officeBlock: { marginTop: 8, maxWidth: 280 },
  officeLabel: { fontSize: 7, color: C.slate500, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 2 },
  officeLine: { fontSize: 7.5, color: C.slate300, lineHeight: 1.45 },
  refBox: { alignItems: "flex-end" },
  refText: { fontSize: 8.5, color: C.slate300 },
  body: { paddingHorizontal: 50, paddingTop: 18 },
  titleBar: {
    backgroundColor: C.indigo, borderRadius: 4, paddingVertical: 6,
    paddingHorizontal: 16, marginBottom: 14, alignSelf: "center",
  },
  titleText: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.white, letterSpacing: 0.6, textAlign: "center" },
  greeting: { fontSize: 10.5, color: C.slate700, lineHeight: 1.6 },
  para: { fontSize: 10, color: C.slate700, lineHeight: 1.65, marginTop: 8 },
  tableWrap: {
    marginTop: 12, marginBottom: 12, borderRadius: 4,
    border: `1px solid ${C.slate300}`, overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: C.slate900, paddingVertical: 5, paddingHorizontal: 14,
  },
  tableHeaderText: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.white, letterSpacing: 0.4 },
  row: { flexDirection: "row", borderBottom: `1px solid ${C.slate300}` },
  rowAlt: { backgroundColor: C.slate100 },
  cell: { paddingVertical: 6, paddingHorizontal: 14 },
  cellLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.slate900, width: 155 },
  cellValue: { fontSize: 10, color: C.slate700, flex: 1 },
  cellValueMultiline: { fontSize: 9.5, color: C.slate700, flex: 1, lineHeight: 1.45 },
  sectionTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: C.slate900, marginTop: 10, marginBottom: 4 },
  term: { fontSize: 9, color: C.slate700, lineHeight: 1.55, marginBottom: 2 },
  acceptBox: {
    marginTop: 10, padding: 10, backgroundColor: "#eef2ff",
    borderRadius: 4, borderLeft: `3px solid ${C.indigo}`,
  },
  acceptText: { fontSize: 9.5, color: C.indigoDark, lineHeight: 1.5 },
  sigSection: { marginTop: 24, flexDirection: "row", justifyContent: "space-between" },
  sigBlock: { width: "42%" },
  sigLine: { borderTop: `1.5px solid ${C.slate900}`, marginTop: 28, paddingTop: 5 },
  sigName: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.slate900 },
  sigRole: { fontSize: 8, color: C.slate500, marginTop: 1 },
  page2Header: {
    backgroundColor: C.slate900,
    paddingVertical: 10,
    paddingHorizontal: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  page2Title: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.white },
  page2Sub: { fontSize: 7.5, color: C.slate300, marginTop: 2 },
});

interface OfferLetterProps {
  internName: string;
  role: string;
  stipendINR: string;
  startDate: string;
  durationWeeks: number;
  college: string;
}

export function OfferLetterPDF({
  internName,
  role,
  stipendINR,
  startDate,
  durationWeeks,
  college,
}: OfferLetterProps) {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const refDateKey = new Date().toISOString().slice(0, 10);
  const refHash = Array.from(internName + refDateKey).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );
  const refNum = 1000 + (refHash % 9000);
  const refStr = `IF/INTERN/${new Date().getFullYear()}/${refNum}`;

  const details: { label: string; value: string; multiline?: boolean }[] = [
    { label: "Legal Entity", value: COMPANY.legalName },
    { label: "Position", value: role },
    { label: "Monthly Stipend", value: stipendINR },
    { label: "Start Date", value: startDate },
    { label: "Duration", value: `${durationWeeks} weeks` },
    { label: "Work Mode", value: "Hybrid (Remote / On-site)" },
    {
      label: "Registered Office",
      value: REGISTERED_OFFICE_TEXT,
      multiline: true,
    },
    { label: "Reporting To", value: `${COMPANY.brandName} — HR Team` },
  ];

  return (
    <Document>
      <Page size="A4" style={base.page}>
        <OfferLetterWatermark />

        {/* accent bar */}
        <View style={o.accentBar} />

        {/* header */}
        <View style={o.header}>
          <View style={o.headerBrandRow}>
            <BrandLogoMark size={38} gradientId="ifHdGrad" />
            <View style={o.headerBrandText}>
              <Text style={o.brand}>
                Intelli<Text style={o.brandAccent}>Forge</Text> AI
              </Text>
              <Text style={o.legalName}>{COMPANY.legalName}</Text>
              <Text style={o.brandTag}>{COMPANY.elevatorPitch}</Text>
              <Text style={o.missionBadge}>{COMPANY.missionLabel}</Text>
              <View style={o.officeBlock}>
                <Text style={o.officeLabel}>Registered Office</Text>
                <Text style={o.officeLine}>{COMPANY.registeredOffice.name}</Text>
                <Text style={o.officeLine}>{COMPANY.registeredOffice.line1}</Text>
                <Text style={o.officeLine}>{COMPANY.registeredOffice.line2}</Text>
                <Text style={o.officeLine}>{COMPANY.registeredOffice.line3}</Text>
              </View>
            </View>
          </View>
          <View style={o.refBox}>
            <Text style={o.refText}>Date: {today}</Text>
            <Text style={[o.refText, { marginTop: 2 }]}>Ref: {refStr}</Text>
          </View>
        </View>

        {/* body */}
        <View style={o.body}>
          {/* title badge */}
          <View style={o.titleBar}>
            <Text style={o.titleText}>INTERNSHIP OFFER LETTER</Text>
          </View>

          {/* greeting */}
          <Text style={o.greeting}>Dear <Text style={{ fontFamily: "Helvetica-Bold" }}>{internName}</Text>,</Text>
          <Text style={o.para}>
            We are delighted to extend this formal offer of internship at {COMPANY.brandName},
            a brand of {COMPANY.legalName}. Based on your academic credentials at {college} and
            demonstrated aptitude, we are confident you will make a meaningful contribution to our team.
          </Text>
          <Text style={o.para}>
            Your internship may be carried out remotely or on-site at our Hyderabad office
            ({REGISTERED_OFFICE_INLINE}), as agreed with your mentor. The terms and details of your
            engagement are outlined on the following page.
          </Text>

          {/* details table */}
          <View style={o.tableWrap}>
            <View style={o.tableHeader}>
              <Text style={o.tableHeaderText}>INTERNSHIP DETAILS</Text>
            </View>
            {details.map(({ label, value, multiline }, i) => (
              <View
                key={label}
                style={[
                  o.row,
                  i % 2 === 1 ? o.rowAlt : {},
                  i === details.length - 1 ? { borderBottom: "none" } : {},
                ]}
              >
                <Text style={[o.cell, o.cellLabel]}>{label}</Text>
                <Text style={[o.cell, multiline ? o.cellValueMultiline : o.cellValue]}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <OfferLetterFooter refStr={refStr} pageLabel="Page 1 of 2" />
      </Page>

      <Page size="A4" style={base.page}>
        <OfferLetterWatermark />

        <View style={o.accentBar} />

        <View style={o.page2Header}>
          <View>
            <Text style={o.page2Title}>
              Intelli<Text style={o.brandAccent}>Forge</Text> AI — Internship Offer Letter
            </Text>
            <Text style={o.page2Sub}>Terms &amp; Conditions &bull; {internName}</Text>
          </View>
          <View style={o.refBox}>
            <Text style={o.refText}>Ref: {refStr}</Text>
          </View>
        </View>

        <View style={o.body}>
          <Text style={[o.sectionTitle, { marginTop: 0 }]}>Terms &amp; Conditions</Text>
          <Text style={o.term}>1. This internship is for the specified duration and may be extended by mutual agreement.</Text>
          <Text style={o.term}>2. You will be expected to follow {COMPANY.brandName} policies, maintain professionalism, and meet assigned deliverables. On-site days at the registered office may be scheduled by your mentor as required.</Text>
          <Text style={o.term}>3. The stipend will be disbursed monthly upon satisfactory performance.</Text>
          <Text style={o.term}>4. A Certificate of Completion will be issued upon successful completion of the programme.</Text>
          <Text style={o.term}>5. Either party may terminate this engagement with 7 days written notice.</Text>

          <View style={o.acceptBox}>
            <Text style={o.acceptText}>
              To accept this offer, please reply to the email with &quot;I Accept&quot; or sign in to the
              portal at {COMPANY.portalHost}/offer and click &quot;Accept &amp; Sign&quot;.
            </Text>
          </View>

          <View style={o.sigSection}>
            <View style={o.sigBlock}>
              <View style={o.sigLine}>
                <Text style={o.sigName}>{COMPANY.legalName}</Text>
                <Text style={o.sigRole}>Authorized Signatory</Text>
              </View>
            </View>
            <View style={o.sigBlock}>
              <View style={o.sigLine}>
                <Text style={o.sigName}>{internName}</Text>
                <Text style={o.sigRole}>Intern Acceptance</Text>
              </View>
            </View>
          </View>
        </View>

        <OfferLetterFooter refStr={refStr} pageLabel="Page 2 of 2" />
      </Page>
    </Document>
  );
}

/* ── completion certificate styles ──────────────────────── */
const cert = StyleSheet.create({
  border: {
    position: "absolute", top: 20, left: 20, right: 20, bottom: 20,
    border: `2px solid ${C.indigo}`, borderRadius: 2,
  },
  innerBorder: {
    position: "absolute", top: 26, left: 26, right: 26, bottom: 26,
    border: `0.5px solid ${C.slate300}`, borderRadius: 1,
  },
  content: { paddingHorizontal: 60, paddingTop: 50, alignItems: "center" },
  topBar: { width: 80, height: 4, backgroundColor: C.indigo, borderRadius: 2, marginBottom: 20 },
  brand: { fontSize: 26, fontFamily: "Helvetica-Bold", color: C.slate900, letterSpacing: 1 },
  brandTag: { fontSize: 9, color: C.slate500, marginTop: 3, letterSpacing: 0.5 },
  divider: { width: 200, height: 1, backgroundColor: C.slate300, marginVertical: 18 },
  certTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.indigo, letterSpacing: 2, marginBottom: 24 },
  preText: { fontSize: 12, color: C.slate500, marginBottom: 6 },
  name: { fontSize: 26, fontFamily: "Helvetica-Bold", color: C.slate900, marginBottom: 4 },
  college: { fontSize: 11, color: C.slate500, marginBottom: 20 },
  bodyText: { fontSize: 11, color: C.slate700, lineHeight: 1.8, textAlign: "center", maxWidth: 400 },
  commendation: { fontSize: 10.5, color: C.slate700, lineHeight: 1.7, textAlign: "center", marginTop: 14, maxWidth: 380, fontStyle: "italic" },
  sigSection: { marginTop: 50, flexDirection: "row", justifyContent: "space-between", width: "100%", paddingHorizontal: 10 },
  sigBlock: { width: "38%", alignItems: "center" },
  sigLine: { borderTop: `1.5px solid ${C.slate900}`, width: "100%", paddingTop: 6, alignItems: "center" },
  sigName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.slate900 },
  sigRole: { fontSize: 8.5, color: C.slate500, marginTop: 1 },
  certId: { position: "absolute", bottom: 35, fontSize: 7.5, color: C.slate500 },
});

interface CompletionCertProps {
  internName: string;
  role: string;
  startDate: string;
  durationWeeks: number;
  college: string;
}

export function CompletionCertPDF({
  internName,
  role,
  startDate,
  durationWeeks,
  college,
}: CompletionCertProps) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationWeeks * 7);

  const certHash = Array.from(internName + startDate).reduce(
    (acc, char) => acc + char.charCodeAt(0), 0
  );
  const certId = `IF/CERT/${new Date().getFullYear()}/${(1000 + (certHash % 9000))}`;

  return (
    <Document>
      <Page size="A4" style={[base.page, { paddingBottom: 0 }]}>
        {/* decorative double border */}
        <View style={cert.border} />
        <View style={cert.innerBorder} />

        <View style={cert.content}>
          <View style={cert.topBar} />
          <Text style={cert.brand}>IntelliForge AI</Text>
          <Text style={cert.brandTag}>Artificial Intelligence &bull; Machine Learning &bull; Innovation</Text>
          <View style={cert.divider} />

          <Text style={cert.certTitle}>CERTIFICATE OF COMPLETION</Text>

          <Text style={cert.preText}>This is to certify that</Text>
          <Text style={cert.name}>{internName}</Text>
          <Text style={cert.college}>from {college}</Text>

          <Text style={cert.bodyText}>
            has successfully completed a {durationWeeks}-week internship as a{"\n"}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{role}</Text> at IntelliForge AI{"\n"}
            from {new Date(startDate).toLocaleDateString("en-IN")} to {endDate.toLocaleDateString("en-IN")}.
          </Text>

          <Text style={cert.commendation}>
            During the internship, {internName} demonstrated commendable skills,
            dedication, and exemplary professional conduct deserving of this recognition.
          </Text>

          <View style={cert.sigSection}>
            <View style={cert.sigBlock}>
              <View style={cert.sigLine}>
                <Text style={cert.sigName}>IntelliForge AI</Text>
                <Text style={cert.sigRole}>Director</Text>
              </View>
            </View>
            <View style={cert.sigBlock}>
              <View style={cert.sigLine}>
                <Text style={cert.sigName}>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</Text>
                <Text style={cert.sigRole}>Date of Issue</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={cert.certId}>{certId}  |  www.intelliforge.tech  |  &copy; {new Date().getFullYear()} IntelliForge AI</Text>
      </Page>
    </Document>
  );
}
