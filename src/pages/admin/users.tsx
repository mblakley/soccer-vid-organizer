'use client'
import { useEffect, useState } from 'react'
import { withAdminAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { toast } from 'react-toastify'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table'
import { Switch } from '@headlessui/react'
import type { UserWithRole, UpdateUserRoleRequest, UsersWithRolesApiResponse, UpdateUserRoleApiResponse } from '@/lib/types/auth'
import { apiClient } from '@/lib/api/client'
import type { DisableUserRequest, DisableUserResponse, DisableUserApiResponse, RemoveUserRequest, RemoveUserResponse, RemoveUserApiResponse, ErrorResponse } from '@/lib/types/admin'

const columnHelper = createColumnHelper<UserWithRole>()

function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response.error === 'string';
}

function UsersPage() {
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const { isDarkMode } = useTheme()

  const columns = [
    columnHelper.accessor('user_metadata.full_name', {
      header: 'Name',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('user_metadata.disabled', {
      header: 'Status',
      cell: info => info.getValue() ? 'Disabled' : 'Active',
    }),
    columnHelper.accessor('is_admin', {
      header: 'Admin',
      cell: props => (
        <div className="flex items-center justify-center">
          <Switch
            checked={props.getValue()}
            onChange={() => updateAdminStatus(props.row.original.id, !props.getValue())}
            className={`${
              props.getValue() ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                props.getValue() ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
        </div>
      ),
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      cell: info => new Date(info.getValue()).toLocaleDateString(),
    }),
    columnHelper.accessor('last_sign_in_at', {
      header: 'Last Sign In',
      cell: info => {
        const value = info.getValue()
        return value ? new Date(value).toLocaleDateString() : 'Never'
      },
    }),
    columnHelper.accessor('id', {
      header: 'User ID',
      cell: info => (
        <div className="text-sm text-gray-500" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: props => (
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded ${
              props.row.original.user_metadata?.disabled
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-yellow-600 hover:bg-yellow-700'
            } text-white`}
            onClick={() => toggleUserStatus(props.row.original.id, !props.row.original.user_metadata?.disabled)}
          >
            {props.row.original.user_metadata?.disabled ? 'Enable User' : 'Disable User'}
          </button>
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            onClick={() => removeUser(props.row.original.id)}
          >
            Remove User
          </button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  useEffect(() => {
    const fetchUsers = async () => {
      setError(null)
      setLoading(true);
      try {
        const response = await apiClient.get<UsersWithRolesApiResponse>('/api/admin/users-with-roles')
        if (isErrorResponse(response)) {
          console.error('Error fetching users:', response.error)
          setError(response.error || 'Failed to fetch user list.');
          setUsers([]);
        } else if (response && response.users) {
          setUsers(response.users)
        } else {
          setError('Invalid response when fetching users.');
          setUsers([]);
        }
      } catch (error: any) {
        console.error('Error fetching users:', error)
        setError(error.message || 'An error occurred while fetching users.')
        setUsers([]);
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const updateAdminStatus = async (userId: string, isAdmin: boolean) => {
    try {
      const requestBody: UpdateUserRoleRequest = { id: userId, isAdmin };
      const response = await apiClient.post<UpdateUserRoleApiResponse>('/api/admin/update-user-role', requestBody);

      if (isErrorResponse(response) || (response && !response.success)) {
        const errorMsg = isErrorResponse(response) ? response.error : (response?.error || 'Failed to update admin status');
        throw new Error(errorMsg);
      }

      setUsers(currentUsers => 
        currentUsers.map(user => 
          user.id === userId 
            ? { ...user, is_admin: isAdmin }
            : user
      ))
      toast.success(`User ${isAdmin ? 'promoted to' : 'demoted from'} admin successfully`)
    } catch (error) {
      console.error('Error updating admin status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update admin status')
    }
  }

  const toggleUserStatus = async (id: string, disabled: boolean) => {
    setError(null)
    try {
      const requestBody: DisableUserRequest = { id, disabled };
      const response = await apiClient.post<DisableUserApiResponse>('/api/admin/disable-user', requestBody);

      if (isErrorResponse(response) || (response && !response.success)) {
        const errorMsg = isErrorResponse(response) ? response.error : (response?.error || 'Failed to update user status');
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      toast.success(`User ${disabled ? 'disabled' : 'enabled'} successfully.`)
      const fetchResponse = await apiClient.get<UsersWithRolesApiResponse>('/api/admin/users-with-roles');
      if (isErrorResponse(fetchResponse)) {
        setError(fetchResponse.error || 'User status updated, but failed to refresh user list.');
      } else if (fetchResponse && fetchResponse.users) {
        setUsers(fetchResponse.users);
      } else {
        setError('User status updated, but failed to refresh user list (invalid response).');
      }
    } catch (error) {
      console.error('Error updating user status:', error)
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  }

  const removeUser = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      return
    }
    setError(null)
    try {
      const requestBody: RemoveUserRequest = { id };
      const response = await apiClient.post<RemoveUserApiResponse>('/api/admin/remove-user', requestBody);

      if (isErrorResponse(response) || (response && !response.success)) {
        const errorMsg = isErrorResponse(response) ? response.error : (response?.error || 'Failed to remove user.');
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      toast.success('User removed successfully.')
      const fetchResponse = await apiClient.get<UsersWithRolesApiResponse>('/api/admin/users-with-roles');
      if (isErrorResponse(fetchResponse)) {
        setError(fetchResponse.error || 'User removed, but failed to refresh user list.');
      } else if (fetchResponse && fetchResponse.users) {
        setUsers(fetchResponse.users);
      } else {
        setError('User removed, but failed to refresh user list (invalid response).');
      }
    } catch (error) {
      console.error('Error removing user:', error)
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link 
          href="/admin" 
          className={`inline-flex items-center px-4 py-2 rounded-md ${
            isDarkMode 
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className={`mb-4 p-4 text-sm rounded ${isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
          <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
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
                            ? 'cursor-pointer select-none'
                            : '',
                          onClick: header.column.getToggleSortingHandler(),
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'}`}>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1 rounded ${
              isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {'<<'}
          </button>
          <button
            className={`px-3 py-1 rounded ${
              isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {'<'}
          </button>
          <button
            className={`px-3 py-1 rounded ${
              isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {'>'}
          </button>
          <button
            className={`px-3 py-1 rounded ${
              isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            {'>>'}
          </button>
        </div>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount()}
        </span>
      </div>
    </div>
  )
}

export default withAdminAuth(
  UsersPage,
  'User Management'
) 