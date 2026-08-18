import { useState, useEffect } from "react"
import { cn } from "@finance/lib/utils"
import { Button } from "@finance/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@finance/components/ui/sheet"
import { ScrollArea } from "@finance/components/ui/scroll-area"
import { Separator } from "@finance/components/ui/separator"
import { Menu, ChevronRight } from "lucide-react"
import { Link, useLocation } from "wouter"

export interface HelpSection {
  id: string
  title: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  subsections?: HelpSubsection[]
}

export interface HelpSubsection {
  id: string
  title: string
  href: string
}

export interface HelpLayoutProps {
  sections: HelpSection[]
  children: React.ReactNode
  title?: string
  description?: string
}

function HelpLayout({ sections, children, title = "Help Center", description }: HelpLayoutProps) {
  const [location] = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  const TableOfContents = ({ className }: { className?: string }) => (
    <div className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Contents
        </h2>
        <nav className="space-y-1" data-testid="help-toc">
          {sections.map((section) => {
            const isActive = location === section.href || 
              section.subsections?.some(sub => location === sub.href)
            
            return (
              <div key={section.id}>
                <Link href={section.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start text-left h-auto py-2 px-3",
                      isActive && "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                    )}
                    data-testid={`toc-${section.id}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {section.icon && (
                        <section.icon className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="flex-1 text-sm">{section.title}</span>
                      {section.subsections && (
                        <ChevronRight className="h-3 w-3 flex-shrink-0" />
                      )}
                    </div>
                  </Button>
                </Link>
                
                {/* Subsections */}
                {section.subsections && isActive && (
                  <div className="ml-6 mt-1 space-y-1">
                    {section.subsections.map((subsection) => (
                      <Link key={subsection.id} href={subsection.href}>
                        <Button
                          variant={location === subsection.href ? "secondary" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left h-auto py-1.5 px-2",
                            location === subsection.href && 
                            "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                          )}
                          data-testid={`toc-${subsection.id}`}
                        >
                          <span className="text-xs">{subsection.title}</span>
                        </Button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-8">
          {/* Desktop TOC - Left Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-6">
              <ScrollArea className="h-[calc(100vh-6rem)]">
                <TableOfContents />
              </ScrollArea>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {/* Mobile header with menu toggle */}
            <div className="lg:hidden mb-6">
              <div className="flex items-center justify-between">
                <div>
                  {title && (
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      {description}
                    </p>
                  )}
                </div>
                
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="mobile-menu-trigger">
                      <Menu className="h-4 w-4" />
                      <span className="sr-only">Open navigation menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <div className="py-4">
                      <h2 className="text-lg font-semibold mb-4">Navigation</h2>
                      <TableOfContents />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              <Separator className="mt-4" />
            </div>

            {/* Desktop header */}
            <div className="hidden lg:block mb-8">
              {title && (
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  {description}
                </p>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-gray dark:prose-invert max-w-none" data-testid="help-content">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export { HelpLayout }
