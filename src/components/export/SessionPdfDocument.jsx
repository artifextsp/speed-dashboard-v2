import {
  Document,
  Page,
  Text,
  View,
  Link,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { MODALITY_LABELS, PHASE_COLORS } from "../../utils/constants";
import { resolveClassComponents } from "../../kernel/legacyMigration";
import { withDisplayNumbers } from "../../kernel/componentManager";
import { getStatusConfig } from "../../kernel/statusManager";
import {
  markdownToPdfBlocks,
  collectPdfResources,
} from "../../kernel/markdownToPdfBlocks";
import { PDF_LOGO_SOURCES } from "../../utils/siteAssets.js";

const SPEED_ORANGE = "#D85A30";

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.65,
    color: "#2a2a2a",
    backgroundColor: "#ffffff",
  },
  instHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ececf0",
  },
  instHeaderText: {
    flex: 1,
    paddingRight: 16,
    flexDirection: "column",
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
    marginTop: 2,
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
  topRule: {
    height: 3,
    backgroundColor: SPEED_ORANGE,
    marginBottom: 16,
    borderRadius: 2,
  },
  headerBrand: {
    fontSize: 8,
    letterSpacing: 2.5,
    color: "#888",
    fontWeight: 700,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  phaseTag: {
    fontSize: 9,
    color: "#888",
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111",
    marginBottom: 14,
    lineHeight: 1.3,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metaPill: {
    fontSize: 8.5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    fontWeight: 700,
  },
  metaText: {
    fontSize: 9,
    color: "#777",
    marginBottom: 3,
  },
  goalBox: {
    marginTop: 8,
    marginBottom: 28,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    borderRadius: 4,
    backgroundColor: "#f8f7fd",
  },
  goalLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: SPEED_ORANGE,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  goalText: {
    fontSize: 10.5,
    color: "#333",
    lineHeight: 1.55,
  },
  section: {
    marginBottom: 22,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ececf0",
  },
  sectionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 6,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: 700,
    color: "#111",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  sectionDesc: {
    fontSize: 9,
    color: "#777",
    fontStyle: "italic",
    marginBottom: 10,
    marginLeft: 36,
    lineHeight: 1.5,
  },
  contentBlock: {
    marginLeft: 36,
    paddingRight: 4,
  },
  blockParagraph: {
    marginBottom: 10,
    color: "#333",
    lineHeight: 1.65,
  },
  blockHeading: {
    marginBottom: 8,
    marginTop: 4,
    fontWeight: 700,
    color: "#111",
  },
  h1: { fontSize: 13.5, marginTop: 6 },
  h2: { fontSize: 12, marginTop: 4 },
  h3: { fontSize: 11 },
  blockQuote: {
    marginBottom: 10,
    paddingLeft: 12,
    paddingVertical: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#d8d6f0",
    color: "#555",
    fontStyle: "italic",
  },
  blockCode: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#f5f5f8",
    fontFamily: "Courier",
    fontSize: 8.5,
    borderRadius: 4,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 6,
    paddingRight: 8,
  },
  listBullet: {
    width: 16,
    fontSize: 10,
    color: "#534AB7",
    fontWeight: 700,
  },
  listContent: {
    flex: 1,
  },
  link: {
    color: "#185FA5",
    textDecoration: "underline",
  },
  videoLink: {
    color: "#C44D20",
    textDecoration: "underline",
    fontWeight: 700,
  },
  bold: { fontWeight: 700 },
  italic: { fontStyle: "italic" },
  strike: { textDecoration: "line-through" },
  codeInline: {
    fontFamily: "Courier",
    backgroundColor: "#f0f0f4",
    fontSize: 9,
  },
  imageRef: {
    marginBottom: 8,
    fontSize: 9,
    color: "#534AB7",
  },
  resourcesBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#fafaf8",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ececf0",
  },
  resourcesTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 10,
    color: "#111",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  resourceRow: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  resourceKind: {
    fontSize: 7.5,
    color: "#999",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#ececf0",
    paddingTop: 10,
    fontSize: 7.5,
    color: "#aaa",
  },
  emptyNote: {
    marginLeft: 36,
    color: "#aaa",
    fontStyle: "italic",
    fontSize: 9.5,
  },
});

function PdfInlineParts({ parts, linkStyle, videoStyle }) {
  if (!parts?.length) return null;

  return (
    <Text>
      {parts.map((part, index) => {
        const key = `p-${index}`;
        if (part.type === "link") {
          return (
            <Link key={key} src={part.href} style={linkStyle || styles.link}>
              {part.text}
            </Link>
          );
        }
        if (part.type === "video") {
          return (
            <Link key={key} src={part.url} style={videoStyle || styles.videoLink}>
              {part.text}
            </Link>
          );
        }
        if (part.type === "image") {
          return (
            <Link key={key} src={part.src} style={styles.link}>
              [Imagen: {part.alt}]
            </Link>
          );
        }
        const inlineStyle = [
          part.bold ? styles.bold : null,
          part.italic ? styles.italic : null,
          part.strike ? styles.strike : null,
          part.code ? styles.codeInline : null,
        ].filter(Boolean);
        return (
          <Text key={key} style={inlineStyle}>
            {part.text}
          </Text>
        );
      })}
    </Text>
  );
}

