"use client"

import { useState } from "react"
import { createContext, useContext } from "react"

const ToastContext = createContext({})

export const useToast = () => {
  const context = useContext(ToastContext)

  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }

  return {
    ...context,
    toast: (props) => {
      context.toast({ ...props, id: Math.random().toString() })
    },
    dismiss: (toastId) => {
      context.dismiss(toastId)
    },
    toasts: context.toasts || []
  }
}

// Exportar toast diretamente para compatibilidade com importações existentes
export const toast = (props) => {
  const { toast: toastFn } = useToast()
  toastFn(props)
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const toast = (props) => {
    setToasts((prevToasts) => [...prevToasts, props])
  }

  const dismiss = (toastId) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== toastId))
  }

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
    </ToastContext.Provider>
  )
}
