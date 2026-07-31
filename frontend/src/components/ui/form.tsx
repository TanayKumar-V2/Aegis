"use client"

import * as React from "react"
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
))
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<React.ElementRef<typeof Label>, React.ComponentPropsWithoutRef<typeof Label>>(({ className, ...props }, ref) => (
  <Label ref={ref} className={cn(className)} {...props} />
))
FormLabel.displayName = "FormLabel"

function FormControl({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

const FormMessage = ({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
  const { getFieldState } = useFormContext()
  const fieldName = React.useContext(FormFieldContext)
  const message = fieldName ? getFieldState(fieldName).error?.message : undefined
  const body = message || children
  if (!body) return null
  return <p className={cn("text-xs text-destructive", className)} {...props}>{body}</p>
}

const FormFieldContext = React.createContext<string | undefined>(undefined)

function ConnectedFormField<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>({ name, ...props }: ControllerProps<TFieldValues, TName>) {
  return <FormFieldContext.Provider value={name}><Controller name={name} {...props} /></FormFieldContext.Provider>
}

export { Form, ConnectedFormField as FormField, FormItem, FormLabel, FormControl, FormMessage }