function PdfBlock({ block }) {
  const wrap = (node) => <View style={styles.contentBlock}>{node}</View>;

  switch (block.type) {
    case "heading": {
      const depthStyle =
        block.depth <= 1 ? styles.h1 : block.depth === 2 ? styles.h2 : styles.h3;
      return wrap(
        <Text style={[styles.blockHeading, depthStyle]}>
          <PdfInlineParts parts={block.parts} />
        </Text>
      );
    }
    case "paragraph":
      return wrap(
        <Text style={styles.blockParagraph}>
          <PdfInlineParts parts={block.parts} />
        </Text>
      );
    case "blockquote":
      return wrap(
        <Text style={styles.blockQuote}>
          <PdfInlineParts parts={block.parts} />
        </Text>
      );
    case "code":
      return wrap(<Text style={styles.blockCode}>{block.text}</Text>);
    case "list":
      return wrap(
        <View>
          {block.items.map((item, i) => (
            <View key={`li-${i}`} style={styles.listItem}>
              <Text style={styles.listBullet}>
                {block.ordered ? `${i + 1}.` : "•"}
              </Text>
              <View style={styles.listContent}>
                <Text style={styles.blockParagraph}>
                  <PdfInlineParts parts={item.parts} />
                </Text>
              </View>
            </View>
          ))}
        </View>
      );
    case "image":
      return wrap(
        <Text style={styles.imageRef}>
          <Link src={block.src} style={styles.link}>
            Imagen: {block.alt}
          </Link>
        </Text>
      );
    case "video":
      return wrap(
        <Text style={styles.blockParagraph}>
          <Link src={block.url} style={styles.videoLink}>
            ▶ {block.text}
          </Link>
        </Text>
      );
    case "hr":
      return wrap(
        <View
          style={{
            marginVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#ececf0",
          }}
        />
      );
    default:
      return null;
  }
}

function ComponentSection({ component, phaseColor }) {
  const blocks = markdownToPdfBlocks(component.content);
  const title = component.name || `Componente ${component.displayNumber}`;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionNumber, { backgroundColor: phaseColor }]}>
          {component.displayNumber}
        </Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {component.description ? (
        <Text style={styles.sectionDesc}>{component.description}</Text>
      ) : null}
      {blocks.length === 0 ? (
        <Text style={styles.emptyNote}>Sin contenido en este componente.</Text>
      ) : (
        blocks.map((block, i) => (
          <PdfBlock key={`${component.id}-b-${i}`} block={block} />
        ))
      )}
    </View>
  );
}

export function SessionPdfDocument({ session, phase, videos = [] }) {
  const phaseColor = PHASE_COLORS[phase?.code] || "#534AB7";
  const statusCfg = getStatusConfig(session.status);
  const components = withDisplayNumbers(resolveClassComponents(session));

  const allBlocks = components.flatMap((c) => markdownToPdfBlocks(c.content));
  const resources = collectPdfResources(allBlocks, videos);

  const titlePrefix = session.session_number
    ? `Sesión ${session.session_number}: `
    : "";

  const metaParts = [
    MODALITY_LABELS[session.modality],
    session.scheduled_date,
    session.duration_estimate,
  ].filter(Boolean);

  return (
    <Document
      title={`${titlePrefix}${session.title}`}
      author="Proyecto SPEED"
      subject="Síntesis de clase"
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
        <Text style={styles.phaseTag}>
          Fase {phase?.code} — {phase?.title}
        </Text>
        <Text style={styles.title}>
          {titlePrefix}
          {session.title}
        </Text>

        <View style={styles.metaRow}>
          <Text
            style={[
              styles.metaPill,
              {
                color: statusCfg.color,
                borderColor: statusCfg.border,
                backgroundColor: statusCfg.bg,
              },
            ]}
          >
            {statusCfg.label}
          </Text>
        </View>

        {metaParts.map((part, i) => (
          <Text key={`meta-${i}`} style={styles.metaText}>
            {part}
          </Text>
        ))}

        {session.learning_goal ? (
          <View style={[styles.goalBox, { borderLeftColor: phaseColor }]}>
            <Text style={styles.goalLabel}>Lo que vas a lograr hoy</Text>
            <Text style={styles.goalText}>{session.learning_goal}</Text>
          </View>
        ) : null}

        {components.length === 0 ? (
          <Text style={styles.emptyNote}>
            Esta clase aún no tiene componentes definidos.
          </Text>
        ) : (
          components.map((comp) => (
            <ComponentSection
              key={comp.id}
              component={comp}
              phaseColor={phaseColor}
            />
          ))
        )}

        {resources.length > 0 && (
          <View style={styles.resourcesBox} wrap={false}>
            <Text style={styles.resourcesTitle}>Recursos multimedia y enlaces</Text>
            {resources.map((r, i) => (
              <View
                key={`res-${i}`}
                style={[
                  styles.resourceRow,
                  i === resources.length - 1 ? { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 } : null,
                ]}
              >
                <Text style={styles.resourceKind}>
                  {r.kind === "video"
                    ? "Video"
                    : r.kind === "image"
                      ? "Imagen"
                      : "Enlace"}
                  {r.timing ? ` · ${r.timing}` : ""}
                </Text>
                <Link
                  src={r.url}
                  style={r.kind === "video" ? styles.videoLink : styles.link}
                >
                  {r.label}
                </Link>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>Proyecto SPEED · Uniminuto 2026</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
