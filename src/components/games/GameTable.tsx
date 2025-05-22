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

interface Game {
  id: string
  league_id: string
  home_team: string
  away_team: string
  home_team_name: string
  away_team_name: string
  location: string | null
  game_date: string | null
  start_time: string | null
  flight: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'postponed'
  score_home: number | null
  score_away: number | null
  created_at: string | null
  updated_at: string | null
}

interface GameTableProps {
  games: Game[]
  isDarkMode: boolean
  selectedTeamId: string | null
  onEdit: (game: Game) => void
  onDelete: (id: string) => void
  viewOnly?: boolean
}

const columnHelper = createColumnHelper<Game>()

export default function GameTable({
  games,
  isDarkMode,
  selectedTeamId,
  onEdit,
  onDelete,
  viewOnly = false
}: GameTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'game_date', desc: false }
  ])

  // Helper function to determine if a game is home or away for the selected team
  const getTeamContext = (game: Game) => {
    if (!selectedTeamId) return null
    if (game.home_team === selectedTeamId) return 'Home'
    if (game.away_team === selectedTeamId) return 'Away'
    return null
  }

  const columns = [
    columnHelper.accessor('home_team_name', {
      header: 'Home Team',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('away_team_name', {
      header: 'Away Team',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('location', {
      header: 'Location',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('game_date', {
      header: 'Date',
      cell: info => info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '-',
    }),
    columnHelper.accessor('start_time', {
      header: 'Time',
      cell: info => info.getValue() ? new Date(`2000-01-01T${info.getValue()}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    }),
    columnHelper.accessor('flight', {
      header: 'Flight',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <span className={`inline-block px-2 py-1 text-xs rounded ${
          info.getValue() === 'completed' ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200' :
          info.getValue() === 'cancelled' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' :
          info.getValue() === 'postponed' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
          'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
        }`}>
          {info.getValue().charAt(0).toUpperCase() + info.getValue().slice(1)}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'score',
      header: 'Score',
      cell: info => {
        const game = info.row.original
        return game.score_home !== null && game.score_away !== null 
          ? `${game.score_home} - ${game.score_away}` 
          : '-'
      },
    }),
    // Only show actions column if not in view-only mode
    ...(viewOnly ? [] : [columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: props => (
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(props.row.original)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
            title="Edit Game"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(props.row.original.id)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
            title="Delete Game"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    })])
  ]

  const table = useReactTable({
    data: games,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  if (games.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500 dark:text-gray-400 mb-4">No games have been added yet.</p>
        {!viewOnly && (
          <button
            onClick={() => onEdit({
              id: '',
              home_team: '',
              away_team: '',
              home_team_name: '',
              away_team_name: '',
              location: null,
              game_date: null,
              start_time: null,
              flight: null,
              status: 'scheduled',
              score_home: null,
              score_away: null,
              created_at: null,
              updated_at: null
            })}
            className={`px-4 py-2 rounded-md ${
              isDarkMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Create First Game
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
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
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300"
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
            className="px-3 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 disabled:opacity-50"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {'<<'}
          </button>
          <button
            className="px-3 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {'<'}
          </button>
          <button
            className="px-3 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {'>'}
          </button>
          <button
            className="px-3 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 disabled:opacity-50"
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