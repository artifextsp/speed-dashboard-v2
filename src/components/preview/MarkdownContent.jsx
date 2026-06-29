import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { normalizeUrl, extractYouTubeId, youtubeWatchUrl } from "../../kernel/urlUtils";
import { prepareMarkdownForRender } from "../../kernel/markdownNormalize";
import { friendlyLinkLabel } from "../../utils/enrichContentHtml";
import { MarkdownImage } from "./MarkdownImage";
import { MarkdownEditableTable } from "./MarkdownEditableTable";
import { TABLE_WRAP_CLASS } from "../../kernel/markdownTable";

export function MarkdownContent({
  children,
  compactImages = false,
  editableTables = false,
  onTableChange,
}) {
  if (!children) return null;
  const source = prepareMarkdownForRender(children);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        a: ({ href, children, ...props }) => {
          const safeHref = normalizeUrl(href || "");
          const childText =
            typeof children === "string"
              ? children
              : Array.isArray(children)
                ? children.join("")
                : String(children ?? "");
          return (
            <a
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {friendlyLinkLabel(childText, safeHref)}
            </a>
          );
        },
        img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} compact={compactImages} />,
        table: ({ children, className, ...props }) => (
          <table className={className} {...props}>
            {children}
          </table>
        ),
        div: ({ className, children, ...props }) => {
          if (className?.includes("markdown-spacer")) {
            return <div className="markdown-spacer" aria-hidden="true" />;
          }
          if (className?.includes(TABLE_WRAP_CLASS)) {
            const tableId = props["data-table-id"];
            if (editableTables && onTableChange && tableId) {
              return (
                <MarkdownEditableTable tableId={tableId} onTableChange={onTableChange}>
                  {children}
                </MarkdownEditableTable>
              );
            }
            return (
              <div className={className} data-table-id={tableId}>
                {children}
              </div>
            );
          }
          return <div className={className} {...props} />;
        },
        iframe: ({ src, title, ...props }) => {
          const ytId = extractYouTubeId(src || "");
          return (
            <>
              <div className="markdown-embed markdown-embed--video">
                <iframe src={src} title={title || "Video"} {...props} />
              </div>
              {ytId ? (
                <p className="markdown-video-link">
                  <a
                    href={youtubeWatchUrl(ytId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ▶ Abrir video en YouTube
                  </a>
                </p>
              ) : null}
            </>
          );
        },
      }}
    >
      {source}
    </ReactMarkdown>
  );
}
