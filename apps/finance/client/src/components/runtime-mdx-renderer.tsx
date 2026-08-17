import { useState, useEffect, useMemo } from 'react'
import { compile, run } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'
import MDXComponents from './mdx-components'

interface RuntimeMDXRendererProps {
  mdxContent: string
  className?: string
}

export function RuntimeMDXRenderer({ mdxContent, className }: RuntimeMDXRendererProps) {
  const [MDXContent, setMDXContent] = useState<React.ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!mdxContent) {
      setIsLoading(false)
      return
    }

    const compileMDX = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Compile MDX to JS
        const compiled = await compile(mdxContent, {
          outputFormat: 'function-body',
          development: import.meta.env.DEV,
        })

        // Run the compiled MDX with React runtime and custom components
        const { default: Component } = await run(compiled, {
          ...runtime,
          baseUrl: import.meta.url,
          // Provide custom components to the MDX content
          Fragment: runtime.Fragment,
          jsx: runtime.jsx,
          jsxs: runtime.jsxs,
          useMDXComponents: () => MDXComponents,
        })

        setMDXContent(() => Component)
      } catch (err) {
        console.error('Error compiling/running MDX:', err)
        setError('Failed to compile MDX content')
      } finally {
        setIsLoading(false)
      }
    }

    compileMDX()
  }, [mdxContent])

  if (isLoading) {
    return (
      <div className={className}>
        <div className="text-gray-500 italic">Loading content...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-red-500 italic">Error: {error}</div>
      </div>
    )
  }

  if (!MDXContent) {
    return (
      <div className={className}>
        <div className="text-gray-500 italic">No content available</div>
      </div>
    )
  }

  // Render the compiled MDX component
  return (
    <div className={className}>
      <MDXContent />
    </div>
  )
}


// Alternative simpler implementation for immediate use
export function SimpleMDXRenderer({ mdxContent, className }: RuntimeMDXRendererProps) {
  const processedContent = useMemo(() => {
    if (!mdxContent) return ''

    // Basic markdown-like processing for immediate functionality
    let processed = mdxContent
      .replace(/^# (.*$)/gm, '<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-6">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mb-4">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="scroll-m-20 text-2xl font-semibold tracking-tight mb-3">$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4 class="scroll-m-20 text-xl font-semibold tracking-tight mb-2">$1</h4>')
      .replace(/^\*\*([^*\n]+):\*\*/gm, '<p class="leading-7 [&:not(:first-child)]:mt-6"><strong>$1:</strong></p>')
      .replace(/^\* (.*$)/gm, '<li class="mt-2">$1</li>')
      .replace(/^- (.*$)/gm, '<li class="mt-2">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="mt-2">$1</li>')
      .replace(/`([^`]+)`/g, '<code class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="font-medium text-primary underline underline-offset-4 hover:no-underline">$1</a>')

    // Process special MDX components
    processed = processed
      .replace(/<Card>/g, '<div class="my-6 rounded-lg border bg-card text-card-foreground shadow-sm p-6">')
      .replace(/<\/Card>/g, '</div>')
      .replace(/<CardHeader>/g, '<div class="pb-2">')
      .replace(/<\/CardHeader>/g, '</div>')
      .replace(/<CardTitle>/g, '<h3 class="text-2xl font-semibold leading-none tracking-tight">')
      .replace(/<\/CardTitle>/g, '</h3>')
      .replace(/<CardDescription>/g, '<p class="text-sm text-muted-foreground">')
      .replace(/<\/CardDescription>/g, '</p>')
      .replace(/<CardContent>/g, '<div class="pt-6">')
      .replace(/<\/CardContent>/g, '</div>')
      .replace(/<Alert>/g, '<div class="my-6 relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground">')
      .replace(/<\/Alert>/g, '</div>')
      .replace(/<AlertTitle>/g, '<h5 class="mb-1 font-medium leading-none tracking-tight">')
      .replace(/<\/AlertTitle>/g, '</h5>')
      .replace(/<AlertDescription>/g, '<div class="text-sm [&_p]:leading-relaxed">')
      .replace(/<\/AlertDescription>/g, '</div>')
      .replace(/<Badge[^>]*>/g, '<span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">')
      .replace(/<\/Badge>/g, '</span>')

    // Convert newlines to paragraphs
    const lines = processed.split('\n').filter(line => line.trim())
    const paragraphs = []
    let currentParagraph = []

    for (const line of lines) {
      if (line.trim() === '') {
        if (currentParagraph.length > 0) {
          paragraphs.push(currentParagraph.join(' '))
          currentParagraph = []
        }
      } else if (line.match(/^<[^>]+>/)) {
        // HTML tag, add as is
        if (currentParagraph.length > 0) {
          paragraphs.push('<p class="leading-7 [&:not(:first-child)]:mt-6">' + currentParagraph.join(' ') + '</p>')
          currentParagraph = []
        }
        paragraphs.push(line)
      } else {
        currentParagraph.push(line.trim())
      }
    }

    if (currentParagraph.length > 0) {
      paragraphs.push('<p class="leading-7 [&:not(:first-child)]:mt-6">' + currentParagraph.join(' ') + '</p>')
    }

    return paragraphs.join('\n')
  }, [mdxContent])

  return (
    <div 
      className={className} 
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  )
}