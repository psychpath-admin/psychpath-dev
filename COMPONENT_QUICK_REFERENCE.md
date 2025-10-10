# Component Quick Reference Guide

Quick reference for using the new reusable components in PsychPATH.

---

## 📝 Forms

### FormField
```tsx
import { FormField } from '@/components/forms'

// Text input
<FormField
  label="Email"
  name="email"
  type="email"
  value={email}
  onChange={(value) => setEmail(String(value))}
  error={errors.email}
  placeholder="you@example.com"
  required
  helperText="We'll never share your email"
/>

// Textarea
<FormField
  label="Notes"
  type="textarea"
  value={notes}
  onChange={(value) => setNotes(String(value))}
  rows={4}
/>

// Select dropdown
<FormField
  label="Role"
  type="select"
  value={role}
  onChange={setRole}
  options={[
    { value: 'INTERN', label: 'Intern' },
    { value: 'SUPERVISOR', label: 'Supervisor' }
  ]}
/>
```

### Form (Wrapper)
```tsx
import { Form } from '@/components/forms'

<Form
  initialValues={{ email: '', password: '' }}
  onSubmit={async (data) => {
    await loginUser(data)
  }}
  validate={(data) => {
    const errors = {}
    if (!data.email) errors.email = 'Email required'
    if (data.password.length < 8) errors.password = 'Password too short'
    return errors
  }}
  submitLabel="Login"
  cancelLabel="Cancel"
  onCancel={() => navigate('/back')}
>
  {({ values, errors, handleChange, isSubmitting }) => (
    <>
      <FormField
        label="Email"
        name="email"
        value={values.email}
        onChange={(v) => handleChange('email', v)}
        error={errors.email}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        value={values.password}
        onChange={(v) => handleChange('password', v)}
        error={errors.password}
      />
    </>
  )}
</Form>
```

---

## 🪟 Modals

### BaseModal
```tsx
import { BaseModal } from '@/components/modals'
import { Settings } from 'lucide-react'

<BaseModal
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  title="Settings"
  description="Update your preferences"
  icon={<Settings className="h-5 w-5" />}
  size="lg"  // sm | md | lg | xl | 2xl
  showFooter
  submitLabel="Save"
  cancelLabel="Cancel"
  onSubmit={handleSave}
  onCancel={() => setIsOpen(false)}
  isSubmitting={saving}
  error={errorMessage}
>
  {/* Your modal content */}
  <FormField label="Name" value={name} onChange={setName} />
</BaseModal>
```

### ConfirmModal
```tsx
import { ConfirmModal } from '@/components/modals'

<ConfirmModal
  isOpen={showConfirm}
  onOpenChange={setShowConfirm}
  title="Delete Entry?"
  description="This action cannot be undone"
  message="Are you sure you want to delete this logbook entry?"
  variant="danger"  // info | success | warning | danger
  confirmLabel="Delete"
  cancelLabel="Keep"
  onConfirm={handleDelete}
  isLoading={deleting}
/>
```

---

## 📊 Tables

### DataTable
```tsx
import { DataTable, Column } from '@/components/tables'
import { StatusBadge } from '@/components/status'

const columns: Column<Entry>[] = [
  {
    key: 'name',
    title: 'Name',
    sortable: true,
    filterable: true,
    width: '200px'
  },
  {
    key: 'status',
    title: 'Status',
    sortable: true,
    align: 'center',
    render: (status) => <StatusBadge status={status} />
  },
  {
    key: 'date',
    title: 'Date',
    sortable: true,
    render: (date) => formatDate(date)
  },
  {
    key: 'hours',
    title: 'Hours',
    align: 'right',
    render: (hours) => `${hours.toFixed(1)}h`
  }
]

<DataTable
  data={entries}
  columns={columns}
  keyField="id"
  sortable
  filterable
  paginate
  pageSize={20}
  onRowClick={(entry) => navigate(`/entry/${entry.id}`)}
  loading={isLoading}
  emptyMessage="No entries found"
  rowClassName={(row) => row.isHighlighted ? 'bg-yellow-50' : ''}
/>
```

---

## 🏷️ Status

### StatusBadge
```tsx
import { StatusBadge } from '@/components/status'

// Basic usage
<StatusBadge status="approved" />
<StatusBadge status="pending" />
<StatusBadge status="rejected" />

// Custom label
<StatusBadge status="approved" label="Verified" />

// Without icon
<StatusBadge status="submitted" showIcon={false} />

// Different sizes
<StatusBadge status="success" size="sm" />
<StatusBadge status="success" size="md" />
<StatusBadge status="success" size="lg" />

// Available statuses:
// success, approved, invited, accepted
// error, rejected, failed, declined
// pending, submitted, draft, warning, loading
```

