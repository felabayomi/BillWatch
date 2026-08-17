import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { HelpCircle, AlertTriangle, CheckCircle, Info } from "lucide-react"

export interface FAQItem {
  id: string
  question: string
  answer: string | React.ReactNode
  category?: string
  tags?: string[]
  type?: "general" | "technical" | "billing" | "troubleshooting"
  isNew?: boolean
  isImportant?: boolean
}

export interface HelpAccordionProps {
  items: FAQItem[]
  className?: string
  showCategories?: boolean
  allowMultiple?: boolean
  defaultValue?: string | string[]
}

function HelpAccordion({ 
  items, 
  className,
  showCategories = true,
  allowMultiple = true,
  defaultValue
}: HelpAccordionProps) {
  // Group items by category if showCategories is true
  const groupedItems = showCategories 
    ? items.reduce((acc, item) => {
        const category = item.category || "General"
        if (!acc[category]) acc[category] = []
        acc[category].push(item)
        return acc
      }, {} as Record<string, FAQItem[]>)
    : { "All": items }

  const getTypeIcon = (type: FAQItem["type"]) => {
    switch (type) {
      case "technical":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case "billing":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "troubleshooting":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <HelpCircle className="h-4 w-4 text-blue-500" />
    }
  }

  const getTypeBadge = (type: FAQItem["type"]) => {
    const variants = {
      general: "secondary",
      technical: "default",
      billing: "outline",
      troubleshooting: "destructive"
    } as const

    return (
      <Badge 
        variant={variants[type || "general"]} 
        className="text-xs ml-2"
      >
        {(type || "general").charAt(0).toUpperCase() + (type || "general").slice(1)}
      </Badge>
    )
  }

  return (
    <div className={cn("space-y-6", className)} data-testid="help-accordion">
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category}>
          {showCategories && Object.keys(groupedItems).length > 1 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                {category}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {categoryItems.length} question{categoryItems.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
          
          <Accordion 
            type={allowMultiple ? "multiple" : "single"} 
            className="w-full"
            defaultValue={defaultValue}
          >
            {categoryItems.map((item) => (
              <AccordionItem 
                key={item.id} 
                value={item.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg mb-2 px-4"
                data-testid={`faq-item-${item.id}`}
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-start gap-3 text-left w-full">
                    {getTypeIcon(item.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.question}
                        </span>
                        {item.isNew && (
                          <Badge variant="default" className="text-xs bg-blue-500">
                            New
                          </Badge>
                        )}
                        {item.isImportant && (
                          <Badge variant="destructive" className="text-xs">
                            Important
                          </Badge>
                        )}
                        {item.type && getTypeBadge(item.type)}
                      </div>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {item.tags.slice(0, 3).map((tag) => (
                            <Badge 
                              key={tag} 
                              variant="outline" 
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed ml-7">
                    {typeof item.answer === "string" ? (
                      <div dangerouslySetInnerHTML={{ __html: item.answer }} />
                    ) : (
                      item.answer
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  )
}

export { HelpAccordion }