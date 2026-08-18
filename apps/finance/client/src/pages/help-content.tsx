import { useEffect, useState } from 'react'
import { useParams, Link } from 'wouter'
import { Button } from "@finance/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card"
import { ArrowLeft, BookOpen, HelpCircle, AlertTriangle } from "lucide-react"
import { loadMDXContent, contentRegistry } from '@finance/lib/content-loader'
import { formatCategoryName } from '@finance/lib/mdx-utils'
import { RuntimeMDXRenderer } from '@finance/components/runtime-mdx-renderer'
import { MDXProviderWrapper } from '@finance/components/mdx-components'
import type { MDXContent } from '@finance/lib/mdx-utils'

export default function HelpContent() {
  const params = useParams()
  const { category, slug } = params as { category: string; slug: string }
  const [content, setContent] = useState<MDXContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadContent = async () => {
      if (!category || !slug) {
        setError('Invalid URL parameters')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const loadedContent = await loadMDXContent(category, slug)
        if (loadedContent) {
          setContent(loadedContent)
        } else {
          setError('Content not found')
        }
      } catch (err) {
        console.error('Error loading content:', err)
        setError('Failed to load content')
      } finally {
        setLoading(false)
      }
    }

    loadContent()
  }, [category, slug])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'how-to': return <BookOpen className="h-5 w-5 text-blue-600" />
      case 'faq': return <HelpCircle className="h-5 w-5 text-green-600" />
      case 'troubleshooting': return <AlertTriangle className="h-5 w-5 text-orange-600" />
      default: return <BookOpen className="h-5 w-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <Link href="/help">
                <Button variant="ghost" size="sm" className="flex items-center gap-2" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Help
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-lg text-gray-600 dark:text-gray-300">Loading content...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <Link href="/help">
                <Button variant="ghost" size="sm" className="flex items-center gap-2" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Help
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Content Not Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  The requested help content could not be found.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Error: {error || 'Unknown error'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/help">
                <Button variant="ghost" size="sm" className="flex items-center gap-2" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Help
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                {getCategoryIcon(category)}
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCategoryName(category)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Content Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {content.title}
            </h1>
            {content.description && (
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {content.description}
              </p>
            )}
            {content.lastModified && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Last updated: {content.lastModified}
              </p>
            )}
          </div>

          {/* MDX Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <MDXProviderWrapper>
              <RuntimeMDXRenderer 
                mdxContent={content.content} 
                className="mdx-content" 
              />
            </MDXProviderWrapper>
          </div>

          {/* Footer Navigation */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <Link href="/help">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Help Center
                </Button>
              </Link>
              
              {/* Related Articles */}
              <div className="flex gap-2">
                {contentRegistry
                  .filter(file => file.category === category && file.slug !== slug)
                  .slice(0, 2)
                  .map(file => (
                    <Link key={file.slug} href={`/help/${file.category}/${file.slug}`}>
                      <Button variant="ghost" size="sm">
                        {file.slug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Button>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
