import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-brand to-brand-accent text-white shadow-psychpath hover:from-brand-dark hover:to-brand hover:shadow-psychpath-lg",
        destructive:
          "bg-error text-white shadow-psychpath hover:bg-error/90 hover:shadow-psychpath-lg",
        outline:
          "border-2 border-brand bg-surface text-brand shadow-psychpath hover:bg-brand hover:text-white hover:shadow-psychpath-lg",
        secondary:
          "bg-surface border-2 border-border text-text shadow-psychpath hover:bg-accent hover:text-accent-foreground hover:shadow-psychpath-lg",
        ghost: "text-text hover:bg-brand-light hover:text-brand",
        link: "text-brand underline-offset-4 hover:underline hover:text-brand-dark",
        accent:
          "bg-brand-accent text-white shadow-psychpath hover:bg-brand-accent/90 hover:shadow-psychpath-lg",
      },
      size: {
        default: "h-10 px-6 py-3",
        sm: "h-8 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
