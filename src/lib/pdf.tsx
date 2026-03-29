import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    borderBottom: "2px solid #1e293b",
    paddingBottom: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
  },
  logoSub: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 20,
    marginTop: 20,
    textAlign: "center",
  },
  body: {
    fontSize: 11,
    lineHeight: 1.8,
    color: "#334155",
  },
  field: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1e293b",
    width: 160,
  },
  value: {
    fontSize: 11,
    color: "#334155",
    flex: 1,
  },
  signatureSection: {
    marginTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBlock: {
    width: "40%",
  },
  signatureLine: {
    borderTop: "1px solid #94a3b8",
    marginTop: 40,
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 10,
    color: "#64748b",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    borderTop: "1px solid #e2e8f0",
    paddingTop: 10,
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>IntelliForge AI</Text>
          <Text style={styles.logoSub}>
            Artificial Intelligence &middot; Machine Learning &middot; Innovation
          </Text>
        </View>

        <Text style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>
          Date: {today}
        </Text>
        <Text style={{ fontSize: 10, color: "#64748b", marginBottom: 20 }}>
          Ref: IF/INTERN/{new Date().getFullYear()}/{refNum}
        </Text>

        <Text style={styles.title}>Internship Offer Letter</Text>

        <Text style={styles.body}>
          Dear {internName},
        </Text>
        <Text style={[styles.body, { marginTop: 10 }]}>
          We are pleased to offer you an internship position at IntelliForge AI.
          Based on your qualifications from {college}, we believe you will be
          a valuable addition to our team.
        </Text>

        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <View style={styles.field}>
            <Text style={styles.label}>Position:</Text>
            <Text style={styles.value}>{role}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Monthly Stipend:</Text>
            <Text style={styles.value}>{stipendINR}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Start Date:</Text>
            <Text style={styles.value}>{startDate}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Duration:</Text>
            <Text style={styles.value}>{durationWeeks} weeks</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>Remote / Hybrid</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Reporting:</Text>
            <Text style={styles.value}>IntelliForge AI HR Team</Text>
          </View>
        </View>

        <Text style={styles.body}>
          Please confirm your acceptance by replying to the email with
          &quot;I Accept&quot; or signing below.
        </Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>IntelliForge AI</Text>
              <Text style={styles.signatureLabel}>Authorized Signatory</Text>
            </View>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>{internName}</Text>
              <Text style={styles.signatureLabel}>Intern</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>IntelliForge AI &middot; www.intelliforge.tech</Text>
          <Text>&copy; 2026 IntelliForge AI. All rights reserved.</Text>
        </View>
      </Page>
    </Document>
  );
}

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

  return (
    <Document>
      <Page size="A4" style={[styles.page, { textAlign: "center" }]}>
        <View style={[styles.header, { textAlign: "center", borderBottom: "3px solid #1e293b" }]}>
          <Text style={[styles.logo, { textAlign: "center" }]}>IntelliForge AI</Text>
          <Text style={[styles.logoSub, { textAlign: "center" }]}>
            Certificate of Internship Completion
          </Text>
        </View>

        <Text style={{ fontSize: 14, color: "#64748b", marginTop: 30, textAlign: "center" }}>
          This is to certify that
        </Text>

        <Text style={{ fontSize: 22, fontWeight: "bold", color: "#1e293b", marginTop: 10, textAlign: "center" }}>
          {internName}
        </Text>

        <Text style={{ fontSize: 11, color: "#64748b", marginTop: 5, textAlign: "center" }}>
          from {college}
        </Text>

        <Text style={{ fontSize: 12, color: "#334155", marginTop: 20, lineHeight: 1.8, textAlign: "center" }}>
          has successfully completed a {durationWeeks}-week internship as a{"\n"}
          <Text style={{ fontWeight: "bold" }}>{role}</Text> at IntelliForge AI{"\n"}
          from {new Date(startDate).toLocaleDateString("en-IN")} to{" "}
          {endDate.toLocaleDateString("en-IN")}.
        </Text>

        <Text style={{ fontSize: 11, color: "#334155", marginTop: 20, textAlign: "center" }}>
          During the internship, {internName} demonstrated commendable skills,
          dedication, and professional conduct.
        </Text>

        <View style={[styles.signatureSection, { marginTop: 80 }]}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>IntelliForge AI</Text>
              <Text style={styles.signatureLabel}>Director</Text>
            </View>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Date</Text>
              <Text style={styles.signatureLabel}>
                {new Date().toLocaleDateString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>IntelliForge AI &middot; www.intelliforge.tech</Text>
          <Text>&copy; 2026 IntelliForge AI. All rights reserved.</Text>
        </View>
      </Page>
    </Document>
  );
}
