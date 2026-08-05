import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter,
  List, ListOrdered, Indent, Outdent,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { noteToHtml, sanitizeNoteHtml } from "@/lib/richText";

export const richTextContentClass = cn(
  "text-sm leading-relaxed text-foreground",
  "[&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1",
  "[&_li]:my-0.5 [&_li>p]:my-0 [&_s]:line-through [&_u]:underline",
  "[&_mark]:bg-primary/20 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-0.5",
  "[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:my-2",
  "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:my-2",
  "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-1.5",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
);

type Props = {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Height of the scrollable writing area. */
  minHeight?: string;
  autoFocus?: boolean;
};

function ToolbarToggle({
  label, active, onClick, disabled, children,
}: { label: string; active?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          type="button"
          pressed={!!active}
          onPressedChange={onClick}
          disabled={disabled}
          aria-label={label}
          className="h-8 w-8 p-0"
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Toolbar({ editor, disabled }: { editor: Editor; disabled?: boolean }) {
  const { t } = useLanguage();
  const blockValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : editor.isActive("blockquote")
          ? "quote"
          : "p";

  const setBlock = (v: string) => {
    const chain = editor.chain().focus();
    if (v === "p") chain.setParagraph().run();
    else if (v === "quote") chain.toggleBlockquote().run();
    else chain.setNode("heading", { level: Number(v.slice(1)) }).run();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-card px-2 py-1.5 rounded-t-md">
        <Select value={blockValue} onValueChange={setBlock} disabled={disabled}>
          <SelectTrigger className="h-8 w-[130px] text-xs" aria-label={t("richText.textStyle")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="p">{t("richText.paragraph")}</SelectItem>
            <SelectItem value="h1">{t("richText.heading1")}</SelectItem>
            <SelectItem value="h2">{t("richText.heading2")}</SelectItem>
            <SelectItem value="h3">{t("richText.heading3")}</SelectItem>
            <SelectItem value="quote">{t("richText.quote")}</SelectItem>
          </SelectContent>
        </Select>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <ToolbarToggle label={t("richText.bulletList")} active={editor.isActive("bulletList")} disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarToggle>
        <ToolbarToggle label={t("richText.orderedList")} active={editor.isActive("orderedList")} disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarToggle>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0"
              aria-label={t("richText.outdent")}
              disabled={disabled || !editor.can().liftListItem("listItem")}
              onClick={() => editor.chain().focus().liftListItem("listItem").run()}>
              <Outdent className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("richText.outdent")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0"
              aria-label={t("richText.indent")}
              disabled={disabled || !editor.can().sinkListItem("listItem")}
              onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
              <Indent className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("richText.indent")}</TooltipContent>
        </Tooltip>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <ToolbarToggle label={`${t("richText.bold")} (Ctrl+B)`} active={editor.isActive("bold")} disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarToggle>
        <ToolbarToggle label={`${t("richText.italic")} (Ctrl+I)`} active={editor.isActive("italic")} disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarToggle>
        <ToolbarToggle label={`${t("richText.underline")} (Ctrl+U)`} active={editor.isActive("underline")} disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarToggle>
        <ToolbarToggle label={t("richText.highlight")} active={editor.isActive("highlight")} disabled={disabled}
          onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter className="h-4 w-4" />
        </ToolbarToggle>
        <ToolbarToggle label={`${t("richText.strike")} (Ctrl+Shift+S)`} active={editor.isActive("strike")} disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarToggle>
      </div>
    </TooltipProvider>
  );
}

export function RichTextEditor({
  value, onChange, onBlur, placeholder, disabled, className, minHeight = "180px", autoFocus,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
      Highlight,
    ],
    content: noteToHtml(value),
    editable: !disabled,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": placeholder ?? "",
        class: cn(
          "outline-none px-3 py-2 overflow-y-auto",
          richTextContentClass,
        ),
        style: `min-height:${minHeight};max-height:${minHeight}`,
      },
      transformPastedHTML: (html) => sanitizeNoteHtml(html),
    },
    onUpdate: ({ editor: e }) => {
      const html = e.isEmpty ? "" : sanitizeNoteHtml(e.getHTML());
      onChange(html);
    },
    onBlur: () => onBlur?.(),
  });

  // keep external updates (e.g. loaded from server) in sync
  useEffect(() => {
    if (!editor) return;
    const next = noteToHtml(value);
    const current = editor.isEmpty ? "" : sanitizeNoteHtml(editor.getHTML());
    if (next !== current && !editor.isFocused) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border border-input bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring", className)}>
      <Toolbar editor={editor} disabled={disabled} />
      <div className="relative">
        {editor.isEmpty && placeholder && (
          <p className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground pr-3">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function RichTextView({ value, className }: { value?: string | null; className?: string }) {
  return (
    <div
      className={cn(richTextContentClass, "whitespace-pre-wrap", className)}
      dangerouslySetInnerHTML={{ __html: noteToHtml(value) }}
    />
  );
}
