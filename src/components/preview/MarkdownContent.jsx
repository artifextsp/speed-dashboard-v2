import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { normalizeUrl } from "../../kernel/urlUtils";

export function MarkdownContent({ children }) {
  if (!children) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        a: ({ href, children, ...props }) => (
          <a
            href={normalizeUrl(href)}
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        ),
        iframe: ({ src, title, ...props }) => (
          <div className="markdown-embed markdown-embed--video">
            <iframe src={src} title={title || "Video"} {...props} />
          </div>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
