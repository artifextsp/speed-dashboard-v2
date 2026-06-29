import { useCallback, useEffect, useMemo, useRef } from "react";
import MDEditor from "@uiw/react-md-editor";
import * as commands from "@uiw/react-md-editor/commands";
import { getStateFromTextArea, TextAreaTextApi } from "@uiw/react-md-editor/commands";
import {
  extractYouTubeId,
  extractGoogleDriveFileId,
  normalizeUrl,
  resolveImageUrl,
  youtubeEmbedUrl,
  youtubeWatchUrl,
} from "../../../kernel/urlUtils";
import { MarkdownContent } from "../../preview/MarkdownContent";
import {
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconBrandYoutube,
  IconLink,
  IconArrowBackUp,
} from "@tabler/icons-react";
import {
  applyBoldFormat,
  applyFontSizeFormat,
  applyItalicFormat,
  applyStrikeFormat,
  applyTextColorFormat,
} from "./richEditorFormat";
import { EditorColorPickerButton, EditorFontSizeSelect } from "./EditorToolbarWidgets";
import "@uiw/react-md-editor/markdown-editor.css";

const HISTORY_LIMIT = 100;
const EMPTY_SELECTION = { start: 0, end: 0, text: "" };

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

function cleanHeadingText(text) {
  return String(text ?? "")
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*\*(.+)\*\*$/s, "$1")
    .replace(/^\*\*/, "")
    .replace(/\*\*$/, "");
}

function makeHeadingCommand(level, baseCommand) {
  return {
    name: baseCommand.name,
    keyCommand: baseCommand.keyCommand,
    buttonProps: baseCommand.buttonProps,
    icon: baseCommand.icon,
    execute: (state, api) => {
      const raw =
        state.selectedText || window.prompt(`Título ${level}`, "Título") || "Título";
      const text = cleanHeadingText(raw);
      if (/<[a-z][\s>]/i.test(text)) {
        api.replaceSelection(`\n\n<h${level}>${text}</h${level}>\n\n`);
        return;
      }
      api.replaceSelection(`\n\n${"#".repeat(level)} ${text}\n\n`);
    },
  };
}

function createStaticCommands() {
  const linkCommand = {
    name: "link",
    keyCommand: "link",
    buttonProps: { "aria-label": "Insertar enlace", title: "Insertar enlace" },
    icon: <IconLink size={13} />,
    execute: (state, api) => {
      const url = window.prompt(
        "URL del enlace (incluye https:// o se agregará automáticamente)"
      );
      if (!url) return;
      const text =
        state.selectedText || window.prompt("Texto del enlace", "Ver recurso") || "Enlace";
      api.replaceSelection(`[${text}](${normalizeUrl(url)})`);
    },
  };

  const imageCommand = {
    name: "image",
    keyCommand: "image",
    buttonProps: { "aria-label": "Insertar imagen", title: "Insertar imagen" },
    icon: commands.image.icon,
    execute: (state, api) => {
      const url = window.prompt(
        "URL de la imagen (acepta enlaces de Google Drive con «Cualquier persona con el enlace»)"
      );
      if (!url) return;
      const normalized = normalizeUrl(url);
      const resolved = resolveImageUrl(normalized);
      const alt = window.prompt("Descripción de la imagen", "Imagen") || "Imagen";
      if (extractGoogleDriveFileId(normalized)) {
        window.alert(
          "Enlace de Google Drive convertido al formato directo para que la imagen se pueda mostrar."
        );
      }
      api.replaceSelection(`![${alt}](${resolved})`);
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
        `\n\n<div class="markdown-embed markdown-embed--video"><iframe src="${youtubeEmbedUrl(id)}" title="Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>\n<p class="markdown-video-link"><a href="${youtubeWatchUrl(id)}">▶ Abrir video en YouTube</a></p>\n\n`
      );
    },
  };

  const spacerCommand = {
    name: "spacer",
    keyCommand: "spacer",
    buttonProps: { "aria-label": "Espacio vertical", title: "Espacio vertical" },
    icon: <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>↕</span>,
    execute: (state, api) => {
      api.replaceSelection('\n<div class="markdown-spacer"></div>\n');
    },
  };

  return { linkCommand, imageCommand, youtubeCommand, spacerCommand };
}

