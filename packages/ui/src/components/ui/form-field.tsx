import * as React from "react"

import { cn } from "@sker/ui/lib/utils"

export interface FormFieldProps {
  label: string
  children: React.ReactNode
  className?: string
  required?: boolean
}

function FormField({ label, children, className, required }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, className, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm text-foreground",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          "placeholder:text-muted-foreground/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus:border-destructive focus:ring-destructive/20",
          className
        )}
        {...props}
      />
    )

    if (!label && !error) {
      return input
    }

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-muted-foreground">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        {input}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    )
  }
)

FormInput.displayName = "FormInput"

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    const textarea = (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm text-foreground",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          "placeholder:text-muted-foreground/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus:border-destructive focus:ring-destructive/20",
          className
        )}
        {...props}
      />
    )

    if (!label && !error) {
      return textarea
    }

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-muted-foreground">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        {textarea}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    )
  }
)

FormTextarea.displayName = "FormTextarea"

export { FormField, FormInput, FormTextarea }
