import MDEditor from "@uiw/react-md-editor";
import * as commands from "@uiw/react-md-editor/commands";
import rehypeRaw from "rehype-raw";
import {
  extractYouTubeId,
  normalizeUrl,
  youtubeEmbedUrl,
} from "../../../kernel/urlUtils";
import {
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconBrandYoutube,
  IconPalette,
  IconTypography,
  IconLink,
} from "@tabler/icons-react";
import "@uiw/react-md-editor/markdown-editor.css";

function makeAlignCommand(align, icon, label) {
  return {
    name: `align-${align}`,
    keyCommand: `align-${align}`,
    buttonProps: { "aria-label": label, title: label },
    icon,
    execute: (state, api) => {
      const text = state.selectedText || "Texto";
      api.replaceSelection(`<div style="text-align: ${align}">\n\n${text}\n\n</div>`);
    },
  };
}

const linkCommand = {
  name: "link",
  keyCommand: "link",
  buttonProps: { "aria-label": "Insertar enlace", title: "Insertar enlace" },
  icon: <IconLink size={13} />,
  execute: (state, api) => {
    const url = window.prompt("URL del enlace (incluye https:// o se agregará automáticamente)");
    if (!url) return;
    const text = state.selectedText || window.prompt("Texto del enlace", "Ver recurso") || "Enlace";
    api.replaceSelection(`[${text}](${normalizeUrl(url)})`);
  },
};

const imageCommand = {
  name: "image",
  keyCommand: "image",
  buttonProps: { "aria-label": "Insertar imagen", title: "Insertar imagen" },
  icon: commands.image.icon,
  execute: (state, api) => {
    const url = window.prompt("URL de la imagen");
    if (!url) return;
    const alt = window.prompt("Descripción de la imagen", "Imagen") || "Imagen";
    api.replaceSelection(`![${alt}](${normalizeUrl(url)})`);
  },
};

const youtubeCommand = {
  name: "youtube",
  keyCommand: "youtube",
  buttonProps: { "aria-label": "Insertar video YouTube", title: "Insertar video YouTube" },
  icon: <IconBrandYoutube size={13} />,
  execute: (state, api) => {
    const url = window.prompt("URL de YouTube");
    if (!url) return;
    const id = extractYouTubeId(url);
    if (!id) {
      window.alert("URL de YouTube no válida");
      return;
    }
    api.replaceSelection(
      `\n\n<div class="markdown-embed markdown-embed--video"><iframe src="${youtubeEmbedUrl(id)}" title="Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>\n\n`
    );
  },
};

const textColorCommand = {
  name: "textColor",
  keyCommand: "textColor",
  buttonProps: { "aria-label": "Color de texto", title: "Color de texto" },
  icon: <IconPalette size={13} />,
  execute: (state, api) => {
    const color = window.prompt("Color del texto (ej: #534AB7, #D85A30, red)");
    if (!color) return;
    const text = state.selectedText || window.prompt("Texto a colorear", "Texto") || "Texto";
    api.replaceSelection(`<span style="color: ${color}">${text}</span>`);
  },
};

const fontSizeCommand = {
  name: "fontSize",
  keyCommand: "fontSize",
  buttonProps: { "aria-label": "Tamaño de texto", title: "Tamaño de texto" },
  icon: <IconTypography size={13} />,
  execute: (state, api) => {
    const size = window.prompt("Tamaño en píxeles (ej: 14, 18, 24)", "18");
    if (!size) return;
    const text = state.selectedText || window.prompt("Texto", "Texto") || "Texto";
    api.replaceSelection(`<span style="font-size: ${size}px">${text}</span>`);
  },
};

const EDITOR_COMMANDS = [
  commands.bold,
  commands.italic,
  commands.strikethrough,
  textColorCommand,
  fontSizeCommand,
  commands.divider,
  commands.title2,
  commands.title3,
  commands.divider,
  commands.unorderedListCommand,
  commands.orderedListCommand,
  commands.divider,
  linkCommand,
  imageCommand,
  youtubeCommand,
  commands.divider,
  makeAlignCommand("left", <IconAlignLeft size={13} />, "Alinear izquierda"),
  makeAlignCommand("center", <IconAlignCenter size={13} />, "Centrar"),
  makeAlignCommand("right", <IconAlignRight size={13} />, "Alinear derecha"),
  commands.divider,
  commands.quote,
  commands.code,
  commands.codeBlock,
];

export function RichEditor({ label, value, onChange, help, height = 320, readOnly = false }) {
  return (
    <div className="field rich-editor" data-color-mode="light">
      {label && <label className="field__label">{label}</label>}
      {help && <p className="field__help">{help}</p>}
      <MDEditor
        value={value || ""}
        onChange={readOnly ? undefined : (val) => onChange(val ?? "")}
        commands={readOnly ? [] : EDITOR_COMMANDS}
        extraCommands={readOnly ? [] : [commands.codeEdit, commands.codeLive, commands.codePreview]}
        height={height}
        preview={readOnly ? "preview" : "live"}
        visibleDragbar={false}
        hideToolbar={readOnly}
        previewOptions={{
          rehypePlugins: [rehypeRaw],
          components: {
            a: ({ href, children, ...props }) => (
              <a href={normalizeUrl(href || "")} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            ),
            iframe: ({ src, title, ...props }) => (
              <div className="markdown-embed markdown-embed--video">
                <iframe src={src} title={title || "Video"} {...props} />
              </div>
            ),
          },
        }}
      />
    </div>
  );
}
