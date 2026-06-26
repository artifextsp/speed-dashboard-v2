import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { normalizeUrl, extractYouTubeId, youtubeWatchUrl } from "../../kernel/urlUtils";
import { prepareMarkdownForRender } from "../../kernel/markdownNormalize";
import { friendlyLinkLabel } from "../../utils/enrichContentHtml";
import { MarkdownImage } from "./MarkdownImage";

export function MarkdownContent({ children }) {
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
        img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} />,
        div: ({ className, ...props }) => {
          if (className?.includes("markdown-spacer")) {
            return <div className="markdown-spacer" aria-hidden="true" />;
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
