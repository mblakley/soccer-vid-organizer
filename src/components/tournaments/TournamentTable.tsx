'use client'
import { useState } from 'react'
import { Pencil, Trash2, Gamepad2 } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table'

import { Tournament } from '@/lib/types/tournaments'

interface TournamentTableProps {
  tournaments: Tournament[]
  isDarkMode: boolean
  onEdit: (tournament: Tournament) => void
  onDelete: (id: string) => void
  onSelectForGames: (tournament: Tournament) => void
  selectedTournament: Tournament | null
}

const columnHelper = createColumnHelper<Tournament>()

export default function TournamentTable({
  tournaments,
  isDarkMode,
  onEdit,
  onDelete,
  onSelectForGames,
  selectedTournament,
}: TournamentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('location', {
      header: 'Location',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('format', {
      header: 'Format',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('start_date', {
      header: 'Start Date',
      cell: info => {
        const value = info.getValue();
        return value ? new Date(value as string).toLocaleDateString() : '-';
      },
    }),
    columnHelper.accessor('end_date', {
      header: 'End Date',
      cell: info => {
        const value = info.getValue();
        return value ? new Date(value as string).toLocaleDateString() : '-';
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      cell: info => {
        const value = info.getValue();
        return value ? new Date(value as string).toLocaleDateString() : '-';
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: props => (
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(props.row.original)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Edit Tournament"
          >
            <Pencil size={20} />
          </button>
          <button
            onClick={() => onSelectForGames(props.row.original)}
            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
              selectedTournament?.id === props.row.original.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200'
            }`}
            title="Manage Games"
          >
            <Gamepad2 size={20} />
          </button>
          <button
            onClick={() => onDelete(props.row.original.id)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Delete Tournament"
          >
            <Trash2 size={20} />
          </button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: tournaments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
        <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className={`px-6 py-3 text-left text-xs font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider cursor-pointer`}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'}`}>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className={isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
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

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4">
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
        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
      </div>
    </div>
  )
}