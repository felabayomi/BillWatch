import { MDXProvider } from '@mdx-js/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@finance/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@finance/components/ui/alert'
import { Badge } from '@finance/components/ui/badge'
import { Separator } from '@finance/components/ui/separator'
import { Button } from '@finance/components/ui/button'
import { Code } from 'lucide-react'

// Custom components for MDX rendering
const MDXComponents = {
  // Headings
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-6" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mb-4" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-3" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className="scroll-m-20 text-xl font-semibold tracking-tight mb-2" {...props}>
      {children}
    </h4>
  ),
  
  // Paragraphs and text
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="leading-7 [&:not(:first-child)]:mt-6" {...props}>
      {children}
    </p>
  ),
  
  // Lists
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="mt-2" {...props}>
      {children}
    </li>
  ),
  
  // Code
  code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold" {...props}>
      {children}
    </code>
  ),
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="mb-4 mt-6 overflow-x-auto rounded-lg border bg-zinc-950 py-4 dark:bg-zinc-900" {...props}>
      {children}
    </pre>
  ),
  
  // Links
  a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a 
      href={href} 
      className="font-medium text-primary underline underline-offset-4 hover:no-underline" 
      {...props}
    >
      {children}
    </a>
  ),
  
  // Separators
  hr: () => <Separator className="my-8" />,
  
  // Custom components
  Card: ({ children, ...props }: React.ComponentProps<typeof Card>) => (
    <Card className="my-6" {...props}>
      {children}
    </Card>
  ),
  CardHeader: CardHeader,
  CardContent: CardContent,
  CardTitle: CardTitle,
  CardDescription: CardDescription,
  
  Alert: ({ children, ...props }: React.ComponentProps<typeof Alert>) => (
    <Alert className="my-6" {...props}>
      {children}
    </Alert>
  ),
  AlertTitle: AlertTitle,
  AlertDescription: AlertDescription,
  
  Badge: Badge,
  Button: Button,
  
  // Tables
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 w-full overflow-y-auto">
      <table className="w-full" {...props}>
        {children}
      </table>
    </div>
  ),
  tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="m-0 border-t p-0 even:bg-muted" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right" {...props}>
      {children}
    </td>
  ),
  
  // Blockquotes
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="mt-6 border-l-2 pl-6 italic" {...props}>
      {children}
    </blockquote>
  ),
}

interface MDXProviderWrapperProps {
  children: React.ReactNode
}

export function MDXProviderWrapper({ children }: MDXProviderWrapperProps) {
  return (
    <MDXProvider components={MDXComponents}>
      {children}
    </MDXProvider>
  )
}

export default MDXComponents
