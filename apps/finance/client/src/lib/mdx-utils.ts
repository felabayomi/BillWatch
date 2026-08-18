import Fuse from 'fuse.js'

export interface MDXContent {
  id: string
  title: string
  description?: string
  category: 'how-to' | 'faq' | 'troubleshooting'
  tags?: string[]
  content: string
  slug: string
  lastModified?: string
}

// Fuse.js configuration for searching MDX content
export const searchOptions = {
  includeScore: true,
  threshold: 0.3,
  keys: [
    {
      name: 'title',
      weight: 0.4
    },
    {
      name: 'description',
      weight: 0.3
    },
    {
      name: 'content',
      weight: 0.2
    },
    {
      name: 'tags',
      weight: 0.1
    }
  ]
}

export function createSearchIndex(content: MDXContent[]) {
  return new Fuse(content, searchOptions)
}

export function searchContent(fuse: Fuse<MDXContent>, query: string) {
  if (!query.trim()) return []
  
  const results = fuse.search(query)
  return results.map(result => ({
    ...result.item,
    score: result.score
  }))
}

// Helper function to extract frontmatter from MDX content
export function parseFrontmatter(content: string) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)
  
  if (!match) {
    return {
      frontmatter: {},
      content: content
    }
  }
  
  const frontmatterStr = match[1]
  const bodyContent = match[2]
  
  // Simple YAML parser for frontmatter
  const frontmatter: Record<string, any> = {}
  const lines = frontmatterStr.split('\n')
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '')
      
      // Handle arrays (simple comma-separated values)
      if (value.includes(',')) {
        frontmatter[key] = value.split(',').map(v => v.trim())
      } else {
        frontmatter[key] = value
      }
    }
  }
  
  return {
    frontmatter,
    content: bodyContent
  }
}

// Helper to generate slug from filename
export function generateSlug(filename: string): string {
  return filename
    .replace(/\.mdx?$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Helper to format category name
export function formatCategoryName(category: string): string {
  switch (category) {
    case 'how-to':
      return 'How To'
    case 'faq':
      return 'FAQ'
    case 'troubleshooting':
      return 'Troubleshooting'
    default:
      return category.charAt(0).toUpperCase() + category.slice(1)
  }
}
