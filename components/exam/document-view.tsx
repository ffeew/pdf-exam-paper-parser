"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnswerSidePanel } from "./answer-side-panel";
import { LatexText } from "@/components/ui/latex-text";
import { cn } from "@/lib/utils";
import type { Question } from "@/app/api/exams/[id]/validator";

interface DocumentViewProps {
  markdown: string;
  questions: Question[];
}

export function DocumentView({ markdown, questions }: DocumentViewProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [activeQuestionNumber, setActiveQuestionNumber] = useState<string | null>(null);
  const questionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Register question element refs when they mount
  const registerQuestionRef = useCallback((num: string, el: HTMLElement | null) => {
    if (el) {
      questionRefs.current.set(num, el);
    } else {
      questionRefs.current.delete(num);
    }
  }, []);

  // Handle scroll to update active question
  useEffect(() => {
    const documentEl = documentRef.current;
    if (!documentEl) return;

    const handleScroll = () => {
      const refs = Array.from(questionRefs.current.entries());
      if (refs.length === 0) return;

      const containerRect = documentEl.getBoundingClientRect();
      const containerTop = containerRect.top;

      // Find the question that's closest to the top of the viewport
      let closestQuestion: string | null = null;
      let closestDistance = Infinity;

      for (const [num, el] of refs) {
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - containerTop - 100); // 100px offset
        if (distance < closestDistance && rect.top < containerRect.bottom) {
          closestDistance = distance;
          closestQuestion = num;
        }
      }

      if (closestQuestion !== activeQuestionNumber) {
        setActiveQuestionNumber(closestQuestion);
      }
    };

    documentEl.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      documentEl.removeEventListener("scroll", handleScroll);
    };
  }, [activeQuestionNumber]);

  // Handle click on question in side panel
  const handleQuestionClick = useCallback((questionNumber: string) => {
    const el = questionRefs.current.get(questionNumber);
    if (el && documentRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveQuestionNumber(questionNumber);
    }
  }, []);

  // Process children to render LaTeX within text content
  const processChildren = useCallback((children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, (child) => {
      if (typeof child === "string") {
        // Check if the string contains LaTeX patterns
        if (child.includes("$") || child.includes("\\")) {
          return <LatexText text={child} preserveWhitespace={false} />;
        }
        return child;
      }
      return child;
    });
  }, []);

  // Custom paragraph renderer to add IDs for question numbers and render LaTeX
  const renderParagraph = useCallback(
    ({ children, ...props }: React.ComponentProps<"p">) => {
      const text = extractText(children);
      const match = text.match(/^(?:Question\s+|Q)?(\d+)[.)]\s/i);
      const processedChildren = processChildren(children);

      if (match) {
        const questionNum = match[1];
        return (
          <p
            {...props}
            ref={(el) => registerQuestionRef(questionNum, el)}
            data-question={questionNum}
            className="scroll-mt-4"
          >
            {processedChildren}
          </p>
        );
      }

      return <p {...props}>{processedChildren}</p>;
    },
    [registerQuestionRef, processChildren]
  );

  // Custom list item renderer with LaTeX support
  const renderListItem = useCallback(
    ({ children, ...props }: React.ComponentProps<"li">) => {
      return <li {...props}>{processChildren(children)}</li>;
    },
    [processChildren]
  );

  // Custom table cell renderer with LaTeX support
  const renderTableCell = useCallback(
    ({ children, ...props }: React.ComponentProps<"td">) => {
      return <td {...props}>{processChildren(children)}</td>;
    },
    [processChildren]
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Document Panel */}
      <div
        ref={documentRef}
        className="flex-1 overflow-y-auto rounded-lg border bg-card p-6"
        style={{ flex: "0 0 65%" }}
      >
        <div
          className={cn(
            "prose prose-sm max-w-none dark:prose-invert",
            // Table styles
            "[&_table]:w-auto [&_table]:border-collapse [&_table]:my-4",
            "[&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted/50 [&_th]:border [&_th]:border-border [&_th]:text-left [&_th]:font-medium",
            "[&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-border",
            // List styles
            "[&_ul]:my-3 [&_ul]:pl-6 [&_ul]:list-disc",
            "[&_ol]:my-3 [&_ol]:pl-6 [&_ol]:list-decimal",
            "[&_li]:my-1",
            // Header styles
            "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3",
            "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2",
            "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2",
            // Paragraph spacing
            "[&_p]:my-3 [&_p]:leading-relaxed",
            // Strong/bold
            "[&_strong]:font-semibold",
            // Links
            "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
            // Code
            "[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm",
            "[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4",
            // Blockquote
            "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4",
            // Horizontal rule (page separators)
            "[&_hr]:my-6 [&_hr]:border-border",
            // Images
            "[&_img]:max-w-full [&_img]:h-auto [&_img]:my-4 [&_img]:rounded-lg [&_img]:shadow-sm"
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: renderParagraph,
              li: renderListItem,
              td: renderTableCell,
              th: renderTableCell,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>

      {/* Answer Side Panel */}
      <div
        className="rounded-lg border bg-card overflow-hidden"
        style={{ flex: "0 0 35%" }}
      >
        <AnswerSidePanel
          questions={questions}
          activeQuestionNumber={activeQuestionNumber}
          onQuestionClick={handleQuestionClick}
        />
      </div>
    </div>
  );
}

// Helper to extract text from React children
function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return "";
}
