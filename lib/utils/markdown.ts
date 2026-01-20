// Matches markdown image syntax: ![alt](src)
const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Replaces markdown image references with presigned URLs.
 * If no mapping found for an image, removes the broken reference.
 */
export function replaceMarkdownImageUrls(
  text: string,
  imageUrlMap: Map<string, string>
): string {
  return text
    .replace(IMAGE_PATTERN, (match, alt, src) => {
      // Extract the base image ID (e.g., "img-1.jpeg")
      const imageId = src.split("/").pop() || src;
      const presignedUrl = imageUrlMap.get(imageId);

      if (presignedUrl) {
        return `![${alt || imageId}](${presignedUrl})`;
      }
      // If no mapping found, remove the broken image reference
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Injects HTML anchor spans before question numbers for scroll targeting.
 * Handles patterns like "1.", "2)", "Question 1", "Q1", etc.
 */
export function injectQuestionAnchors(markdown: string): string {
  // Pattern matches common question number formats at line start
  // - "1." or "1)" - numbered questions
  // - "Question 1" or "Q1" - labeled questions
  // - "(a)" or "a)" - sub-questions (less common at start)
  return markdown.replace(
    /^(\s*)((?:Question\s+|Q)?(\d+)[.)]\s)/gim,
    (match, whitespace, full, num) => {
      return `${whitespace}<span id="q-${num}" data-question="${num}"></span>${full}`;
    }
  );
}
