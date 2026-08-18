import { useState, useEffect, useRef, useMemo } from "react"
import { cn } from "@finance/lib/utils"
import { Input } from "@finance/components/ui/input"
import { Button } from "@finance/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@finance/components/ui/popover"
import { Badge } from "@finance/components/ui/badge"
import { Separator } from "@finance/components/ui/separator"
import { Search, ArrowRight, FileText, HelpCircle, ChevronDown } from "lucide-react"
import { Link, useLocation } from "wouter"
import Fuse from "fuse.js"

export interface SearchableItem {
  id: string
  title: string
  content: string
  type: "guide" | "faq" | "troubleshooting"
  href: string
  section?: string
  keywords?: string[]
}

export interface HelpSearchProps {
  items: SearchableItem[]
  placeholder?: string
  className?: string
  onResultClick?: (item: SearchableItem) => void
}

function HelpSearch({ 
  items, 
  placeholder = "Search help...", 
  className,
  onResultClick 
}: HelpSearchProps) {
  const [location, setLocation] = useLocation()
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Initialize Fuse.js with search configuration
  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: [
        { name: "title", weight: 3 },
        { name: "content", weight: 2 },
        { name: "section", weight: 1.5 },
        { name: "keywords", weight: 2 }
      ],
      threshold: 0.3,
      distance: 200,
      includeScore: true,
      includeMatches: true
    })
  }, [items])

  // Perform search
  const results = useMemo(() => {
    if (!query.trim()) return []
    return fuse.search(query.trim()).slice(0, 8) // Limit to 8 results
  }, [fuse, query])

  // Initialize query from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const searchQuery = params.get("q")
    if (searchQuery) {
      setQuery(searchQuery)
      setIsOpen(true)
    }
  }, [])

  // Update URL when query changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (query.trim()) {
      params.set("q", query.trim())
    } else {
      params.delete("q")
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
    window.history.replaceState(null, "", newUrl)
  }, [query])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : 0
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : results.length - 1
          )
          break
        case "Enter":
          e.preventDefault()
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultClick(results[selectedIndex].item)
          }
          break
        case "Escape":
          setIsOpen(false)
          setSelectedIndex(-1)
          inputRef.current?.blur()
          break
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, results, selectedIndex])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      selectedElement?.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  const handleResultClick = (item: SearchableItem) => {
    setIsOpen(false)
    setSelectedIndex(-1)
    onResultClick?.(item)
    setLocation(item.href)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "guide":
        return <FileText className="h-4 w-4" />
      case "faq":
        return <HelpCircle className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getTypeBadge = (type: string) => {
    const variants = {
      guide: "default",
      faq: "secondary", 
      troubleshooting: "destructive"
    } as const

    return (
      <Badge variant={variants[type as keyof typeof variants] || "outline"} className="text-xs">
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  const highlightMatch = (text: string, matches: Fuse.FuseResultMatch[] = []) => {
    let highlightedText = text
    
    // Sort matches by start position (descending) to avoid index shifts
    const sortedMatches = matches
      .filter(match => match.key === "title" || match.key === "content")
      .flatMap(match => match.indices || [])
      .sort((a, b) => b[0] - a[0])

    sortedMatches.forEach(([start, end]) => {
      const before = highlightedText.slice(0, start)
      const match = highlightedText.slice(start, end + 1)
      const after = highlightedText.slice(end + 1)
      highlightedText = `${before}<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-1">${match}</mark>${after}`
    })

    return highlightedText
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="pl-9 pr-4"
              data-testid="help-search-input"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => {
                  setQuery("")
                  setIsOpen(false)
                }}
                data-testid="help-search-clear"
              >
                Ã—
              </Button>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent 
          className="w-[600px] p-0" 
          align="start"
          side="bottom"
          data-testid="help-search-results"
        >
          {results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {query ? "No results found" : "Start typing to search..."}
            </div>
          ) : (
            <div ref={resultsRef} className="max-h-96 overflow-y-auto">
              {results.map((result, index) => {
                const { item, matches } = result
                const isSelected = index === selectedIndex
                
                return (
                  <div key={item.id}>
                    <button
                      className={cn(
                        "w-full p-4 text-left hover:bg-accent hover:text-accent-foreground transition-colors",
                        isSelected && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => handleResultClick(item)}
                      data-testid={`search-result-${item.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getTypeIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 
                              className="font-medium text-sm truncate"
                              dangerouslySetInnerHTML={{
                                __html: highlightMatch(item.title, matches)
                              }}
                            />
                            {getTypeBadge(item.type)}
                          </div>
                          <p 
                            className="text-xs text-muted-foreground line-clamp-2"
                            dangerouslySetInnerHTML={{
                              __html: highlightMatch(
                                item.content.length > 120 
                                  ? `${item.content.slice(0, 120)}...`
                                  : item.content,
                                matches
                              )
                            }}
                          />
                          {item.section && (
                            <p className="text-xs text-muted-foreground mt-1">
                              in {item.section}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      </div>
                    </button>
                    {index < results.length - 1 && <Separator />}
                  </div>
                )
              })}
              
              {/* Footer with keyboard hints */}
              <div className="border-t bg-muted/50 px-4 py-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">â†‘â†“</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">â†µ</kbd>
                      Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Esc</kbd>
                      Close
                    </span>
                  </div>
                  <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { HelpSearch }