export function RichEditor({ label, value, onChange, help, height = 320, readOnly = false }) {
  const rootRef = useRef(null);
  const historyRef = useRef({ stack: [value || ""], index: 0 });
  const skipHistoryRef = useRef(false);
  const savedSelectionRef = useRef(EMPTY_SELECTION);

  useEffect(() => {
    historyRef.current = { stack: [value || ""], index: 0 };
  }, []);

  const captureSelection = useCallback(() => {
    const textarea = rootRef.current?.querySelector("textarea.w-md-editor-text-input");
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    savedSelectionRef.current = {
      start,
      end,
      text: textarea.value.slice(start, end),
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || readOnly) return undefined;

    const handleCapture = () => captureSelection();
    root.addEventListener("mousedown", handleCapture, true);

    const textarea = root.querySelector("textarea.w-md-editor-text-input");
    textarea?.addEventListener("select", handleCapture);
    textarea?.addEventListener("keyup", handleCapture);
    textarea?.addEventListener("mouseup", handleCapture);

    return () => {
      root.removeEventListener("mousedown", handleCapture, true);
      textarea?.removeEventListener("select", handleCapture);
      textarea?.removeEventListener("keyup", handleCapture);
      textarea?.removeEventListener("mouseup", handleCapture);
    };
  }, [captureSelection, readOnly]);

  const pushHistory = useCallback((nextValue) => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    const history = historyRef.current;
    if (history.stack[history.index] === nextValue) return;
    history.stack = history.stack.slice(0, history.index + 1);
    history.stack.push(nextValue);
    if (history.stack.length > HISTORY_LIMIT) {
      history.stack = history.stack.slice(-HISTORY_LIMIT);
    }
    history.index = history.stack.length - 1;
  }, []);

  const handleChange = useCallback(
    (nextValue) => {
      const normalized = nextValue ?? "";
      pushHistory(normalized);
      onChange(normalized);
    },
    [onChange, pushHistory]
  );

  const getEditorContext = useCallback(() => {
    const textarea = rootRef.current?.querySelector("textarea.w-md-editor-text-input");
    if (!textarea) return null;

    const api = new TextAreaTextApi(textarea);
    const saved = savedSelectionRef.current;

    if (saved.end > saved.start) {
      textarea.focus();
      api.setSelectionRange({ start: saved.start, end: saved.end });
      return {
        state: {
          text: textarea.value,
          selectedText: saved.text,
          selection: { start: saved.start, end: saved.end },
        },
        api,
        textarea,
      };
    }

    return {
      state: getStateFromTextArea(textarea),
      api,
      textarea,
    };
  }, []);

  const syncEditorValue = useCallback(() => {
    const textarea = rootRef.current?.querySelector("textarea.w-md-editor-text-input");
    if (textarea) handleChange(textarea.value);
  }, [handleChange]);

  const preserveFormattedSelection = useCallback((start, replacement) => {
    if (!replacement) return;
    const end = start + replacement.length;
    savedSelectionRef.current = {
      start,
      end,
      text: replacement,
    };

    requestAnimationFrame(() => {
      const textarea = rootRef.current?.querySelector("textarea.w-md-editor-text-input");
      if (!textarea) return;
      textarea.focus();
      const api = new TextAreaTextApi(textarea);
      api.setSelectionRange({ start, end });
    });
  }, []);

  const runFormat = useCallback(
    (formatter) => {
      const ctx = getEditorContext();
      if (!ctx?.state.selectedText) return;
      const start = ctx.state.selection?.start ?? savedSelectionRef.current.start;
      const replacement = formatter(ctx.state, ctx.api);
      syncEditorValue();
      preserveFormattedSelection(start, replacement);
    },
    [getEditorContext, preserveFormattedSelection, syncEditorValue]
  );

  const wrapInlineFormat = useCallback(
    (formatter) => (state, api) => {
      if (!state.selectedText) return;
      const start = state.selection?.start ?? 0;
      const replacement = formatter(state, api);
      syncEditorValue();
      preserveFormattedSelection(start, replacement);
    },
    [preserveFormattedSelection, syncEditorValue]
  );

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (history.index <= 0) return;
    history.index -= 1;
    skipHistoryRef.current = true;
    onChange(history.stack[history.index]);
  }, [onChange]);

  const editorCommands = useMemo(() => {
    const { linkCommand, imageCommand, youtubeCommand, spacerCommand } = createStaticCommands();
    const heading2Command = makeHeadingCommand(2, commands.title2);
    const heading3Command = makeHeadingCommand(3, commands.title3);

    const undoCommand = {
      name: "undo",
      keyCommand: "undo",
      shortcuts: "ctrlcmd+z",
      buttonProps: {
        "aria-label": "Deshacer",
        title: "Deshacer (Ctrl+Z)",
      },
      icon: <IconArrowBackUp size={13} />,
      execute: () => {
        undo();
      },
    };

    const fontSizeCommand = {
      name: "fontSize",
      keyCommand: "fontSize",
      render: (_command, disabled) => (
        <EditorFontSizeSelect
          disabled={disabled}
          onPrepare={captureSelection}
          onApply={(size) => runFormat((state, api) => applyFontSizeFormat(state, api, size))}
        />
      ),
    };

    const textColorCommand = {
      name: "textColor",
      keyCommand: "textColor",
      render: (_command, disabled) => (
        <EditorColorPickerButton
          disabled={disabled}
          onPrepare={captureSelection}
          onApply={(color) =>
            runFormat((state, api) => applyTextColorFormat(state, api, color))
          }
        />
      ),
    };

    return [
      undoCommand,
      commands.divider,
      {
        ...commands.bold,
        execute: wrapInlineFormat(applyBoldFormat),
      },
      {
        ...commands.italic,
        execute: wrapInlineFormat(applyItalicFormat),
      },
      {
        ...commands.strikethrough,
        execute: wrapInlineFormat(applyStrikeFormat),
      },
      textColorCommand,
      fontSizeCommand,
      commands.divider,
      heading2Command,
      heading3Command,
      commands.divider,
      commands.unorderedListCommand,
      commands.orderedListCommand,
      commands.divider,
      linkCommand,
      imageCommand,
      spacerCommand,
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
  }, [captureSelection, runFormat, undo, wrapInlineFormat]);

  return (
    <div className="field rich-editor" data-color-mode="light" ref={rootRef}>
      {label && <label className="field__label">{label}</label>}
      {help && <p className="field__help">{help}</p>}
      {!readOnly && (
        <p className="field__help rich-editor__format-hint">
          Selecciona el texto y aplica negrilla, color o tamaño. Puedes encadenar varios formatos
          sin volver a seleccionar; el bloque completo (incluidas listas) conserva el estilo.
        </p>
      )}
      <MDEditor
        value={value || ""}
        onChange={readOnly ? undefined : handleChange}
        commands={readOnly ? [] : editorCommands}
        extraCommands={readOnly ? [] : [commands.codeEdit, commands.codeLive, commands.codePreview]}
        height={height}
        preview={readOnly ? "preview" : "live"}
        visibleDragbar={false}
        hideToolbar={readOnly}
        components={{
          preview: (source) => (
            <div className="wmde-markdown-color" data-color-mode="light">
              <div className="pv-markdown">
                <MarkdownContent>{source}</MarkdownContent>
              </div>
            </div>
          ),
        }}
      />
    </div>
  );
}
