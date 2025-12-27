/**
 * Generates a slug from a string
 * @param text The text to generate a slug from
 * @param isUnique A function that checks if the slug is unique
 * @returns A unique slug
 */
export async function generateSlug(
  text: string,
  isUnique: (slug: string) => Promise<boolean>,
): Promise<string> {
  // Convert to lowercase and replace spaces with hyphens
  let slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  // Check if slug is unique
  let isUniqueSlug = await isUnique(slug);
  let counter = 1;

  // If not unique, append a number until it is
  while (!isUniqueSlug) {
    const newSlug = `${slug}-${counter}`;
    isUniqueSlug = await isUnique(newSlug);
    if (isUniqueSlug) {
      slug = newSlug;
    }
    counter++;
  }

  return slug;
}
