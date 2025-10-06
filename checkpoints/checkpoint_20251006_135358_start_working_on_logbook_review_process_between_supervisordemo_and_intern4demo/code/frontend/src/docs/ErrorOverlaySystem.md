# Comprehensive Error Overlay System

## Overview

The PsychPATH application now features a comprehensive error overlay system that provides user-friendly error messages with specific explanations and actionable guidance. This system replaces generic error messages with contextual, helpful information that guides users to resolve issues.

## Features

### 1. **User-Friendly Error Overlays**
- **Clear Error Summary**: Specific, non-technical error descriptions
- **Detailed Explanation**: Why the error occurred and its context
- **Actionable Guidance**: Step-by-step instructions to resolve the issue
- **Two Action Buttons**:
  - **"I Understand"**: Returns user to the originating page to fix the issue
  - **"I Need More Help"**: Opens the help page in a new tab with the specific error highlighted

### 2. **Comprehensive Error Database**
The system includes predefined error messages for all common scenarios:

#### **Date Validation Errors**
- `ERR-001`: Date Validation Error (Internship Start Date before Provisional Registration Date)
- `ERR-002`: Date Locked Error (Critical dates cannot be changed once saved)

#### **Mobile Number Errors**
- `ERR-003`: Mobile Number Format Error (Invalid Australian mobile number format)

#### **Registration Errors**
- `ERR-004`: Email Address Already Registered
- `ERR-005`: AHPRA Registration Number Already Exists
- `ERR-006`: Invalid Verification Code
- `ERR-007`: User Profile Not Found
- `ERR-010`: Invalid Email Format

#### **Supervision Errors**
- `ENDORSEMENT-001`: Endorsement Required for Supervision
- `SUPERVISOR-PROFILE-001`: Supervisor Profile Incomplete
- `SUPERVISOR-PROFILE-002`: Board Approval Required
- `SUPERVISOR-PROFILE-003`: Supervisor Registration Date Required
- `SUPERVISOR-PROFILE-004`: Supervision Scope Required

#### **File Upload Errors**
- `FILE_TOO_LARGE`: File Too Large (exceeds 2MB limit)

#### **Network and Server Errors**
- `NETWORK_ERROR`: Network Connection Error
- `SESSION_EXPIRED`: Session Expired
- `SERVER_ERROR`: Server Error

#### **Form Validation Errors**
- `REQUIRED_FIELD`: Required Field Missing
- `INVALID_FORMAT`: Invalid Format

### 3. **Enhanced Help Page**
- **Auto-Highlighting**: Specific errors are automatically highlighted when navigated from overlay
- **Smooth Scrolling**: Automatically scrolls to the relevant error without user intervention
- **Visual Indicators**: Highlighted errors show with yellow background and "Your Error" badge
- **Comprehensive Search**: Users can search through all error types

## Implementation Guide

### 1. **Using the Error Handler Hook**

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler'

const MyComponent = () => {
  const { showError, showErrorOverlay, currentError, dismissError } = useErrorHandler()

  const handleSomeAction = async () => {
    try {
      // Your action logic here
      await someApiCall()
    } catch (error) {
      // The system will automatically determine the appropriate error message
      await showError(error as Error, {
        title: 'Action Failed',
        errorId: 'SPECIFIC_ERROR_ID' // Optional: specify exact error ID
      })
    }
  }

  return (
    <>
      {/* Your component content */}
      
      {/* Error Overlay - rendered when needed */}
      {showErrorOverlay && currentError && (
        <ErrorOverlay
          isOpen={showErrorOverlay}
          error={currentError}
          onClose={dismissError}
        />
      )}
    </>
  )
}
```

### 2. **Automatic Error Detection**

The system automatically detects error types based on error message content:

```typescript
// These patterns are automatically detected:
if (error.message.includes('internship start date') && error.message.includes('provisional registration date')) {
  // Uses ERR-001: Date Validation Error
}

if (error.message.includes('mobile number') || error.message.includes('mobile')) {
  // Uses ERR-003: Mobile Number Format Error
}

if (error.message.includes('endorsement') && error.message.includes('supervision')) {
  // Uses ENDORSEMENT-001: Endorsement Required for Supervision
}

