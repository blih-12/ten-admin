// Shared helpers for merging backend-stored display-name/alias overrides
// (from /api/logo-aliases) over the bundled static logo library slugs.

// "manchester-united" -> "Manchester United"
export const defaultDisplayName = (slug) =>
  slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

// Turns the raw override list from the API into a lookup map keyed by
// "kind:slug" -> { displayName, aliases }
export const toOverrideMap = (list = []) => {
  const map = {}
  for (const item of list) {
    map[`${item.kind}:${item.slug}`] = { displayName: item.displayName, aliases: item.aliases || [] }
  }
  return map
}

// Merges a { slug: path } logo map with overrides into a sorted, searchable list.
export const mergeLogoList = (rawMap, kind, overrideMap) => {
  return Object.entries(rawMap)
    .map(([slug, path]) => {
      const override = overrideMap[`${kind}:${slug}`]
      const displayName = override?.displayName || defaultDisplayName(slug)
      const aliases = override?.aliases || []
      return {
        slug,
        path,
        displayName,
        aliases,
        // everything this entry should match against when searching
        searchText: [displayName, slug, ...aliases].join(' ').toLowerCase(),
      }
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}
