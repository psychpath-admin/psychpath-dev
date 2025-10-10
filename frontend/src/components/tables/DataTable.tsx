import React, { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  title: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: T, index: number) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
  className?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField?: string
  onRowClick?: (row: T, index: number) => void
  sortable?: boolean
  filterable?: boolean
  paginate?: boolean
  pageSize?: number
  emptyMessage?: string
  loading?: boolean
  className?: string
  rowClassName?: (row: T, index: number) => string
}

type SortDirection = 'asc' | 'desc' | null

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField = 'id',
  onRowClick,
  sortable = false,
  filterable = false,
  paginate = false,
  pageSize = 10,
  emptyMessage = 'No data available',
  loading = false,
  className = '',
  rowClassName
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [filterText, setFilterText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Filtering
  const filteredData = useMemo(() => {
    if (!filterable || !filterText) return data

    return data.filter(row => {
      return columns.some(col => {
        if (!col.filterable) return false
        const value = row[col.key]
        return String(value).toLowerCase().includes(filterText.toLowerCase())
      })
    })
  }, [data, filterText, filterable, columns])

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortKey]
      const bValue = b[sortKey]

      if (aValue === bValue) return 0

      const comparison = aValue < bValue ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortKey, sortDirection])

  // Pagination
  const paginatedData = useMemo(() => {
    if (!paginate) return sortedData

    const startIndex = (currentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [sortedData, paginate, currentPage, pageSize])

  const totalPages = Math.ceil(sortedData.length / pageSize)

  const handleSort = (key: string) => {
    if (!sortable) return

    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortKey(null)
        setSortDirection(null)
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4 text-blue-600" />
    }
    return <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />
  }

  const getCellValue = (row: T, column: Column<T>, index: number) => {
    const value = row[column.key]
    
    if (column.render) {
      return column.render(value, row, index)
    }
    
    return value
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {filterable && (
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search..."
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value)
              setCurrentPage(1)
            }}
            className="max-w-sm"
          />
          {filterText && (
            <Badge variant="secondary">
              {sortedData.length} {sortedData.length === 1 ? 'result' : 'results'}
            </Badge>
          )}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  style={{ width: column.width }}
                  className={cn(
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && sortable && 'cursor-pointer select-none',
                    column.className
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.title}
                    {column.sortable && sortable && getSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow
                  key={row[keyField] || index}
                  onClick={() => onRowClick?.(row, index)}
                  className={cn(
                    onRowClick && 'cursor-pointer hover:bg-gray-50',
                    rowClassName?.(row, index)
                  )}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        column.className
                      )}
                    >
                      {getCellValue(row, column, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {paginate && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