### StatusIcon
```tsx
import { StatusIcon } from '@/components/status'

<StatusIcon status="success" size="md" />
<StatusIcon status="error" size="lg" />
<StatusIcon status="loading" />
```

---

## 🔧 Utilities

### LoadingSpinner
```tsx
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Simple spinner
<LoadingSpinner />

// With text
<LoadingSpinner text="Loading entries..." size="lg" />

// Full page overlay
<LoadingSpinner fullPage text="Processing..." />

// Sizes: sm | md | lg | xl
<LoadingSpinner size="xl" />
```

### EmptyState
```tsx
import { EmptyState } from '@/components/ui/EmptyState'

<EmptyState
  variant="inbox"  // default | search | error | inbox
  title="No logbooks yet"
  description="Create your first logbook to start tracking hours"
  action={{
    label: 'Create Logbook',
    onClick: () => setShowModal(true)
  }}
/>

// Custom icon
<EmptyState
  icon={<FileX className="h-12 w-12 text-gray-400" />}
  title="No results"
  description="Try adjusting your filters"
/>
```

### PageHeader
```tsx
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

<PageHeader
  title="Logbooks"
  description="View and manage your logbook entries"
  badge="12 pending"
  breadcrumbs={[
    { label: 'Home', href: '/' },
    { label: 'Logbooks' }
  ]}
  actions={
    <>
      <Button variant="outline">Export</Button>
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        New Entry
      </Button>
    </>
  }
/>
```

### ActionCard
```tsx
import { ActionCard } from '@/components/ui/ActionCard'
import { StatusBadge } from '@/components/status'
import { FileText } from 'lucide-react'

<ActionCard
  title="Week 1 Logbook"
  description="Jan 1 - Jan 7, 2025"
  icon={<FileText className="h-6 w-6 text-blue-600" />}
  badge={<StatusBadge status="submitted" />}
  onClick={() => navigate('/logbook/1')}
  actions={
    <>
      <Button variant="ghost" size="sm">Edit</Button>
      <Button variant="ghost" size="sm">Delete</Button>
    </>
  }
  footer={
    <div className="text-sm text-gray-600">
      Total: 40 hours
    </div>
  }
>
  <p>Direct Client Contact: 20h</p>
  <p>Professional Development: 10h</p>
  <p>Supervision: 10h</p>
</ActionCard>
```

### AlertBanner
```tsx
import { AlertBanner } from '@/components/ui/AlertBanner'

<AlertBanner
  variant="error"  // info | success | warning | error
  title="Submission Failed"
  message="There was an error submitting your logbook"
  dismissible
  onDismiss={() => setError(null)}
  action={{
    label: 'Try Again',
    onClick: handleRetry
  }}
/>

// Simple info banner
<AlertBanner
  variant="info"
  message="Your changes have been saved automatically"
/>
```

---

## 🎨 Styling Tips

All components use Tailwind CSS and support the `className` prop for custom styling:

```tsx
<FormField 
  className="mb-4" 
  // ... 
/>

<StatusBadge 
  className="ml-2" 
  // ... 
/>

<DataTable 
  className="mt-6" 
  // ... 
/>
```

---

## 🔗 Import Paths

```tsx
// Forms
import { Form, FormField } from '@/components/forms'

// Modals
import { BaseModal, ConfirmModal } from '@/components/modals'

// Tables
import { DataTable, Column } from '@/components/tables'

// Status
import { StatusBadge, StatusIcon } from '@/components/status'

// Utilities
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ActionCard } from '@/components/ui/ActionCard'
import { AlertBanner } from '@/components/ui/AlertBanner'
```

---

## 💡 Best Practices

1. **Always use FormField** instead of raw Input/Textarea components
2. **Use StatusBadge** for all status displays to maintain consistency
3. **Wrap modals with BaseModal** instead of Dialog directly
4. **Use DataTable** for any list/table view with 5+ items
5. **Show LoadingSpinner** during async operations
6. **Use EmptyState** instead of plain "No data" text
7. **Add PageHeader** to all main pages for consistency

---

## 🐛 Common Issues

### FormField onChange type error
```tsx
// ❌ Wrong
<FormField onChange={setValue} />

// ✅ Correct
<FormField onChange={(value) => setValue(String(value))} />
```

### Modal not closing
```tsx
// ❌ Wrong
<BaseModal isOpen={isOpen} />

// ✅ Correct
<BaseModal isOpen={isOpen} onOpenChange={setIsOpen} />
```

### DataTable not showing data
```tsx
// ❌ Wrong - missing keyField
<DataTable data={items} columns={columns} />

// ✅ Correct
<DataTable data={items} columns={columns} keyField="id" />
```

---

## 📞 Need Help?

- See full examples in `/MODULARITY_IMPLEMENTATION_SUMMARY.md`
- Check existing usage in `UnlockRequestModal.tsx`
- Review component source code for all props and options

