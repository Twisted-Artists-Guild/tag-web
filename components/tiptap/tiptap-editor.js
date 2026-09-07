import React, { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpRight,
  Image as ImageIcon,
  Trash2,
  Video,
} from "lucide-react";

import { getFontOptions, getTiptapExtensions } from "@/components/tiptap/tiptap-presets";
import { toVimeoEmbedUrl } from "@/components/tiptap/tiptap-vimeo";
import { uploadImageToAzure, deleteImageFromAzure } from "@/libs/media-controller";

function normalizeUrl(rawUrl) {
  if (!rawUrl) {
    return "";
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function normalizeHeadingLevels(inputLevels, fallbackLevels) {
  if (!Array.isArray(inputLevels) || inputLevels.length === 0) {
    return fallbackLevels;
  }

  const normalized = inputLevels
    .map((level) => Number(level))
    .filter((level) => Number.isInteger(level) && level >= 1 && level <= 5);

  if (normalized.length === 0) {
    return fallbackLevels;
  }

  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}

function ToolbarButton({ onClick, active, disabled, label, children }) {
  return (
    <button
      type="button"
      className={`btn btn-xs h-8 min-h-8 px-2 ${
        active ? "btn-primary" : "btn-ghost border border-base-300"
      }`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <span className="inline-flex items-center justify-center leading-none">
        {children || label}
      </span>
    </button>
  );
}

function calculateMediaOverlay(editor, editorSurface, mediaSelection) {
  if (!editor || !editorSurface || !mediaSelection || typeof mediaSelection.pos !== "number") {
    return null;
  }

  const nodeDom = editor.view.nodeDOM(mediaSelection.pos);
  if (!nodeDom || nodeDom.nodeType !== 1) {
    return null;
  }

  const mediaElement =
    nodeDom.matches?.("img, iframe") ? nodeDom : nodeDom.querySelector?.("img, iframe");

  if (!mediaElement) {
    return null;
  }

  const surfaceRect = editorSurface.getBoundingClientRect();
  const mediaRect = mediaElement.getBoundingClientRect();

  if (!mediaRect.width || !mediaRect.height) {
    return null;
  }

  const inset = 6;
  return {
    left: Math.max(0, mediaRect.left - surfaceRect.left + inset),
    top: Math.max(0, mediaRect.top - surfaceRect.top + inset),
    width: Math.max(200, mediaRect.width - inset * 2),
    height: Math.max(90, mediaRect.height - inset * 2),
  };
}

export default function TiptapEditor({
  value = "",
  onChange = () => {},
  placeholder = "Write something...",
  readOnly = false,
  preset = "minimal",
  className = "",
  onKeyDown,
  singleLine = false,
  minHeight = 96,
  actionPreset = "none",
  onSubmit,
  onCancel,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  emptySubmitMessage = "Write something before submitting.",
  clearOnSubmit = false,
  onSaveDraft,
  onPublish,
  saveDraftLabel = "Save Draft",
  publishLabel = "Publish",
  fontScope,
  allowedFonts = [],
  enableSingleLineFontSelection = false,
  showAlignmentControls = true,
  allowStrikethrough = true,
  headingLevels,
  uploadContext,
  toolbarSlot,
  mediaToolbarSlot,
  onPickImageFromLibrary,
  onGalleryPreviewClick,
  resizable = false,
  containerStyle
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSelectingImage, setIsSelectingImage] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [actionValue, setActionValue] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [actionLabelDirty, setActionLabelDirty] = useState(false);
  const [titleLookupStatus, setTitleLookupStatus] = useState("idle");
  const [suggestedLabel, setSuggestedLabel] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [mediaSelection, setMediaSelection] = useState(null);
  const [mediaOverlay, setMediaOverlay] = useState(null);
  const editorSurfaceRef = useRef(null);
  const fontOptions = getFontOptions({ preset, fontScope, allowedFonts });
  const editorClassName = ["prose", "max-w-none", "p-3", "focus:outline-none", className]
    .filter(Boolean)
    .join(" ");

  const isMediaNodeName = useCallback((nodeName) => {
    return nodeName === "image" || nodeName === "youtube" || nodeName === "vimeo";
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: getTiptapExtensions(preset, placeholder),
    content: value || "",
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: editorClassName,
        style: `min-height: ${minHeight}px;`,
      },
        handleDrop: (view, event, slice, moved) => {
            if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                const file = event.dataTransfer.files[0];

                if (file.type.startsWith("image/")) {
                    setIsUploading(true);
                    uploadImageToAzure(file, uploadContext).then((response) => {
                        const imageUrl = typeof response === 'string' ? response : response.url;
                        if (imageUrl) {
                            console.log("Attempting to insert node with URL:", imageUrl);
                            const { schema } = view.state;
                            const node = schema.nodes.image.create({ src: imageUrl });
                            const transaction = view.state.tr.insert(view.state.selection.from, node);

                            view.dispatch(transaction);
                            // Force the editor to focus back so the image is "committed"
                            view.focus();
                        }
                    })
                    .catch(err => console.error("Drop upload failed", err))
                    .finally(() => setIsUploading(false));
                    return true; // Handled
                }
            }
            return false;
        },
        // Manual Paste Handler
        handlePaste: (view, event) => {
            const items = Array.from(event.clipboardData?.items || []);
            const imageItem = items.find(item => item.type.startsWith("image/"));

            if (imageItem) {
                setIsUploading(true);
                const file = imageItem.getAsFile();

                // Use the same context and response handling as handleDrop
                uploadImageToAzure(file, uploadContext).then((response) => {
                    // Fix: Extract URL regardless of whether response is a string or {url: "..."}
                    const imageUrl = typeof response === 'string' ? response : response.url;

                    if (imageUrl) {
                        const { schema } = view.state;
                        const node = schema.nodes.image.create({ src: imageUrl });

                        // insert at cursor position
                        const transaction = view.state.tr.replaceSelectionWith(node);
                        view.dispatch(transaction);

                        // Force focus to keep the editor active
                        view.focus();
                    }
                })
                .catch(err => console.error("Paste upload failed", err))
                .finally(() => setIsUploading(false));

                return true; // Handled
            }
            return false;
        },
        handleClick: (view, pos, event) => {
          const target = event?.target;

          const clickedMedia = target?.closest?.(
            "img, iframe[src*='youtube.com'], iframe[src*='player.vimeo.com']"
          );

          if (clickedMedia) {
            let mediaPos = null;
            try {
              mediaPos = view.posAtDOM(clickedMedia, 0);
            } catch {
              mediaPos = null;
            }

            if (typeof mediaPos === "number") {
              const mediaNode = view.state.doc.nodeAt(mediaPos);
              if (mediaNode && isMediaNodeName(mediaNode.type.name)) {
                const transaction = view.state.tr.setSelection(
                  NodeSelection.create(view.state.doc, mediaPos)
                );
                view.dispatch(transaction);
                setMediaSelection({
                  pos: mediaPos,
                  type: mediaNode.type.name,
                  width: Number(mediaNode.attrs?.width) || 640,
                  height: Number(mediaNode.attrs?.height) || 360,
                });
              }
            }

            return false;
          }

          if (typeof onGalleryPreviewClick !== "function") {
            setMediaSelection(null);
            return false;
          }

          const link = target?.closest?.('a[href^="#tag-gallery-"]');
          const href = link?.getAttribute?.("href") || "";
          const hrefMatch = href.match(/^#tag-gallery-([A-Za-z0-9_-]+)$/i);

          if (hrefMatch?.[1]) {
            event.preventDefault();
            onGalleryPreviewClick(hrefMatch[1]);
            return true;
          }

          const paragraph = target?.closest?.("p");
          const text = (paragraph?.textContent || target?.textContent || "").trim();
          const match = text.match(/Gallery Preview \[([A-Za-z0-9_-]+)\]/i);

          if (!match?.[1]) {
            setMediaSelection(null);
            return false;
          }

          onGalleryPreviewClick(match[1]);
          return true;
        },
      handleKeyDown: (view, event) => {
        if (singleLine && event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          return true;
        }

        if (onKeyDown) {
          onKeyDown(event);
          return event.defaultPrevented;
        }

        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

    const deleteSelectedImage = useCallback(async () => {
        if (!editor) return;
        const targetPos = typeof mediaSelection?.pos === "number" ? mediaSelection.pos : null;
        const nodeFromTrackedPos = targetPos !== null ? editor.state.doc.nodeAt(targetPos) : null;
        const trackedNode = nodeFromTrackedPos || editor.state.selection.node;

        if (trackedNode && trackedNode.type.name === 'image') {
            const imageUrl = trackedNode.attrs.src;

            setIsUploading(true);
            try {
                console.log("Step 1: Calling Azure API...");
                // 2. Wait for the API to actually respond
                await deleteImageFromAzure(imageUrl);

                console.log("Step 2: API Success, removing from UI");
                // 3. Only remove from editor if API succeeds
                if (targetPos !== null) {
                  editor.chain().focus().setNodeSelection(targetPos).deleteSelection().run();
                } else {
                  editor.commands.deleteSelection();
                }
                setMediaSelection(null);
            } catch (error) {
                console.error("Failed to delete image:", error);
            } finally {
                setIsUploading(false);
            }
            return;
        }

        if (trackedNode && isMediaNodeName(trackedNode.type.name)) {
          if (targetPos !== null) {
            editor.chain().focus().setNodeSelection(targetPos).deleteSelection().run();
          } else {
            editor.commands.deleteSelection();
          }
          setMediaSelection(null);
        }
    }, [editor, isMediaNodeName, mediaSelection]);

  const applyMediaResizeStep = useCallback(
    (direction) => {
      if (!editor || !mediaSelection || typeof mediaSelection.pos !== "number") {
        return;
      }

      const node = editor.state.doc.nodeAt(mediaSelection.pos);
      if (!node || !isMediaNodeName(node.type.name)) {
        return;
      }

      const currentWidth = Number(node.attrs?.width) || mediaSelection.width || 640;
      const currentHeight = Number(node.attrs?.height) || mediaSelection.height || 360;
      const ratio = currentWidth / currentHeight || 16 / 9;
      const step = 80;
      const nextWidth = Math.max(160, currentWidth + direction * step);
      const nextHeight = Math.max(90, Math.round(nextWidth / ratio));

      editor.commands.setNodeSelection(mediaSelection.pos);
      const didUpdate = editor
        .chain()
        .focus()
        .updateAttributes(node.type.name, {
          width: nextWidth,
          height: nextHeight,
        })
        .run();

      if (!didUpdate) {
        return;
      }

      setMediaSelection((prev) =>
        prev
          ? {
              ...prev,
              width: nextWidth,
              height: nextHeight,
            }
          : prev
      );
      requestAnimationFrame(() => {
        setMediaOverlay(calculateMediaOverlay(editor, editorSurfaceRef.current, {
          ...mediaSelection,
          width: nextWidth,
          height: nextHeight,
        }));
      });
    },
    [editor, isMediaNodeName, mediaSelection]
  );

  const applyMediaAlignment = useCallback(
    (align) => {
      if (!editor || !mediaSelection || typeof mediaSelection.pos !== "number") {
        return;
      }

      const node = editor.state.doc.nodeAt(mediaSelection.pos);
      if (!node || !isMediaNodeName(node.type.name)) {
        return;
      }

      editor.commands.setNodeSelection(mediaSelection.pos);
      const didUpdate = editor
        .chain()
        .focus()
        .updateAttributes(node.type.name, { textAlign: align })
        .run();

      if (!didUpdate) {
        return;
      }

      setMediaSelection((prev) => (prev ? { ...prev, align } : prev));
      requestAnimationFrame(() => {
        setMediaOverlay(calculateMediaOverlay(editor, editorSurfaceRef.current, {
          ...mediaSelection,
          align,
        }));
      });
    },
    [editor, isMediaNodeName, mediaSelection]
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    const next = value || "";
    if (next !== editor.getHTML()) {
      editor.commands.setContent(next, false);
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateMediaSelectionFromEditor = () => {
      const { selection, doc } = editor.state;
      const node = selection.node || doc.nodeAt(selection.from);
      if (!node || !isMediaNodeName(node.type.name)) {
        setMediaSelection(null);
        return;
      }

      setMediaSelection({
        pos: selection.from,
        type: node.type.name,
        width: Number(node.attrs?.width) || 640,
        height: Number(node.attrs?.height) || 360,
        align: node.attrs?.textAlign || "left",
      });
    };

    editor.on("selectionUpdate", updateMediaSelectionFromEditor);

    return () => {
      editor.off("selectionUpdate", updateMediaSelectionFromEditor);
    };
  }, [editor, isMediaNodeName]);

  useEffect(() => {
    if (!editor || !mediaSelection) {
      return;
    }

    let frameId = requestAnimationFrame(() => {
      setMediaOverlay(calculateMediaOverlay(editor, editorSurfaceRef.current, mediaSelection));
    });

    const handleViewportChange = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        setMediaOverlay(calculateMediaOverlay(editor, editorSurfaceRef.current, mediaSelection));
      });
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [editor, mediaSelection]);

  const resetActionUi = useCallback(() => {
    setActiveAction(null);
    setActionValue("");
    setActionLabel("");
    setActionLabelDirty(false);
    setTitleLookupStatus("idle");
    setSuggestedLabel("");
    setActionError("");
  }, []);

  const runInsertWithFallback = useCallback(
    (insertFn) => {
      if (!editor) {
        return false;
      }

      const firstAttempt = insertFn();
      if (firstAttempt) {
        return true;
      }

      editor.commands.focus("end");
      return insertFn();
    },
    [editor]
  );

  const normalizeAndValidateUrl = useCallback((rawUrl) => {
    const normalized = normalizeUrl(rawUrl);
    if (!normalized) {
      return "";
    }

    try {
      const parsed = new URL(normalized);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "";
      }
      return normalized;
    } catch {
      return "";
    }
  }, []);

  const insertImageFromUrl = useCallback((rawUrl) => {
    if (!editor) {
      return { ok: false, message: "Editor is not ready yet." };
    }

    const normalizedUrl = normalizeAndValidateUrl(rawUrl);
    if (!normalizedUrl) {
      return { ok: false, message: "That URL looks invalid." };
    }

    const hasSetImage = typeof editor.commands.setImage === "function";
    const didInsert = runInsertWithFallback(() =>
      hasSetImage
        ? editor.chain().focus().setImage({ src: normalizedUrl }).run()
        : editor
            .chain()
            .focus()
            .insertContent(`<img src="${normalizedUrl}" alt="Embedded image" />`)
            .run()
    );

    if (!didInsert) {
      return { ok: false, message: "Could not insert image in this editor context." };
    }

    return { ok: true };
  }, [editor, normalizeAndValidateUrl, runInsertWithFallback]);

  const handlePickImageFromLibrary = useCallback(async () => {
    if (typeof onPickImageFromLibrary !== "function" || isSelectingImage) {
      return;
    }

    setActionError("");
    setIsSelectingImage(true);
    try {
      const pickedUrl = await onPickImageFromLibrary();
      if (!pickedUrl) {
        return;
      }

      setActionValue(pickedUrl);
      const result = insertImageFromUrl(pickedUrl);
      if (!result.ok) {
        setActionError(result.message);
        return;
      }

      resetActionUi();
    } catch (error) {
      setActionError(error?.message || "Could not open image selector.");
    } finally {
      setIsSelectingImage(false);
    }
  }, [insertImageFromUrl, isSelectingImage, onPickImageFromLibrary, resetActionUi]);

  const openAction = useCallback(
    (type) => {
      if (!editor) {
        return;
      }

      setActionError("");
      setActiveAction(type);

      if (type === "link") {
        const currentHref = editor.getAttributes("link").href || "";
        const selectedText = editor.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to,
          " "
        );
        setActionValue(currentHref);
        setActionLabel(selectedText || "");
        setActionLabelDirty(Boolean(selectedText?.trim()));
        setSuggestedLabel("");
        setTitleLookupStatus("idle");
        return;
      }

      setActionValue("");
      setActionLabel("");
      setActionLabelDirty(false);
      setSuggestedLabel("");
      setTitleLookupStatus("idle");
    },
    [editor]
  );

  useEffect(() => {
    if (activeAction !== "link") {
      return;
    }

    const normalizedUrl = normalizeAndValidateUrl(actionValue);
    if (!normalizedUrl || actionLabelDirty) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setTitleLookupStatus("loading");

      try {
        const response = await fetch(`/api/link-title?url=${encodeURIComponent(normalizedUrl)}`);
        if (!response.ok) {
          throw new Error("Link title lookup failed");
        }

        const data = await response.json();
        const title = (data?.title || "").trim();

        if (title) {
          setActionLabel(title);
          setSuggestedLabel(title);
          setTitleLookupStatus("resolved");
          return;
        }

        setSuggestedLabel("");
        setTitleLookupStatus("idle");
      } catch {
        setTitleLookupStatus("error");
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [activeAction, actionLabelDirty, actionValue, normalizeAndValidateUrl]);

  const submitAction = useCallback(() => {
    if (!editor) {
      return;
    }

    if (!activeAction) {
      return;
    }

    if (actionValue.trim() === "") {
      setActionError("Enter a URL first.");
      return;
    }

    const normalizedUrl = normalizeAndValidateUrl(actionValue);
    if (!normalizedUrl) {
      setActionError("That URL looks invalid.");
      return;
    }

    if (activeAction === "link") {
      const selectedText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        " "
      );

      if (selectedText.trim()) {
        const linkText = actionLabel.trim();
        const selectionFrom = editor.state.selection.from;
        const didLink = linkText
          ? editor
              .chain()
              .focus()
              .insertContent(linkText)
              .setTextSelection({
                from: selectionFrom,
                to: selectionFrom + linkText.length,
              })
              .setLink({ href: normalizedUrl })
              .run()
          : editor.chain().focus().setLink({ href: normalizedUrl }).run();

        if (!didLink) {
          setActionError("Could not apply link to current selection.");
          return;
        }

        resetActionUi();
        return;
      }

      let label = actionLabel.trim();
      if (!label) {
        label = normalizedUrl;
      }

      try {
        if (!actionLabel.trim()) {
          label = new URL(normalizedUrl).hostname.replace(/^www\./i, "");
        }
      } catch {
        if (!actionLabel.trim()) {
          label = normalizedUrl;
        }
      }

      const from = editor.state.selection.from;
      const didInsert = runInsertWithFallback(() =>
        editor
          .chain()
          .focus()
          .insertContent(label)
          .setTextSelection({ from, to: from + label.length })
          .setLink({ href: normalizedUrl })
          .run()
      );

      if (!didInsert) {
        setActionError("Could not insert link at cursor.");
        return;
      }

      resetActionUi();
      return;
    }

    if (activeAction === "image") {
      const result = insertImageFromUrl(normalizedUrl);
      if (!result.ok) {
        setActionError(result.message);
        return;
      }

      resetActionUi();
      return;
    }

    if (activeAction === "vimeo") {
      const embed = toVimeoEmbedUrl(normalizedUrl);
      if (!embed) {
        setActionError("Invalid Vimeo URL.");
        return;
      }

      let didInsert =
        typeof editor.commands.setVimeoVideo === "function" &&
        runInsertWithFallback(() => editor.commands.setVimeoVideo({ src: embed }));

      if (!didInsert) {
        didInsert = runInsertWithFallback(() =>
          editor
            .chain()
            .focus()
            .insertContent(
              `<iframe src="${embed}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen="true"></iframe><p></p>`
            )
            .run()
        );
      }

      if (!didInsert) {
        setActionError("Could not insert Vimeo video. Try clicking into the editor body and retry.");
        return;
      }

      resetActionUi();
    }
  }, [
    activeAction,
    actionValue,
    actionLabel,
    editor,
    normalizeAndValidateUrl,
    resetActionUi,
    runInsertWithFallback,
    insertImageFromUrl,
  ]);

  const handleSubmitAction = useCallback(() => {
    if (!editor || typeof onSubmit !== "function") {
      return;
    }

    const html = editor.getHTML() || "";
    const textOnly = html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .trim();

    if (!textOnly) {
      setSubmitError(emptySubmitMessage);
      return;
    }

    setSubmitError("");
    onSubmit(html);

    if (clearOnSubmit) {
      editor.commands.clearContent(true);
    }
  }, [clearOnSubmit, editor, emptySubmitMessage, onSubmit]);

  const handleCancelAction = useCallback(() => {
    setSubmitError("");

    if (typeof onCancel === "function") {
      onCancel();
    }
  }, [onCancel]);

  const handleSaveDraftAction = useCallback(() => {
    if (!editor || typeof onSaveDraft !== "function") {
      return;
    }

    const html = editor.getHTML() || "";
    const textOnly = html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .trim();

    if (!textOnly) {
      setSubmitError(emptySubmitMessage);
      return;
    }

    setSubmitError("");
    onSaveDraft(html);
  }, [editor, emptySubmitMessage, onSaveDraft]);

  const handlePublishAction = useCallback(() => {
    if (!editor || typeof onPublish !== "function") {
      return;
    }

    const html = editor.getHTML() || "";
    const textOnly = html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .trim();

    if (!textOnly) {
      setSubmitError(emptySubmitMessage);
      return;
    }

    setSubmitError("");
    onPublish(html);

    if (clearOnSubmit) {
      editor.commands.clearContent(true);
    }
  }, [clearOnSubmit, editor, emptySubmitMessage, onPublish]);

  const applyFontFamily = useCallback(
    (nextFontValue) => {
      if (!editor) {
        return;
      }

      if (!nextFontValue || nextFontValue === "__default__") {
        editor.chain().focus().unsetFontFamily().run();
        return;
      }

      editor.chain().focus().setFontFamily(nextFontValue).run();
    },
    [editor]
  );

  const toggleOrderedList = useCallback(() => {
    if (!editor) {
      return;
    }

    const hasText = editor.state.doc.textContent.trim().length > 0;
    if (hasText) {
      editor.chain().focus().toggleOrderedList().run();
      return;
    }

    editor.commands.setContent("<ol><li></li></ol>", false);
    editor.commands.focus("end");
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    if (!editor) {
      return;
    }

    const hasText = editor.state.doc.textContent.trim().length > 0;
    if (hasText) {
      editor.chain().focus().toggleBulletList().run();
      return;
    }

    editor.commands.setContent("<ul><li></li></ul>", false);
    editor.commands.focus("end");
  }, [editor]);

  if (!editor) {
    return <div className="h-24 w-full animate-pulse rounded bg-base-200" />;
  }

  const canUseRichBlocks = preset === "full";
  const canUseMedia = preset === "medium" || preset === "full";
  const canUseLists = !singleLine;
  const canUseFonts = (!singleLine || enableSingleLineFontSelection) && fontOptions.length > 0;
  const canUseAlignment = showAlignmentControls;
  const resolvedHeadingLevels = normalizeHeadingLevels(
    headingLevels,
    canUseRichBlocks ? [2] : []
  );
  const canUseHeadingButtons = resolvedHeadingLevels.length > 0;
  const showSubmitCancel = !readOnly && actionPreset === "submit-cancel";
  const showSavePublish = !readOnly && actionPreset === "save-publish";
  const activeFontFamily = editor.getAttributes("textStyle")?.fontFamily || "";
  const activeFontValue =
    activeFontFamily && fontOptions.some((font) => font.value === activeFontFamily)
      ? activeFontFamily
      : "__default__";

  return (
    <div
      className={`rounded border border-base-300 bg-base-100 ${className}`}
      style={{
        minHeight: `${minHeight}px`,
        resize: resizable ? "vertical" : undefined,
        overflow: resizable ? "auto" : undefined,
        ...containerStyle,
      }}
    >
      {!readOnly && (        
        <div className="flex flex-wrap items-center gap-1 border-b border-base-300 bg-base-200 p-2">

          {/* Font selector - always leftmost */}
          {canUseFonts && (
            <>
              <select
                className="select select-bordered select-xs h-8 min-h-8 w-40"
                aria-label="Select font"
                title="Select font family"
                value={activeFontValue}
                onChange={(event) => applyFontFamily(event.target.value)}
              >
                <option value="__default__">Font: Default</option>
                {fontOptions.map((font) => (
                  <option key={font.key} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </option>
                ))}
              </select>
              <div className="mx-1 h-6 w-px bg-base-300" />
            </>
          )}

          {/* Text formatting - B I U S */}
          <ToolbarButton
            label="B"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong className="font-extrabold">B</strong>
          </ToolbarButton>
          <ToolbarButton
            label="I"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em className="italic">I</em>
          </ToolbarButton>
          <ToolbarButton
            label="U"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span className="underline decoration-2">U</span>
          </ToolbarButton>
          {allowStrikethrough && (
            <ToolbarButton
              label="S"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <span className="line-through">S</span>
            </ToolbarButton>
          )}

          {/* Misc items - Lists, Headings, HR, Link */}
          {(canUseLists || canUseHeadingButtons || canUseRichBlocks) && (
            <>
              <div className="mx-1 h-6 w-px bg-base-300" />

              {canUseLists && (
                <>
                  <ToolbarButton
                    label="OL"
                    active={editor.isActive("orderedList")}
                    onClick={toggleOrderedList}
                  >
                    <span className="text-xs font-semibold">1.</span>
                  </ToolbarButton>
                  <ToolbarButton
                    label="UL"
                    active={editor.isActive("bulletList")}
                    onClick={toggleBulletList}
                  >
                    <span className="text-xs font-semibold">•</span>
                  </ToolbarButton>
                </>
              )}

              {canUseHeadingButtons && (
                <>
                  {resolvedHeadingLevels.map((level) => (
                    <ToolbarButton
                      key={level}
                      label={`H${level}`}
                      active={editor.isActive("heading", { level })}
                      onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                    >
                      <span className="text-xs font-bold">{`H${level}`}</span>
                    </ToolbarButton>
                  ))}
                </>
              )}

              {canUseRichBlocks && (
                <>
                  <ToolbarButton
                    label="HR"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  >
                    <span className="w-4 border-t-2 border-current" />
                  </ToolbarButton>
                </>
              )}
            </>
          )}

          {/* Alignment controls - L C R on all presets when enabled */}
          {canUseAlignment && (
            <>
              <div className="mx-1 h-6 w-px bg-base-300" />
              <ToolbarButton
                label="Align Left"
                active={editor.isActive({ textAlign: "left" })}
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                label="Align Center"
                active={editor.isActive({ textAlign: "center" })}
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                label="Align Right"
                active={editor.isActive({ textAlign: "right" })}
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
              >
                <AlignRight className="h-3.5 w-3.5" />
              </ToolbarButton>
            </>
          )}

          {/* Media cluster - Image, Gallery, Vimeo */}
          {canUseMedia && (
            <>
              <div className="mx-1 h-6 w-px bg-base-300" />
              <ToolbarButton label="Image" onClick={() => openAction("image")}>
                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Image</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </ToolbarButton>
              {mediaToolbarSlot}
              <ToolbarButton label="Vimeo" onClick={() => openAction("vimeo")}>
                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                  <Video className="h-3.5 w-3.5" />
                  <span>Vimeo</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </ToolbarButton>
            </>
          )}

          {/* Link and Clear - always at the end */}
          <div className="mx-1 h-6 w-px bg-base-300" />

          <ToolbarButton
            label="Link"
            active={editor.isActive("link")}
            onClick={() => openAction("link")}
          >
            <span className="text-xs font-semibold">Link</span>
          </ToolbarButton>

          {toolbarSlot && (
            <>
              <div className="mx-1 h-6 w-px bg-base-300" />
              {toolbarSlot}
            </>
          )}

          <div className="mx-1 h-6 w-px bg-base-300" />

          <ToolbarButton
            label="Clear"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          >
            <span className="text-xs font-semibold">Clear</span>
          </ToolbarButton>
        </div>
      )}
      {!readOnly && activeAction && (
        <div className="flex flex-wrap items-center gap-2 border-b border-base-300 bg-base-100 px-3 py-2">
          <span className="text-xs font-semibold uppercase text-base-content/70">
            {activeAction === "link" ? "Link URL" : activeAction === "image" ? "Image URL" : `${activeAction} URL`}
          </span>
          <input
            type="url"
            className="input input-bordered input-sm w-full max-w-md focus:outline-none"
            placeholder="https://..."
            value={actionValue}
            onChange={(event) => {
              setActionValue(event.target.value);
              if (activeAction === "link") {
                setTitleLookupStatus("idle");
                setSuggestedLabel("");
              }
              if (actionError) {
                setActionError("");
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitAction();
              }

              if (event.key === "Escape") {
                event.preventDefault();
                resetActionUi();
              }
            }}
            autoFocus
          />
          {activeAction === "link" && (
            <input
              type="text"
              className="input input-bordered input-sm w-full max-w-sm focus:outline-none"
              placeholder="Link text (optional)"
              value={actionLabel}
              onChange={(event) => {
                setActionLabel(event.target.value);
                setActionLabelDirty(true);
                setTitleLookupStatus("idle");
                setSuggestedLabel("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitAction();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  resetActionUi();
                }
              }}
            />
          )}
          {activeAction === "link" && titleLookupStatus === "loading" && (
            <span className="text-xs text-base-content/70">Fetching page title...</span>
          )}
          {activeAction === "link" && suggestedLabel && actionLabelDirty && (
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => {
                setActionLabel(suggestedLabel);
                setActionLabelDirty(false);
              }}
            >
              Use suggested title
            </button>
          )}
          {activeAction === "link" && titleLookupStatus === "error" && !actionError && (
            <span className="text-xs text-warning">Could not fetch page title.</span>
          )}
          {activeAction === "image" && typeof onPickImageFromLibrary === "function" && (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={handlePickImageFromLibrary}
              disabled={isSelectingImage}
            >
              {isSelectingImage ? "Opening..." : "Pick from library ↗"}
            </button>
          )}
          <button type="button" className="btn btn-sm btn-primary" onClick={submitAction}>
            Insert
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={resetActionUi}>
            Cancel
          </button>
          {actionError && <p className="w-full text-xs text-error">{actionError}</p>}
        </div>
          )}
        {/* LOADING OVERLAY */}
        {isUploading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-lg">
                <div className="flex flex-col items-center gap-3">
                    {/* Tailwind Spinner */}
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <span className="text-sm font-medium text-slate-600">Uploading to Azure...</span>
                </div>
            </div>
          )}
      <style jsx global>{`
        .ProseMirror img[style*="text-align: left"],
        .ProseMirror iframe[style*="text-align: left"] {
          display: block;
          margin-left: 0;
          margin-right: auto;
        }

        .ProseMirror img[style*="text-align: center"],
        .ProseMirror iframe[style*="text-align: center"] {
          display: block;
          margin-left: auto;
          margin-right: auto;
        }

        .ProseMirror img[style*="text-align: right"],
        .ProseMirror iframe[style*="text-align: right"] {
          display: block;
          margin-left: auto;
          margin-right: 0;
        }
      `}</style>
      <div ref={editorSurfaceRef} className="relative">
        <EditorContent editor={editor} />
        {editor && mediaSelection && mediaOverlay && (
          <div
            className="pointer-events-none absolute z-20"
            style={{
              left: `${mediaOverlay.left}px`,
              top: `${mediaOverlay.top}px`,
              width: `${mediaOverlay.width}px`,
              height: `${mediaOverlay.height}px`,
            }}
          >
            <div className="flex h-full w-full flex-col justify-between rounded border border-primary/50 bg-base-300/20 p-1">
              <div className="pointer-events-auto inline-flex w-fit items-center gap-1 rounded bg-base-100/95 px-1 py-1 shadow">
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => applyMediaResizeStep(-1)}
                  title="Shrink"
                >
                  -
                </button>
                <span className="min-w-20 text-center text-[11px] text-base-content/70">
                  {Math.round(mediaSelection.width)} x {Math.round(mediaSelection.height)}
                </span>
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => applyMediaResizeStep(1)}
                  title="Grow"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedImage}
                  className="btn btn-xs btn-error text-white"
                  title="Delete media"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="pointer-events-auto mx-auto inline-flex items-center gap-1 rounded bg-base-100/95 px-1 py-1 shadow">
                <button
                  type="button"
                  className={`btn btn-xs ${mediaSelection.align === "left" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => applyMediaAlignment("left")}
                  title="Align Left"
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${mediaSelection.align === "center" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => applyMediaAlignment("center")}
                  title="Align Center"
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${mediaSelection.align === "right" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => applyMediaAlignment("right")}
                  title="Align Right"
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showSubmitCancel && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-base-300 bg-base-100 p-2">
          <button type="button" className="btn btn-sm btn-outline" onClick={handleCancelAction}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={handleSubmitAction}>
            {submitLabel}
          </button>
          {submitError && <p className="w-full text-xs text-error">{submitError}</p>}
        </div>
      )}
      {showSavePublish && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-base-300 bg-base-100 p-2">
          <button type="button" className="btn btn-sm btn-outline" onClick={handleSaveDraftAction}>
            {saveDraftLabel}
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={handlePublishAction}>
            {publishLabel}
          </button>
          {submitError && <p className="w-full text-xs text-error">{submitError}</p>}
        </div>
      )}
    </div>
  );
}
