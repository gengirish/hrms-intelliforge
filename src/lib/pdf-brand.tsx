import {
  View,
  Text,
  StyleSheet,
  Svg,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from "@react-pdf/renderer";
import { COMPANY } from "@/lib/company";

export const BRAND_COLORS = {
  indigo: "#6366f1",
  indigoLight: "#818cf8",
  indigoDark: "#4f46e5",
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate300: "#cbd5e1",
  slate100: "#f1f5f9",
  white: "#ffffff",
} as const;

const wm = StyleSheet.create({
  confidential: {
    position: "absolute",
    top: 120,
    right: 48,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: BRAND_COLORS.slate300,
    opacity: 0.55,
    letterSpacing: 1.2,
    transform: "rotate(-32deg)",
  },
});

const ft = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BRAND_COLORS.slate900,
  },
  accent: { height: 3, backgroundColor: BRAND_COLORS.indigo },
  body: {
    paddingVertical: 10,
    paddingHorizontal: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandText: { marginLeft: 10 },
  brandName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: BRAND_COLORS.white,
    letterSpacing: 0.3,
  },
  brandAccent: { color: BRAND_COLORS.indigoLight },
  brandPitch: { fontSize: 7, color: BRAND_COLORS.slate300, marginTop: 1 },
  brandUrl: {
    fontSize: 7.5,
    color: BRAND_COLORS.indigoLight,
    marginTop: 2,
    fontFamily: "Helvetica-Bold",
  },
  rightCol: { alignItems: "flex-end", maxWidth: 240 },
  contactLine: { fontSize: 7, color: BRAND_COLORS.slate300, lineHeight: 1.45, textAlign: "right" },
  legalLine: { fontSize: 6.5, color: BRAND_COLORS.slate500, marginTop: 3, textAlign: "right", lineHeight: 1.4 },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingVertical: 5,
    paddingHorizontal: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomText: { fontSize: 6.5, color: BRAND_COLORS.slate500 },
  mission: {
    fontSize: 6.5,
    color: BRAND_COLORS.indigoLight,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3,
  },
});

export function BrandLogoMark({
  size = 32,
  gradientId = "ifLogoGrad",
}: {
  size?: number;
  gradientId?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={BRAND_COLORS.indigo} />
          <Stop offset="100%" stopColor={BRAND_COLORS.indigoLight} />
        </LinearGradient>
      </Defs>
      <Rect width="512" height="512" rx="108" fill={`url(#${gradientId})`} />
      <Text
        x="256"
        y="330"
        style={{
          fontSize: 230,
          fontFamily: "Helvetica-Bold",
          fill: BRAND_COLORS.white,
          textAnchor: "middle",
        }}
      >
        IF
      </Text>
    </Svg>
  );
}

export function OfferLetterWatermark() {
  return (
    <View fixed>
      <Text style={wm.confidential}>CONFIDENTIAL</Text>
    </View>
  );
}

export function OfferLetterFooter({
  refStr,
  pageLabel,
}: {
  refStr: string;
  pageLabel?: string;
}) {
  const year = new Date().getFullYear();
  const refDisplay = pageLabel ? `${refStr}  |  ${pageLabel}` : refStr;

  return (
    <View style={ft.wrap} fixed>
      <View style={ft.accent} />
      <View style={ft.body}>
        <View style={ft.brandRow}>
          <BrandLogoMark size={30} gradientId="ifFtGrad" />
          <View style={ft.brandText}>
            <Text style={ft.brandName}>
              Intelli<Text style={ft.brandAccent}>Forge</Text> AI
            </Text>
            <Text style={ft.brandPitch}>{COMPANY.elevatorPitch}</Text>
            <Text style={ft.brandUrl}>{COMPANY.websiteUrl}</Text>
          </View>
        </View>
        <View style={ft.rightCol}>
          <Text style={ft.contactLine}>
            {COMPANY.email} &bull; {COMPANY.contactEmail}
          </Text>
          <Text style={ft.contactLine}>{COMPANY.phone}</Text>
          <Text style={ft.contactLine}>{COMPANY.portalHost}</Text>
          <Text style={ft.legalLine}>
            {COMPANY.legalName}
            {"\n"}
            {COMPANY.registeredOffice.name}, {COMPANY.registeredOffice.line3}
          </Text>
        </View>
      </View>
      <View style={ft.bottomBar}>
        <Text style={ft.bottomText}>
          &copy; {year} {COMPANY.brandName}. {COMPANY.proprietorship}
        </Text>
        <Text style={ft.mission}>{COMPANY.missionLabel}</Text>
        <Text style={ft.bottomText}>{refDisplay}</Text>
      </View>
    </View>
  );
}
