/**
 * Utility functions for capturing contextual information when creating support tickets
 */

export interface ContextData {
  pageUrl: string
  pagePath: string
  timestamp: string
  userAgent: string
  viewport: {
    width: number
    height: number
  }
  formData?: FormContextData
  consoleErrors?: ConsoleError[]
  localStorage?: Record<string, any>
  sessionStorage?: Record<string, any>
}

export interface FormContextData {
  forms: FormData[]
  focusedElement?: {
    tagName: string
    id?: string
    className?: string
    value?: string
  }
}

export interface FormData {
  id?: string
  className?: string
  action?: string
  method?: string
  fields: InputFieldData[]
}

export interface InputFieldData {
  type: string
  name?: string
  id?: string
  value: string
  required?: boolean
  placeholder?: string
}

export interface ConsoleError {
  message: string
  source?: string
  lineno?: number
  colno?: number
  stack?: string
  timestamp: string
}

// Store console errors for later capture
const consoleErrors: ConsoleError[] = []

// Guards to prevent duplicate prompts/captures
let permissionPromptActive = false
let contextCaptureInFlight: Promise<ContextData> | null = null

// Capture console errors
const originalError = console.error
const originalWarn = console.warn

console.error = function(...args) {
  consoleErrors.push({
    message: args.join(' '),
    stack: new Error().stack,
    timestamp: new Date().toISOString()
  })
  return originalError.apply(console, args)
}

console.warn = function(...args) {
  consoleErrors.push({
    message: `Warning: ${args.join(' ')}`,
    stack: new Error().stack,
    timestamp: new Date().toISOString()
  })
  return originalWarn.apply(console, args)
}

// Capture unhandled JavaScript errors
window.addEventListener('error', (event) => {
  consoleErrors.push({
    message: event.message,
    source: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
    timestamp: new Date().toISOString()
  })
})

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  consoleErrors.push({
    message: `Unhandled Promise Rejection: ${event.reason}`,
    stack: event.reason?.stack,
    timestamp: new Date().toISOString()
  })
})

/**
 * Capture basic page context
 */
export function capturePageContext(): Omit<ContextData, 'formData' | 'localStorage' | 'sessionStorage'> {
  return {
    pageUrl: window.location.href,
    pagePath: window.location.pathname,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    consoleErrors: [...consoleErrors] // Copy the array
  }
}

/**
 * Capture form data from the current page
 * Asks for permission first
 */
export async function captureFormContext(): Promise<FormContextData | null> {
  const forms = Array.from(document.querySelectorAll('form')).map(form => ({
    id: form.id || undefined,
    className: form.className || undefined,
    action: form.action || undefined,
    method: form.method || undefined,
    fields: Array.from(form.querySelectorAll('input, textarea, select')).map(field => {
      const element = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      return {
        type: element.type || element.tagName.toLowerCase(),
        name: element.name || undefined,
        id: element.id || undefined,
        value: element.value || '',
        required: 'required' in element ? (element as HTMLInputElement).required : false,
        placeholder: 'placeholder' in element ? (element as HTMLInputElement).placeholder : undefined
      }
    })
  }))

  const focusedElement = document.activeElement as HTMLElement
  const focusedElementData = focusedElement ? {
    tagName: focusedElement.tagName,
    id: focusedElement.id || undefined,
    className: focusedElement.className || undefined,
    value: 'value' in focusedElement ? (focusedElement as HTMLInputElement).value : undefined
  } : undefined

  return {
    forms,
    focusedElement: focusedElementData
  }
}

/**
 * Capture browser storage (with permission)
 */
export async function captureStorageContext(): Promise<{
  localStorage?: Record<string, any>
  sessionStorage?: Record<string, any>
} | null> {
  const userConsent = await askForStoragePermission()
  if (!userConsent) {
    return null
  }

  try {
    const localStorage: Record<string, any> = {}
    const sessionStorage: Record<string, any> = {}

    // Only capture non-sensitive keys (avoid tokens, passwords, etc.)
    const sensitiveKeys = ['token', 'password', 'secret', 'auth', 'session', 'jwt']
    
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && !sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        try {
          localStorage[key] = JSON.parse(window.localStorage.getItem(key) || '')
        } catch {
          localStorage[key] = window.localStorage.getItem(key)
        }
      }
    }

    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i)
      if (key && !sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        try {
          sessionStorage[key] = JSON.parse(window.sessionStorage.getItem(key) || '')
        } catch {
          sessionStorage[key] = window.sessionStorage.getItem(key)
        }
      }
    }

    return { localStorage, sessionStorage }
  } catch (error) {
    console.warn('Failed to capture storage context:', error)
    return null
  }
}

/**
 * Ask user for permission to capture form data
 */
async function askForFormDataPermission(): Promise<boolean> {
  if (permissionPromptActive) return false
  permissionPromptActive = true
  return new Promise((resolve) => {
    // Use setTimeout to ensure dialog appears after current execution stack
    setTimeout(() => {
      try {
        const result = confirm(
          'Do you want to include form data and focused element details in the support ticket? This helps us debug issues related to forms.'
        )
        resolve(result)
      } catch (error) {
        console.warn('Failed to show form data permission dialog:', error)
        resolve(false)
      } finally {
        permissionPromptActive = false
      }
    }, 100)
  })
}

