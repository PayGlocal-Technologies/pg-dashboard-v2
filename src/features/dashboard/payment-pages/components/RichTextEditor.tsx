"use client";

import { useCallback, useRef } from "react";
import { Button } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

type Tool = {
  icon: IconName;
  label: string;
  command: string;
};

// Static config (no ref access) — the ref-touching logic lives in the onClick
// handler below so it stays out of render.
const TOOLS: Tool[] = [
  { icon: "bold", label: "Bold", command: "bold" },
  { icon: "italic", label: "Italic", command: "italic" },
  { icon: "underline", label: "Underline", command: "underline" },
  { icon: "list", label: "Bulleted list", command: "insertUnorderedList" },
  { icon: "list-ordered", label: "Numbered list", command: "insertOrderedList" },
];

/**
 * Minimal rich-text editor for the product description. Uses a contentEditable
 * surface (no flux-ui equivalent — documented bare-element exception) driven by
 * document.execCommand for the base formatting actions (bold/italic/underline,
 * lists, link, image, video). execCommand is deprecated but is the simplest way
 * to get working base formatting without pulling in an editor dependency.
 */
export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Seed the editor once on mount; contentEditable is then uncontrolled so the
  // caret doesn't jump on every keystroke re-render.
  const initialHtml = useRef(value);

  const setNode = useCallback((node: HTMLDivElement | null) => {
    ref.current = node;
    if (node && node.innerHTML !== initialHtml.current) node.innerHTML = initialHtml.current;
  }, []);

  const runTool = (tool: Tool) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand(tool.command);
    onChange(el.innerHTML);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
        className
      )}
    >
      <div
        ref={setNode}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Product description"
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        data-placeholder={placeholder}
        className={cn(
          "min-h-24 w-full overflow-y-auto px-3 py-2.5 text-[13px] leading-relaxed outline-none",
          "[&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]",
          "[&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        )}
      />
      <div className="flex items-center gap-1 border-t border-border bg-muted/40 px-2 py-1.5">
        {TOOLS.map((tool) => (
          <Button
            key={tool.icon}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={tool.label}
            // Keep the editor's selection — a Button click would otherwise blur
            // the contentEditable and execCommand would have nothing to act on.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runTool(tool)}
            className="h-7 w-7 min-h-0 min-w-0 cursor-pointer rounded-md p-0 text-muted-foreground hover:text-foreground"
          >
            <Icon name={tool.icon} className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>
    </div>
  );
}
