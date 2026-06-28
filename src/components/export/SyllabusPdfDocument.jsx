import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { getPhaseColor } from "../../utils/constants";
import { PDF_LOGO_SOURCES } from "../../utils/siteAssets.js";

const SPEED_ORANGE = "#D85A30";

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.55,
    color: "#2a2a2a",
    backgroundColor: "#ffffff",
  },
  topRule: {
    height: 3,
    backgroundColor: SPEED_ORANGE,
    marginBottom: 18,
    borderRadius: 2,
  },
  instHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ececf0",
  },
  instHeaderText: {
    flex: 1,
    paddingRight: 16,
  },
  speedBrand: {
    fontSize: 26,
    fontWeight: 700,
    color: SPEED_ORANGE,
    letterSpacing: -0.5,
    lineHeight: 1.2,
  },
  speedBrandSpacer: {
    height: 6,
  },
  speedTagline: {
    fontSize: 9.5,
    fontStyle: "italic",
    color: "#9ca3af",
    lineHeight: 1.5,
  },
  instHeaderLogos: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoUniminuto: {
    width: 82,
    height: 58,
    objectFit: "contain",
  },
  logoBogota: {
    width: 110,
    height: 36,
    objectFit: "contain",
  },
  docTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111",
    marginBottom: 6,
    lineHeight: 1.25,
  },
  docSubtitle: {
    fontSize: 10,
    color: "#666",
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 9,
    color: "#888",
    marginBottom: 24,
  },
  phaseSection: {
    marginBottom: 18,
  },
  phaseHeader: {
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 4,
  },
  phaseTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 2,
  },
  phaseSubtitle: {
    fontSize: 9.5,
    color: "#666",
    fontStyle: "italic",
  },
  item: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f3",
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#111",
    marginBottom: 4,
    lineHeight: 1.35,
  },
  itemDescription: {
    fontSize: 10,
    color: "#444",
    lineHeight: 1.55,
    paddingLeft: 2,
  },
  itemDescriptionEmpty: {
    fontSize: 9.5,
    color: "#999",
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    left: 56,
    right: 56,
    bottom: 28,
    fontSize: 8,
    color: "#aaa",
    textAlign: "center",
  },
});

export function SyllabusPdfDocument({ outline }) {
  return (
    <Document
      title={outline.title}
      author="Proyecto SPEED"
      subject="Temario del curso"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule} />
        <View style={styles.instHeader}>
          <View style={styles.instHeaderText}>
            <Text style={styles.speedBrand}>SPEED</Text>
            <View style={styles.speedBrandSpacer} />
            <Text style={styles.speedTagline}>
              Robótica educativa para docentes usando metodologías ABP.
            </Text>
          </View>
          <View style={styles.instHeaderLogos}>
            <Image src={PDF_LOGO_SOURCES.uniminuto} style={styles.logoUniminuto} />
            <Image src={PDF_LOGO_SOURCES.bogota} style={styles.logoBogota} />
          </View>
        </View>

        <Text style={styles.docTitle}>{outline.title}</Text>
        <Text style={styles.docSubtitle}>{outline.subtitle}</Text>
        <Text style={styles.docMeta}>
          {outline.sessionCount} clase{outline.sessionCount === 1 ? "" : "s"} · Generado el{" "}
          {outline.generatedAt}
        </Text>

        {outline.sections.map((section) => {
          const phaseColor = section.phaseColor || getPhaseColor({ code: section.phaseCode, color: section.phaseColor });
          return (
            <View key={section.phaseId || "unassigned"} style={styles.phaseSection}>
              <View style={[styles.phaseHeader, { borderLeftColor: phaseColor }]}>
                <Text style={[styles.phaseTitle, { color: phaseColor }]}>
                  {section.phaseTitle}
                </Text>
                {section.phaseSubtitle ? (
                  <Text style={styles.phaseSubtitle}>{section.phaseSubtitle}</Text>
                ) : null}
              </View>

              {section.items.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Text style={styles.itemTitle}>{item.label}</Text>
                  {item.description ? (
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  ) : (
                    <Text style={styles.itemDescriptionEmpty}>Sin descripción registrada.</Text>
                  )}
                </View>
              ))}
            </View>
          );
        })}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Proyecto SPEED · ${outline.title} · ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
