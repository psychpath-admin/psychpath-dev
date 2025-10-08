# PsychPATH Development Guidelines

## 🚨 **CRITICAL: Error Handling**

**ALWAYS use the PsychPATH Universal Error Handling Module** for any new functionality.

### **Required Import:**
```typescript
import { useErrorHandler, ErrorOverlay } from '@/lib/errors'
```

### **Usage Patterns:**

#### **1. Basic Error Handling:**
```typescript
function MyComponent() {
  const { errorOverlay, showError } = useErrorHandler()

  const handleAction = async () => {
    try {
      await riskyOperation()
    } catch (error) {
      await showError(error, {
        title: 'Operation Failed',
        category: 'Validation'
      })
    }
  }

  return (
    <div>
      <button onClick={handleAction}>Do Something</button>
      <ErrorOverlay {...errorOverlay} />
    </div>
  )
}
```

#### **2. API Error Handling:**
```typescript
const { handleApiError } = useErrorHandler()

try {
  await apiCall()
} catch (error) {
  await handleApiError(error, {
    title: 'Failed to Load Data',
    customExplanation: 'Unable to retrieve data from server.'
  })
}
```

#### **3. Custom Error Details:**
```typescript
const { showCustomError } = useErrorHandler()

await showCustomError({
  errorId: 'CUSTOM_ERROR',
  title: 'Validation Failed',
  summary: 'Invalid input provided',
  explanation: 'The data you entered does not meet requirements.',
  userAction: 'Please check your input and try again.',
  category: 'Validation'
})
```

### **❌ NEVER USE:**
- `alert()` for errors
- Custom error dialogs
- Basic try-catch without error handling
- Inconsistent error messages

### **✅ ALWAYS USE:**
- `useErrorHandler` hook
- `ErrorOverlay` component
- Automatic error logging
- Consistent 3-part error structure

## **Module Location:**
`frontend/src/lib/errors/`

## **Documentation:**
See `frontend/src/lib/errors/README.md` for complete usage examples.

---

**Remember: This module provides automatic error logging, consistent UX, and professional error handling. Use it for ALL error scenarios.**
