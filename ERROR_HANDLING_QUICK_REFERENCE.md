# 🚨 Error Handling Quick Reference

## **Import Statement:**
```typescript
import { useErrorHandler, ErrorOverlay } from '@/lib/errors'
```

## **Basic Setup:**
```typescript
function MyComponent() {
  const { errorOverlay, showError, handleApiError } = useErrorHandler()
  
  return (
    <div>
      {/* Your component content */}
      <ErrorOverlay {...errorOverlay} />
    </div>
  )
}
```

## **Common Patterns:**

### **General Errors:**
```typescript
await showError(error, {
  title: 'Operation Failed',
  category: 'Validation'
})
```

### **API Errors:**
```typescript
await handleApiError(error, {
  title: 'Failed to Load Data'
})
```

### **Custom Errors:**
```typescript
await showCustomError({
  title: 'Validation Failed',
  summary: 'Invalid input',
  explanation: 'The data is not valid',
  userAction: 'Please check and try again',
  category: 'Validation'
})
```

## **Error Categories:**
- `Validation` - Input validation errors
- `Network` - API/network errors  
- `Server` - Server-side errors
- `Client` - Client-side errors
- `General` - General errors
- `System` - System-level errors

---

**📁 Module Location:** `frontend/src/lib/errors/`  
**📚 Full Docs:** `frontend/src/lib/errors/README.md`
