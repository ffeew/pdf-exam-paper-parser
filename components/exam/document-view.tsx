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
  // Track the start number of the current ordered list
  const currentListStart = useRef(1);

  // Build a set of valid question numbers for matching
  const questionNumberSet = React.useMemo(
    () => new Set(questions.map((q) => q.questionNumber)),
    [questions]
  );

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

      // Default to the first question from props (not the first detected ref)
      const firstQuestionNumber = questions[0]?.questionNumber || null;
      let activeQuestion: string | null = firstQuestionNumber;

      if (refs.length === 0) {
        setActiveQuestionNumber(activeQuestion);
        return;
      }

      const containerRect = documentEl.getBoundingClientRect();
      // Focus line: 20% down from the top of the container
      const focusLine = containerRect.height * 0.2;

      // Sort refs by question number to process in order
      const sortedRefs = [...refs].sort(([a], [b]) => {
        const parseNum = (s: string) => {
          const match = s.match(/^(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        return parseNum(a) - parseNum(b) || a.localeCompare(b);
      });

      // Find the last question whose top has scrolled past the focus line
      for (const [num, el] of sortedRefs) {
        const rect = el.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;

        if (relativeTop <= focusLine) {
          // This question has scrolled past the focus line, it's active
          activeQuestion = num;
        } else {
          // This question is still below the focus line, stop
          break;
        }
      }

      setActiveQuestionNumber(activeQuestion);
    };

    documentEl.addEventListener("scroll", handleScroll, { passive: true });
    // Delay initial check to allow refs to be registered
    const timer = setTimeout(handleScroll, 200);

    return () => {
      documentEl.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [questions]);

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

  // Find a matching question number (handles "11" matching "11a" if "11" doesn't exist)
  const findMatchingQuestion = useCallback(
    (num: string): string | null => {
      // Direct match
      if (questionNumberSet.has(num)) return num;
      // Try with 'a' suffix (e.g., "11" -> "11a")
      if (questionNumberSet.has(num + "a")) return num + "a";
      return null;
    },
    [questionNumberSet]
  );

  // Custom paragraph renderer to add IDs for question numbers and render LaTeX
  const renderParagraph = useCallback(
    ({ children, ...props }: React.ComponentProps<"p">) => {
      const text = extractText(children).trim();
      // Match various question number formats at the start (with optional whitespace)
      const match = text.match(/^\s*(?:Question\s+|Q)?(\d+[a-z]?)[.):\s]/i);
      const processedChildren = processChildren(children);

      if (match) {
        const matchedNum = match[1];
        const questionNum = findMatchingQuestion(matchedNum);

        if (questionNum) {
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
      }

      return <p {...props}>{processedChildren}</p>;
    },
    [registerQuestionRef, processChildren, findMatchingQuestion]
  );

  // Custom ordered list renderer to track start number
  const renderOrderedList = useCallback(
    ({ children, start, ...props }: React.ComponentProps<"ol"> & { start?: number }) => {
      currentListStart.current = start ?? 1;
      return <ol {...props} start={start}>{children}</ol>;
    },
    []
  );

  // Custom list item renderer with LaTeX support and question detection
  const renderListItem = useCallback(
    ({ children, ordered, index, ...props }: React.ComponentProps<"li"> & { ordered?: boolean; index?: number }) => {
      const processedChildren = processChildren(children);

      if (ordered && typeof index === "number") {
        // Calculate the actual question number based on list start + index
        const listNum = String(currentListStart.current + index);
        const questionNum = findMatchingQuestion(listNum);

        // Check if this list item number matches a known question
        if (questionNum) {
          return (
            <li
              {...props}
              ref={(el) => registerQuestionRef(questionNum, el)}
              data-question={questionNum}
              className="scroll-mt-4"
            >
              {processedChildren}
            </li>
          );
        }
      }

      return <li {...props}>{processedChildren}</li>;
    },
    [processChildren, findMatchingQuestion, registerQuestionRef]
  );

  // Custom table cell renderer with LaTeX support
  const renderTableCell = useCallback(
    ({ children, ...props }: React.ComponentProps<"td">) => {
      return <td {...props}>{processChildren(children)}</td>;
    },
    [processChildren]
  );

  return (
    <div className="flex h-full gap-4">
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
              ol: renderOrderedList,
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
