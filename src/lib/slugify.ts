const UMLAUT_MAP: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'ae', Ö: 'oe', Ü: 'ue', ß: 'ss',
};

export function slugify(input: string): string {
  return input
    .replace(/[äöüÄÖÜß]/g, (c) => UMLAUT_MAP[c] ?? c)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = slugify(base) || `artikel-${Date.now()}`;
  if (!(await exists(slug))) return slug;
  for (let i = 2; i < 50; i++) {
    const candidate = `${slug}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${slug}-${Date.now()}`;
}
