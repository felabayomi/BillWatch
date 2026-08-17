import { MDXContent, parseFrontmatter, generateSlug } from './mdx-utils'

// This would be replaced with actual dynamic imports in a real implementation
// For now, we'll create a structure that shows how MDX content would be loaded

export interface ContentFile {
  path: string
  category: 'how-to' | 'faq' | 'troubleshooting'
  slug: string
}

// Mock content registry - in a real app, this would be generated at build time
export const contentRegistry: ContentFile[] = [
  {
    path: 'content/help/how-to/getting-started.mdx',
    category: 'how-to',
    slug: 'getting-started'
  },
  {
    path: 'content/help/faq/common-questions.mdx',
    category: 'faq',
    slug: 'common-questions'
  },
  {
    path: 'content/help/troubleshooting/common-issues.mdx',
    category: 'troubleshooting',
    slug: 'common-issues'
  }
]

// Function to load actual MDX content from files
export async function loadMDXContent(category: string, slug: string): Promise<MDXContent | null> {
  const contentFile = contentRegistry.find(
    file => file.category === category && file.slug === slug
  )
  
  if (!contentFile) {
    return null
  }
  
  try {
    // Fetch the raw MDX file content from the server using API route
    const fetchUrl = `/api/content/${category}/${slug}.mdx`
    const response = await fetch(fetchUrl)
    if (!response.ok) {
      console.error(`Failed to fetch ${fetchUrl}: ${response.status}`)
      return null
    }
    
    const rawContent = await response.text()
    const { frontmatter, content } = parseFrontmatter(rawContent)
    
    return {
      id: `${category}-${slug}`,
      title: frontmatter.title || 'Untitled',
      description: frontmatter.description,
      category: category as 'how-to' | 'faq' | 'troubleshooting',
      tags: frontmatter.tags || [],
      content: content,
      slug: slug,
      lastModified: frontmatter.lastModified
    }
  } catch (error) {
    console.error(`Error loading MDX content for ${category}/${slug}:`, error)
    
    // Fallback to mock content if file loading fails
    const fallbackContent = `---
title: ${slug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
description: Content loading fallback for ${category}
category: ${category}
tags: [${category}, help, guide]
lastModified: 2025-09-13
---

# ${slug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}

Content is currently being loaded. Please check back soon.

<Alert>
<AlertTitle>📝 Note</AlertTitle>
<AlertDescription>
This content is in development. Full documentation will be available soon.
</AlertDescription>
</Alert>
`
    
    const { frontmatter, content } = parseFrontmatter(fallbackContent)
    
    return {
      id: `${category}-${slug}`,
      title: frontmatter.title || 'Untitled',
      description: frontmatter.description,
      category: category as 'how-to' | 'faq' | 'troubleshooting',
      tags: frontmatter.tags || [],
      content: content,
      slug: slug,
      lastModified: frontmatter.lastModified
    }
  }
}

// Function to get all content for a category
export async function getContentByCategory(category: 'how-to' | 'faq' | 'troubleshooting'): Promise<MDXContent[]> {
  const categoryFiles = contentRegistry.filter(file => file.category === category)
  const contentPromises = categoryFiles.map(file => loadMDXContent(file.category, file.slug))
  const contents = await Promise.all(contentPromises)
  
  return contents.filter((content): content is MDXContent => content !== null)
}

// Function to get all available content
export async function getAllContent(): Promise<MDXContent[]> {
  const allPromises = contentRegistry.map(file => loadMDXContent(file.category, file.slug))
  const contents = await Promise.all(allPromises)
  
  return contents.filter((content): content is MDXContent => content !== null)
}

// Utility to check if MDX setup is working
export function testMDXSetup(): boolean {
  try {
    // Test that we can parse frontmatter
    const testContent = `---
title: Test
description: Test description
---

# Test Content`
    
    const { frontmatter, content } = parseFrontmatter(testContent)
    
    return (
      frontmatter.title === 'Test' &&
      frontmatter.description === 'Test description' &&
      content.trim() === '# Test Content'
    )
  } catch (error) {
    console.error('MDX setup test failed:', error)
    return false
  }
}