// And many more...
```

### 3. **Custom Error Handling**

For specific scenarios, you can provide custom error information:

```typescript
await showError(error as Error, {
  title: 'Custom Error Title',
  summary: 'Custom error summary',
  explanation: 'Custom explanation of what went wrong',
  userAction: 'Custom steps to resolve the issue',
  errorId: 'CUSTOM_ERROR_ID'
})
```

### 4. **Help Page Integration**

When users click "I Need More Help", the system automatically:

1. **Opens the help page in a new tab**
2. **Passes error details as URL parameters**:
   - `errorId`: The specific error identifier
   - `summary`: Error summary for matching
   - `explanation`: Detailed explanation
   - `userAction`: Steps to resolve

3. **Highlights the specific error** with visual indicators
4. **Scrolls to the error** automatically
5. **Pre-fills support form** with error details

## Error Overlay Structure

Each error overlay contains three main sections:

### 1. **Issue Section** (Red)
- **Icon**: ❗
- **Content**: Clear, specific description of what went wrong
- **Example**: "Date Validation Error: Internship Start Date cannot be before Provisional Registration Date"

### 2. **What This Means Section** (Blue)
- **Icon**: 💡
- **Content**: Detailed explanation of why the error occurred
- **Example**: "Your Internship Start Date cannot be before your Provisional Registration Date. This is required to ensure your internship program follows the correct sequence according to AHPRA guidelines."

### 3. **What You Can Do Section** (Green)
- **Icon**: ✅
- **Content**: Step-by-step actionable guidance
- **Example**: "Set your Internship Start Date to the same day or after your Provisional Registration Date as shown in the error message."

## Benefits

### **For Users**
- **Clear Understanding**: Non-technical language explains what went wrong
- **Guided Resolution**: Step-by-step instructions to fix issues
- **Contextual Help**: Direct access to relevant help documentation
- **Consistent Experience**: Uniform error handling across the application

### **For Developers**
- **Centralized Management**: All error messages managed in one location
- **Automatic Detection**: Smart pattern matching reduces manual configuration
- **Extensible**: Easy to add new error types and messages
- **Maintainable**: Changes to error messages propagate throughout the application

### **For Support**
- **Reduced Support Tickets**: Users can self-resolve common issues
- **Better Context**: Error IDs and detailed information for troubleshooting
- **Consistent Documentation**: All error scenarios documented in help system

## Migration Guide

### **Replacing Old Error Handling**

**Before:**
```typescript
// Old way - generic error messages
if (error) {
  toast.error('Something went wrong. Please try again.')
  // or
  alert('Error: ' + error.message)
}
```

**After:**
```typescript
// New way - comprehensive error overlays
if (error) {
  await showError(error as Error, {
    title: 'Action Failed',
    errorId: 'SPECIFIC_ERROR_ID' // Optional
  })
}
```

### **Adding New Error Types**

1. **Add to Error Database** in `useErrorHandler.ts`:
```typescript
const errorDatabase: Record<string, { summary: string; explanation: string; userAction: string }> = {
  // ... existing errors
  'NEW_ERROR_ID': {
    summary: 'New Error Summary',
    explanation: 'Detailed explanation of what went wrong and why.',
    userAction: 'Step-by-step instructions to resolve the issue.'
  }
}
```

2. **Add Detection Pattern**:
```typescript
const getErrorInfo = (error: Error, errorId?: string) => {
  // ... existing patterns
  if (message.includes('new error pattern')) {
    return errorDatabase['NEW_ERROR_ID']
  }
  // ...
}
```

3. **Add to Help Page** in `ErrorHelp.tsx`:
```typescript
const errorDatabase: ErrorEntry[] = [
  // ... existing entries
  {
    id: 'NEW_ERROR_ID',
    summary: 'New Error Summary',
    explanation: 'Detailed explanation...',
    stepsToResolve: [
      'Step 1: ...',
      'Step 2: ...',
      'Step 3: ...'
    ],
    category: 'Validation',
    frequency: 1
  }
]
```

## Best Practices

### **1. Error Message Guidelines**
- **Use clear, non-technical language**
- **Be specific about what went wrong**
- **Explain why the error occurred**
- **Provide actionable steps to resolve**
- **Include relevant context (dates, field names, etc.)**

### **2. Error ID Naming**
- **Use descriptive prefixes**: `ERR-`, `SUPERVISOR-PROFILE-`, `ENDORSEMENT-`
- **Use sequential numbering**: `ERR-001`, `ERR-002`, etc.
- **Be consistent with naming conventions**

### **3. Component Integration**
- **Always import and use the error handler hook**
- **Render the ErrorOverlay component when needed**
- **Provide specific error IDs when possible**
- **Handle both validation and system errors**

### **4. Testing**
- **Test error scenarios in development**
- **Verify help page navigation works correctly**
- **Ensure error highlighting functions properly**
- **Test with various error types and messages**

This comprehensive error overlay system significantly improves the user experience by providing clear, actionable guidance for resolving issues, while maintaining consistency across the entire application.
