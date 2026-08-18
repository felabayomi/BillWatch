import { cn } from "@finance/lib/utils"
import { Badge } from "@finance/components/ui/badge"

export interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number
  title: string
  description?: string
  image?: string
  imageAlt?: string
  imageCaption?: string
  completed?: boolean
}

function Step({
  className,
  step,
  title,
  description,
  image,
  imageAlt,
  imageCaption,
  completed = false,
  children,
  ...props
}: StepProps) {
  return (
    <div
      className={cn("relative", className)}
      data-testid={`step-${step}`}
      {...props}
    >
      {/* Step indicator */}
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold",
              completed
                ? "border-green-500 bg-green-500 text-white"
                : "border-blue-500 bg-blue-500 text-white"
            )}
          >
            {step}
          </div>
        </div>
        
        {/* Content */}
        <div className="ml-4 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {completed && (
              <Badge variant="secondary" className="text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30">
                Completed
              </Badge>
            )}
          </div>
          
          {description && (
            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              {description}
            </p>
          )}
          
          {/* Additional content */}
          {children && (
            <div className="space-y-4 mb-4">
              {children}
            </div>
          )}
          
          {/* Image with caption */}
          {image && (
            <div className="mb-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800">
                <img
                  src={image}
                  alt={imageAlt || `Step ${step} screenshot`}
                  className="w-full h-auto"
                  data-testid={`step-${step}-image`}
                />
              </div>
              {imageCaption && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center italic">
                  {imageCaption}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Connecting line for next step */}
      <div className="absolute left-4 top-8 h-6 w-0.5 bg-gray-200 dark:bg-gray-700" />
    </div>
  )
}

export { Step }
