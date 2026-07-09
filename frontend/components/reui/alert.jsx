import * as React from "react"
import { cn } from "@/lib/utils"

const Alert = React.forwardRef(({ className, variant = "default", children, ...props }, ref) => {
  const variantStyles = {
    default: "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800",
    destructive: "bg-red-50/50 dark:bg-red-950/20 border-red-500/30 text-red-600 dark:text-red-400",
    warning: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/30 text-amber-600 dark:text-amber-400",
    success: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
  }

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 backdrop-blur-sm transition-all",
        variantStyles[variant] || variantStyles.default,
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        {children}
      </div>
    </div>
  )
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight text-sm", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm opacity-90 leading-relaxed font-medium", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

const AlertAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("ml-auto flex items-center gap-2", className)}
    {...props}
  />
))
AlertAction.displayName = "AlertAction"

export { Alert, AlertTitle, AlertDescription, AlertAction }
