import { cn } from "@/lib/utils"
import { AlertTriangle, Info, Lightbulb, CheckCircle, XCircle } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

const calloutVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
        tip: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-100 [&>svg]:text-green-600 dark:[&>svg]:text-green-400",
        warning: "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-100 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400",
        danger: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100 [&>svg]:text-red-600 dark:[&>svg]:text-red-400",
        success: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-100 [&>svg]:text-green-600 dark:[&>svg]:text-green-400"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

const iconMap = {
  default: Info,
  info: Info,
  tip: Lightbulb,
  warning: AlertTriangle,
  danger: XCircle,
  success: CheckCircle
}

export interface CalloutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof calloutVariants> {
  icon?: boolean
  title?: string
}

function Callout({
  className,
  variant = "default",
  icon = true,
  title,
  children,
  ...props
}: CalloutProps) {
  const IconComponent = iconMap[variant || "default"]

  return (
    <div
      className={cn(calloutVariants({ variant }), className)}
      data-testid={`callout-${variant}`}
      {...props}
    >
      {icon && <IconComponent className="h-4 w-4" />}
      <div>
        {title && (
          <h5 className="mb-1 font-medium leading-none tracking-tight">
            {title}
          </h5>
        )}
        <div className="text-sm [&_p]:leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  )
}

export { Callout, calloutVariants }