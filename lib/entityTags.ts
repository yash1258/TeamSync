export const normalizeEntitySlug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const buildProjectTagFromName = (value: string) =>
  `project:${normalizeEntitySlug(value) || 'untitled-project'}`;

export const extractProjectTag = (tags: string[]) =>
  tags.find((tag) => tag.toLowerCase().startsWith('project:')) ?? null;

export const extractProjectNameFromTag = (tag: string | null) => {
  if (!tag) return null;
  const name = tag.split(':').slice(1).join(':').trim();
  return name || null;
};

export const buildIssueTag = (issueId: string) => `issue:${issueId}`;

export const extractIssueIds = (tags: string[]) =>
  tags
    .filter((tag) => tag.toLowerCase().startsWith('issue:'))
    .map((tag) => tag.split(':').slice(1).join(':').trim())
    .filter(Boolean);

export const hasIssueTag = (tags: string[], issueId: string) =>
  extractIssueIds(tags).includes(issueId);

export const mergeUniqueTags = (...tagLists: string[][]) => {
  const seen = new Set<string>();
  for (const list of tagLists) {
    for (const tag of list) {
      const normalized = tag.trim();
      if (!normalized) continue;
      seen.add(normalized);
    }
  }
  return Array.from(seen);
};
