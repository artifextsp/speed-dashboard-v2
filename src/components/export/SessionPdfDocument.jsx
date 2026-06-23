import {
  Document,
  Page,
  Text,
  View,
  Link,
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

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.55,
    color: "#1a1a1a",
  },
  headerBrand: {
    fontSize: 9,
    letterSpacing: 2,
    color: "#534AB7",
    fontWeight: 700,
    marginBottom: 20,
  },
  phaseTag: {
    fontSize: 9,
    color: "#666",
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: 10,
    lineHeight: 1.25,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  metaPill: {
    fontSize: 9,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  metaText: {
    fontSize: 9.5,
    color: "#666",
    marginBottom: 4,
  },
  goalBox: {
    marginTop: 14,
    marginBottom: 22,
    padding: 12,
    borderLeftWidth: 3,
    backgroundColor: "#fafaf8",
  },
  goalLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: "#534AB7",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  goalText: {
    fontSize: 10.5,
    color: "#333",
  },
  section: {
    marginBottom: 18,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  sectionNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 5,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: 700,
    color: "#1a1a1a",
    paddingTop: 2,
  },
  sectionDesc: {
    fontSize: 9.5,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 8,
    marginLeft: 32,
  },
  blockParagraph: {
    marginBottom: 8,
    marginLeft: 32,
    color: "#333",
  },
  blockHeading: {
    marginBottom: 6,
    marginLeft: 32,
    fontWeight: 700,
    color: "#1a1a1a",
  },
  h1: { fontSize: 14 },
  h2: { fontSize: 12.5 },
  h3: { fontSize: 11.5 },
  blockQuote: {
    marginBottom: 8,
    marginLeft: 40,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#ccc",
    color: "#555",
    fontStyle: "italic",
  },
  blockCode: {
    marginBottom: 8,
    marginLeft: 32,
    padding: 8,
    backgroundColor: "#f5f5f0",
    fontFamily: "Courier",
    fontSize: 9,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
    marginLeft: 32,
    paddingRight: 8,
  },
  listBullet: {
    width: 14,
    fontSize: 10,
    color: "#666",
  },
  listContent: {
    flex: 1,
  },
  link: {
    color: "#185FA5",
    textDecoration: "underline",
  },
  videoLink: {
    color: "#D85A30",
    textDecoration: "underline",
    fontWeight: 700,
  },
  bold: { fontWeight: 700 },
  italic: { fontStyle: "italic" },
  strike: { textDecoration: "line-through" },
  codeInline: {
    fontFamily: "Courier",
    backgroundColor: "#f0f0eb",
    fontSize: 9.5,
  },
  imageRef: {
    marginBottom: 6,
    marginLeft: 32,
    fontSize: 9.5,
    color: "#534AB7",
  },
  resourcesTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    color: "#1a1a1a",
  },
  resourceRow: {
    marginBottom: 6,
    marginLeft: 8,
  },
  resourceKind: {
    fontSize: 8,
    color: "#999",
    marginBottom: 1,
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 8,
    fontSize: 8,
    color: "#999",
  },
  emptyNote: {
    marginLeft: 32,
    color: "#999",
    fontStyle: "italic",
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

function PdfBlock({ block, phaseColor }) {
  switch (block.type) {
    case "heading": {
      const depthStyle =
        block.depth <= 1 ? styles.h1 : block.depth === 2 ? styles.h2 : styles.h3;
      return (
        <Text style={[styles.blockHeading, depthStyle]}>
          <PdfInlineParts parts={block.parts} />
        </Text>
      );
    }
    case "paragraph":
      return (
        <Text style={styles.blockParagraph}>
          <PdfInlineParts parts={block.parts} />
        </Text>
      );
    case "blockquote":
      return (
        <Text style={styles.blockQuote}>
          <PdfInlineParts parts={block.parts} />
        </Text>
      );
    case "code":
      return <Text style={styles.blockCode}>{block.text}</Text>;
    case "list":
      return (
        <View>
          {block.items.map((item, i) => (
            <View key={`li-${i}`} style={styles.listItem}>
              <Text style={styles.listBullet}>
                {block.ordered ? `${i + 1}.` : "•"}
              </Text>
              <View style={styles.listContent}>
                <Text>
                  <PdfInlineParts parts={item.parts} />
                </Text>
              </View>
            </View>
          ))}
        </View>
      );
    case "image":
      return (
        <Text style={styles.imageRef}>
          <Link src={block.src} style={styles.link}>
            [Imagen: {block.alt}] — {block.src}
          </Link>
        </Text>
      );
    case "video":
      return (
        <Text style={[styles.blockParagraph, { marginLeft: 32 }]}>
          <Link src={block.url} style={styles.videoLink}>
            {block.text}
          </Link>
        </Text>
      );
    case "hr":
      return (
        <View
          style={{
            marginVertical: 8,
            marginLeft: 32,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e5e5",
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
          <PdfBlock key={`${component.id}-b-${i}`} block={block} phaseColor={phaseColor} />
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
        <Text style={styles.headerBrand}>SPEED · PROYECTO SPEED</Text>
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
          <View wrap={false}>
            <Text style={styles.resourcesTitle}>Recursos multimedia y enlaces</Text>
            {resources.map((r, i) => (
              <View key={`res-${i}`} style={styles.resourceRow}>
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
