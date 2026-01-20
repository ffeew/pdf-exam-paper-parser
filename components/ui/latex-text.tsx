"use client";

import { useMemo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";

interface LatexTextProps {
  text: string;
  className?: string;
  preserveWhitespace?: boolean;
}

interface TextSegment {
  type: "text" | "inline-latex" | "block-latex";
  content: string;
}

/**
 * Finds matching brace content starting at position, handles nested braces.
 * Returns the content inside braces and the end position.
 */
function extractBraceContent(
  text: string,
  start: number
): { content: string; end: number } | null {
  if (text[start] !== "{") return null;

  let depth = 0;
  let i = start;

  while (i < text.length) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        return {
          content: text.slice(start + 1, i),
          end: i,
        };
      }
    }
    i++;
  }

  return null; // Unmatched braces
}

/**
 * Try to match a LaTeX command at the given position.
 * Returns the full command string and end position, or null.
 */
function matchLatexCommand(
  text: string,
  start: number
): { match: string; end: number } | null {
  if (text[start] !== "\\") return null;

  // Match command name (letters only)
  let i = start + 1;
  while (i < text.length && /[a-zA-Z]/.test(text[i])) {
    i++;
  }

  if (i === start + 1) {
    // No command name, might be escaped char like \\ or \$
    return null;
  }

  const commandName = text.slice(start + 1, i);

  // Commands that take no arguments (just the command itself)
  const noArgCommands = [
    "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
    "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "rho", "sigma",
    "tau", "upsilon", "phi", "chi", "psi", "omega",
    "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma",
    "Upsilon", "Phi", "Psi", "Omega",
    "times", "div", "pm", "mp", "cdot", "ast", "star", "circ", "bullet",
    "oplus", "otimes", "odot",
    "leq", "geq", "neq", "approx", "equiv", "sim", "simeq", "cong",
    "propto", "subset", "supset", "subseteq", "supseteq", "in", "notin",
    "ni", "cup", "cap", "setminus", "emptyset",
    "infty", "partial", "nabla", "forall", "exists", "neg", "land", "lor",
    "to", "rightarrow", "leftarrow", "Rightarrow", "Leftarrow",
    "leftrightarrow", "Leftrightarrow", "mapsto",
    "ldots", "cdots", "vdots", "ddots", "dots",
    "quad", "qquad", "space", "hspace", "vspace",
  ];

  if (noArgCommands.includes(commandName)) {
    return { match: text.slice(start, i), end: i - 1 };
  }

  // Commands that take arguments
  const argCommands: Record<string, number> = {
    frac: 2, dfrac: 2, tfrac: 2, binom: 2, tbinom: 2, dbinom: 2,
    sqrt: 1, // Can have optional [], then 1 required
    text: 1, textbf: 1, textit: 1, textrm: 1, textsf: 1, texttt: 1,
    mathrm: 1, mathbf: 1, mathit: 1, mathsf: 1, mathtt: 1, mathcal: 1, mathbb: 1,
    vec: 1, hat: 1, bar: 1, dot: 1, ddot: 1, tilde: 1,
    overline: 1, underline: 1, overbrace: 1, underbrace: 1,
    log: 0, ln: 0, exp: 0, sin: 0, cos: 0, tan: 0, sec: 0, csc: 0, cot: 0,
    arcsin: 0, arccos: 0, arctan: 0, sinh: 0, cosh: 0, tanh: 0,
    lim: 0, sum: 0, prod: 0, int: 0, oint: 0,
  };

  const expectedArgs = argCommands[commandName];

  if (expectedArgs === undefined) {
    // Unknown command - just return the command name
    return { match: text.slice(start, i), end: i - 1 };
  }

  if (expectedArgs === 0) {
    // No required braced args
    return { match: text.slice(start, i), end: i - 1 };
  }

  // Skip whitespace
  while (i < text.length && /\s/.test(text[i])) i++;

  // Handle optional [] argument (like \sqrt[3]{8})
  if (text[i] === "[") {
    const closeIdx = text.indexOf("]", i);
    if (closeIdx !== -1) {
      i = closeIdx + 1;
      // Skip whitespace after []
      while (i < text.length && /\s/.test(text[i])) i++;
    }
  }

  // Extract required {} arguments
  let argsFound = 0;
  while (argsFound < expectedArgs && i < text.length) {
    // Skip whitespace
    while (i < text.length && /\s/.test(text[i])) i++;

    if (text[i] !== "{") break;

    const braceResult = extractBraceContent(text, i);
    if (!braceResult) break;

    i = braceResult.end + 1;
    argsFound++;
  }

  if (argsFound < expectedArgs) {
    // Didn't find all required args, just return command name
    return { match: text.slice(start, start + 1 + commandName.length), end: start + commandName.length };
  }

  return { match: text.slice(start, i), end: i - 1 };
}

