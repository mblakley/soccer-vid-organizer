'use client'
import { useEffect, useState, useMemo } from 'react'
import { withAdminAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { toast } from 'react-toastify'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { Switch } from '@headlessui/react'
import { Search, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface User {
  id: string
  email: string
  is_admin: boolean
  created_at?: string
  user_metadata?: {
    full_name?: string
  }
}

function RoleApprovalPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const { isDarkMode } = useTheme()

  const columnHelper = createColumnHelper<User>()

  const columns = useMemo(() => [
    columnHelper.accessor(row => row.user_metadata?.full_name || 'N/A', {
      id: 'name',
      header: 'Name',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('id', {
      header: 'User ID',
      cell: info => (
        <div className="font-mono text-xs">
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('created_at', {
      header: 'Created At',
      cell: info => info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : 'N/A',
    }),
    columnHelper.accessor('is_admin', {
      header: 'Admin Status',
      cell: info => (
        <div className="flex items-center justify-center">
          <Switch
            checked={info.getValue()}
            onChange={() => updateAdminStatus(info.row.original.id, !info.getValue())}
            className={`${
              info.getValue() ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                info.getValue() ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
        </div>
      ),
    }),
  ], [])

  const table = useReactTable({
    data: users,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  useEffect(() => {
    const fetchUsers = async () => {
      setError(null)
      setLoading(true)
      try {
        const response = await fetch('/api/admin/users-with-roles')
        if (response.ok) {
          const usersData = await response.json()
          setUsers(usersData)
        } else {
          console.error('Error fetching users:', response.statusText)
          setError('Failed to fetch user roles. Please try again.')
        }
      } catch (error: any) {
        console.error('Error fetching users:', error)
        setError(error.message || 'An error occurred while fetching user roles.')
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const updateAdminStatus = async (id: string, isAdmin: boolean) => {
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('No active session')
        return
      }

      const response = await fetch(`/api/admin/update-user-role`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id, isAdmin })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.message || 'Failed to update admin status.')
        return
      }

      // Update the local state immediately for better UX
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === id ? { ...user, is_admin: isAdmin } : user
        )
      )

      toast.success('Admin status updated successfully.')
    } catch (error: any) {
      console.error('Error updating admin status:', error)
      setError(error.message || 'An unexpected error occurred while updating admin status.')
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8">
      {error && (
        <div className={`mb-4 p-4 text-sm rounded ${isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            placeholder="Search users..."
          />
        </div>
      </div>

      <div className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`overflow-x-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          {...{
                            className: header.column.getCanSort()
                              ? 'cursor-pointer select-none flex items-center gap-2'
                              : '',
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: <ChevronUp size={16} />,
                            desc: <ChevronDown size={16} />,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-900'
                      } ${cell.column.id === 'is_admin' ? 'text-center' : ''}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`px-4 py-3 flex items-center justify-between border-t ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isDarkMode
                  ? 'text-gray-300 disabled:text-gray-500'
                  : 'text-gray-700 disabled:text-gray-400'
              }`}
            >
              First
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isDarkMode
                  ? 'text-gray-300 disabled:text-gray-500'
                  : 'text-gray-700 disabled:text-gray-400'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isDarkMode
                  ? 'text-gray-300 disabled:text-gray-500'
                  : 'text-gray-700 disabled:text-gray-400'
              }`}
            >
              Next
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isDarkMode
                  ? 'text-gray-300 disabled:text-gray-500'
                  : 'text-gray-700 disabled:text-gray-400'
              }`}
            >
              Last
            </button>
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default withAdminAuth(
  RoleApprovalPage,
  'Role Management'
)
