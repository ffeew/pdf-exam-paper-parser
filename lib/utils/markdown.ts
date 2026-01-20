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