function parseLatexContent(text: string): TextSegment[] {
  if (!text) return [];

  const segments: TextSegment[] = [];
  let i = 0;
  let textStart = 0;

  while (i < text.length) {
    // Check for block math $$...$$
    if (text.slice(i, i + 2) === "$$") {
      const endIdx = text.indexOf("$$", i + 2);
      if (endIdx !== -1) {
        // Add preceding text
        if (i > textStart) {
          segments.push({ type: "text", content: text.slice(textStart, i) });
        }
        segments.push({
          type: "block-latex",
          content: text.slice(i + 2, endIdx),
        });
        i = endIdx + 2;
        textStart = i;
        continue;
      }
    }

    // Check for inline math $...$
    if (text[i] === "$" && text[i + 1] !== "$") {
      const endIdx = text.indexOf("$", i + 1);
      if (endIdx !== -1) {
        // Add preceding text
        if (i > textStart) {
          segments.push({ type: "text", content: text.slice(textStart, i) });
        }
        segments.push({
          type: "inline-latex",
          content: text.slice(i + 1, endIdx),
        });
        i = endIdx + 1;
        textStart = i;
        continue;
      }
    }

    // Check for \[...\] block math
    if (text.slice(i, i + 2) === "\\[") {
      const endIdx = text.indexOf("\\]", i + 2);
      if (endIdx !== -1) {
        if (i > textStart) {
          segments.push({ type: "text", content: text.slice(textStart, i) });
        }
        segments.push({
          type: "block-latex",
          content: text.slice(i + 2, endIdx),
        });
        i = endIdx + 2;
        textStart = i;
        continue;
      }
    }

    // Check for \(...\) inline math
    if (text.slice(i, i + 2) === "\\(") {
      const endIdx = text.indexOf("\\)", i + 2);
      if (endIdx !== -1) {
        if (i > textStart) {
          segments.push({ type: "text", content: text.slice(textStart, i) });
        }
        segments.push({
          type: "inline-latex",
          content: text.slice(i + 2, endIdx),
        });
        i = endIdx + 2;
        textStart = i;
        continue;
      }
    }

    // Check for raw LaTeX command
    if (text[i] === "\\") {
      const cmdResult = matchLatexCommand(text, i);
      if (cmdResult && cmdResult.match.length > 1) {
        // Add preceding text
        if (i > textStart) {
          segments.push({ type: "text", content: text.slice(textStart, i) });
        }
        segments.push({
          type: "inline-latex",
          content: cmdResult.match,
        });
        i = cmdResult.end + 1;
        textStart = i;
        continue;
      }
    }

    i++;
  }

  // Add any remaining text
  if (textStart < text.length) {
    segments.push({ type: "text", content: text.slice(textStart) });
  }

  return segments;
}

function renderLatex(
  latex: string,
  displayMode: boolean
): { html: string; error: boolean } {
  try {
    const html = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      errorColor: "#cc0000",
      strict: false,
      trust: true,
    });
    return { html, error: false };
  } catch {
    return { html: latex, error: true };
  }
}

export function LatexText({
  text,
  className,
  preserveWhitespace = true,
}: LatexTextProps) {
  const segments = useMemo(() => parseLatexContent(text), [text]);

  if (segments.length === 0) {
    return null;
  }

  // If there's only plain text, render simply
  if (segments.length === 1 && segments[0].type === "text") {
    return (
      <span
        className={cn(preserveWhitespace && "whitespace-pre-wrap", className)}
      >
        {segments[0].content}
      </span>
    );
  }

  return (
    <span
      className={cn(preserveWhitespace && "whitespace-pre-wrap", className)}
    >
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.content}</span>;
        }

        const isBlock = segment.type === "block-latex";
        const { html, error } = renderLatex(segment.content, isBlock);

        if (error) {
          return (
            <span key={index} className="text-destructive" title="Invalid LaTeX">
              {segment.content}
            </span>
          );
        }

        if (isBlock) {
          return (
            <span
              key={index}
              className="block my-2"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }

        return (
          <span key={index} dangerouslySetInnerHTML={{ __html: html }} />
        );
      })}
    </span>
  );
}