/**
 * Ask user for permission to capture browser storage
 */
async function askForStoragePermission(): Promise<boolean> {
  if (permissionPromptActive) return false
  permissionPromptActive = true
  return new Promise((resolve) => {
    // Use setTimeout to ensure dialog appears after current execution stack
    // and add a delay to prevent multiple dialogs interfering
    setTimeout(() => {
      try {
        const result = confirm(
          'Would you like to include browser storage data in your support ticket? This may help us understand your session state. We will exclude sensitive data like authentication tokens.'
        )
        resolve(result)
      } catch (error) {
        console.warn('Failed to show storage permission dialog:', error)
        resolve(false)
      } finally {
        permissionPromptActive = false
      }
    }, 200) // Slightly longer delay to ensure previous dialog is cleared
  })
}

/**
 * Capture full context for support ticket
 */
export async function captureFullContext(): Promise<ContextData> {
  if (contextCaptureInFlight) return contextCaptureInFlight
  contextCaptureInFlight = (async () => {
    const baseContext = capturePageContext()
    const formContext = await captureFormContext()
    
    // To avoid multiple prompts, skip storage capture by default.
    // Advanced capture of browser storage can be triggered explicitly elsewhere.

    return {
      ...baseContext,
      formData: formContext || undefined
    }
  })()
  try {
    return await contextCaptureInFlight
  } finally {
    contextCaptureInFlight = null
  }
}

/**
 * Format context data for inclusion in ticket description
 */
export function formatContextForDescription(context: ContextData): string {
  let description = `**Technical Context:**
- Page: ${context.pagePath}
- URL: ${context.pageUrl}
- Time: ${new Date(context.timestamp).toLocaleString()}
- Viewport: ${context.viewport.width}x${context.viewport.height}

`

  if (context.consoleErrors && context.consoleErrors.length > 0) {
    description += `**Console Errors (${context.consoleErrors.length}):**
`
    context.consoleErrors.slice(-5).forEach((error, index) => {
      description += `${index + 1}. ${error.message}`
      if (error.source && error.lineno) {
        description += ` at ${error.source}:${error.lineno}:${error.colno}`
      }
      description += `\n`
    })
    description += `\n`
  }

  if (context.formData && context.formData.forms.length > 0) {
    description += `**Forms Detected (${context.formData.forms.length}):**
`
    context.formData.forms.forEach((form, formIndex) => {
      if (form.fields.length > 0) {
        description += `Form ${formIndex + 1}${form.id ? ` (ID: ${form.id})` : ''}:\n`
        form.fields.forEach(field => {
          if (field.value && !isSensitiveField(field)) {
            description += `- ${field.name || field.id || 'Unnamed field'}: ${field.value.substring(0, 100)}${field.value.length > 100 ? '...' : ''}\n`
          }
        })
        description += `\n`
      }
    })
  }

  if (context.formData?.focusedElement) {
    description += `**Focused Element:**
Tag: ${context.formData.focusedElement.tagName}${context.formData.focusedElement.id ? `, ID: ${context.formData.focusedElement.id}` : ''}
`
  }

  return description
}

/**
 * Capture form data from a specific modal form element
 */
export async function captureModalFormData(formElement?: HTMLFormElement): Promise<FormContextData | null> {
  const targetForm = formElement || document.querySelector('form')
  if (!targetForm) {
    return null
  }

  const forms = [{
    id: targetForm.id || undefined,
    className: targetForm.className || undefined,
    action: targetForm.action || undefined,
    method: targetForm.method || undefined,
    fields: Array.from(targetForm.querySelectorAll('input, textarea, select')).map(field => {
      const element = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      return {
        type: element.type || element.tagName.toLowerCase(),
        name: element.name || undefined,
        id: element.id || undefined,
        value: element.value || '',
        required: 'required' in element ? (element as HTMLInputElement).required : false,
        placeholder: 'placeholder' in element ? (element as HTMLInputElement).placeholder : undefined
      }
    })
  }]

  const focusedElement = document.activeElement as HTMLElement
  const focusedElementData = focusedElement ? {
    tagName: focusedElement.tagName,
    id: focusedElement.id || undefined,
    className: focusedElement.className || undefined,
    value: (focusedElement as HTMLInputElement).value || undefined
  } : undefined

  return { forms, focusedElement: focusedElementData }
}

/**
 * Check if a form field contains sensitive data
 */
function isSensitiveField(field: InputFieldData): boolean {
  const sensitiveTypes = ['password', 'hidden']
  const sensitiveNames = ['password', 'secret', 'token', 'auth', 'key']
  
  if (sensitiveTypes.includes(field.type)) return true
  if (field.name && sensitiveNames.some(s => field.name!.toLowerCase().includes(s))) return true
  if (field.id && sensitiveNames.some(s => field.id!.toLowerCase().includes(s))) return true
  
  return false
}
