'use client'
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table'

interface League {
  id: string
  name: string
  season: string
  age_group: string | null
  gender: string | null
  start_date: string | null
  end_date: string | null
  additional_info: any
  created_at: string | null
  updated_at: string | null
  league_divisions: { name: string }[]
}

interface LeagueTableProps {
  leagues: League[]
  isDarkMode: boolean
  onEdit: (league: League) => void
  onDelete: (id: string) => void
  onSelectForGames: (league: League) => void
  selectedLeagueId: string | null
}

const columnHelper = createColumnHelper<League>()

export default function LeagueTable({
  leagues,
  isDarkMode,
  onEdit,
  onDelete,
  onSelectForGames,
  selectedLeagueId
}: LeagueTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('season', {
      header: 'Season',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('age_group', {
      header: 'Age Group',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('gender', {
      header: 'Gender',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('start_date', {
      header: 'Start Date',
      cell: info => info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '-',
    }),
    columnHelper.accessor('end_date', {
      header: 'End Date',
      cell: info => info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '-',
    }),
    columnHelper.accessor('league_divisions', {
      id: 'divisions',
      header: 'Divisions',
      cell: info => {
        const divisionObjects = info.getValue() as { name: string }[];
        if (!divisionObjects || divisionObjects.length === 0) return '-';
        return (
          <ul className="list-disc list-inside">
            {divisionObjects.map(div => (
              <li key={div.name}>{div.name}</li>
            ))}
          </ul>
        );
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      cell: info => info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '-',
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: props => (
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(props.row.original)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Edit League"
          >
            <Pencil size={20} />
          </button>
          <button
            onClick={() => onSelectForGames(props.row.original)}
            className={`text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
              selectedLeagueId === props.row.original.id ? 'bg-blue-100 dark:bg-blue-900' : ''
            }`}
            title="Manage Games"
          >
            <span className="text-xs font-bold">Games</span>
          </button>
          <button
            onClick={() => onDelete(props.row.original.id)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Delete League"
          >
            <Trash2 size={20} />
          </button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: leagues,
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
    <>
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
    </>
  )
} 