"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownTextProps {
  text: string;
  className?: string;
}

export function MarkdownText({ text, className }: MarkdownTextProps) {
  if (!text) return null;

  return (
    <div
      className={cn(
        "text-sm max-w-none",
        // First/last child margins
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        // Table styles
        "[&_table]:w-auto [&_table]:border-collapse [&_table]:my-2",
        "[&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-muted/50 [&_th]:border [&_th]:border-border [&_th]:text-left [&_th]:font-medium",
        "[&_td]:px-3 [&_td]:py-1.5 [&_td]:border [&_td]:border-border",
        // List styles
        "[&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc",
        "[&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal",
        "[&_li]:my-0.5",
        // Header styles
        "[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2",
        "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5",
        "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1",
        // Paragraph spacing
        "[&_p]:my-2 [&_p]:leading-relaxed",
        // Strong/bold
        "[&_strong]:font-semibold",
        // Links
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        // Code
        "[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs",
        "[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-2",
        // Blockquote
        "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2",
        // Horizontal rule
        "[&_hr]:my-4 [&_hr]:border-border",
        // Images
        "[&_img]:max-w-full [&_img]:h-auto [&_img]:my-2 [&_img]:rounded",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
