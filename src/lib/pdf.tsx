import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

/* ── brand palette ─────────────────────────────────────── */
const C = {
  indigo: "#4f46e5",
  indigoDark: "#3730a3",
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate300: "#cbd5e1",
  slate100: "#f1f5f9",
  white: "#ffffff",
  emerald: "#059669",
};

/* ── shared styles ─────────────────────────────────────── */
const base = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 40, paddingHorizontal: 0, fontFamily: "Helvetica", backgroundColor: C.white },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.slate100, paddingVertical: 8, paddingHorizontal: 50,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  footerText: { fontSize: 7.5, color: C.slate500 },
});

/* ── offer letter styles ───────────────────────────────── */
const o = StyleSheet.create({
  accentBar: { height: 6, backgroundColor: C.indigo },
  header: {
    backgroundColor: C.slate900, paddingVertical: 16, paddingHorizontal: 50,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.white, letterSpacing: 0.5 },
  brandTag: { fontSize: 8.5, color: C.slate300, marginTop: 2, letterSpacing: 0.3 },
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
  confidential: {
    position: "absolute", top: 400, left: 140,
    fontSize: 60, color: "#e2e8f0", fontFamily: "Helvetica-Bold",
    opacity: 0.18, transform: "rotate(-35deg)",
  },
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

  const details: [string, string][] = [
    ["Position", role],
    ["Monthly Stipend", stipendINR],
    ["Start Date", startDate],
    ["Duration", `${durationWeeks} weeks`],
    ["Work Mode", "Remote / Hybrid"],
    ["Reporting To", "IntelliForge AI — HR Team"],
  ];

  return (
    <Document>
      <Page size="A4" style={base.page}>
        {/* watermark */}
        <Text style={o.confidential}>CONFIDENTIAL</Text>

        {/* accent bar */}
        <View style={o.accentBar} />

        {/* header */}
        <View style={o.header}>
          <View>
            <Text style={o.brand}>IntelliForge AI</Text>
            <Text style={o.brandTag}>Artificial Intelligence &bull; Machine Learning &bull; Innovation</Text>
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
            We are delighted to extend this formal offer of internship at IntelliForge AI.
            Based on your academic credentials at {college} and demonstrated aptitude, we are
            confident you will make a meaningful contribution to our team.
          </Text>
          <Text style={o.para}>
            The terms and details of your internship engagement are outlined below.
          </Text>

          {/* details table */}
          <View style={o.tableWrap}>
            <View style={o.tableHeader}>
              <Text style={o.tableHeaderText}>INTERNSHIP DETAILS</Text>
            </View>
            {details.map(([label, value], i) => (
              <View
                key={label}
                style={[
                  o.row,
                  i % 2 === 1 ? o.rowAlt : {},
                  i === details.length - 1 ? { borderBottom: "none" } : {},
                ]}
              >
                <Text style={[o.cell, o.cellLabel]}>{label}</Text>
                <Text style={[o.cell, o.cellValue]}>{value}</Text>
              </View>
            ))}
          </View>

          {/* terms */}
          <Text style={o.sectionTitle}>Terms &amp; Conditions</Text>
          <Text style={o.term}>1. This internship is for the specified duration and may be extended by mutual agreement.</Text>
          <Text style={o.term}>2. You will be expected to follow IntelliForge AI policies, maintain professionalism, and meet assigned deliverables.</Text>
          <Text style={o.term}>3. The stipend will be disbursed monthly upon satisfactory performance.</Text>
          <Text style={o.term}>4. A Certificate of Completion will be issued upon successful completion of the programme.</Text>
          <Text style={o.term}>5. Either party may terminate this engagement with 7 days written notice.</Text>

          {/* acceptance CTA */}
          <View style={o.acceptBox}>
            <Text style={o.acceptText}>
              To accept this offer, please reply to the email with &quot;I Accept&quot; or sign in to the
              portal at hrms.intelliforge.tech/offer and click &quot;Accept &amp; Sign&quot;.
            </Text>
          </View>

          {/* signatures */}
          <View style={o.sigSection}>
            <View style={o.sigBlock}>
              <View style={o.sigLine}>
                <Text style={o.sigName}>IntelliForge AI</Text>
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

        {/* footer */}
        <View style={base.footer}>
          <Text style={base.footerText}>IntelliForge AI &bull; www.intelliforge.tech &bull; hr@intelliforge.tech</Text>
          <Text style={base.footerText}>&copy; {new Date().getFullYear()} IntelliForge AI. All rights reserved.  |  {refStr}</Text>
        </View>
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
