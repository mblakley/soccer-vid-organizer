import React from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { TeamMember } from '@/lib/types/teams';

interface TeamMemberTableProps {
  teamMembers: TeamMember[];
  isDarkMode: boolean;
  onEdit: (member: TeamMember) => void;
  onRemove: (member: TeamMember) => void;
  onSendEmail: (member: TeamMember) => void;
  parentChildRelationships: { [key: string]: string[] };
  expandedPlayers: { [key: string]: boolean };
  onTogglePlayerExpansion: (playerId: string) => void;
}

const columnHelper = createColumnHelper<TeamMember>();

export function TeamMemberTable({
  teamMembers,
  isDarkMode,
  onEdit,
  onRemove,
  onSendEmail,
  parentChildRelationships,
  expandedPlayers,
  onTogglePlayerExpansion,
}: TeamMemberTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = [
    columnHelper.accessor('user_name', {
      header: 'Name',
      cell: info => info.getValue() || 'Unknown',
    }),
    columnHelper.accessor('user_email', {
      header: 'Email',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('roles', {
      header: 'Roles',
      cell: info => {
        const roles = info.getValue();
        return roles && roles.length > 0 
          ? roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ') 
          : '-';
      },
    }),
    columnHelper.accessor('jersey_number', {
      header: 'Jersey #',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('position', {
      header: 'Position',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('joined_date', {
      header: 'Joined',
      cell: info => {
        const value = info.getValue();
        return value ? new Date(value).toLocaleDateString() : '-';
      },
    }),
    columnHelper.accessor('id', {
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(info.row.original)}
            className={`p-2 rounded-md ${
              isDarkMode
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          {info.row.original.user_email && !isTempEmail(info.row.original.user_email) && (
            <button
              onClick={() => onSendEmail(info.row.original)}
              className={`p-2 rounded-md ${
                isDarkMode
                  ? 'text-blue-400 hover:bg-gray-700'
                  : 'text-blue-600 hover:bg-gray-100'
              }`}
              title="Send invitation email"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onRemove(info.row.original)}
            className={`p-2 rounded-md ${
              isDarkMode
                ? 'text-red-400 hover:bg-gray-700'
                : 'text-red-600 hover:bg-gray-100'
            }`}
            title="Remove team member"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: teamMembers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const renderTableBody = () => {
    const rows: React.ReactNode[] = [];
    const processedIds = new Set<string>();

    // Build a set of all parent IDs
    const allParentIds = new Set<string>();
    Object.values(parentChildRelationships).forEach(parentIds => {
      parentIds.forEach(pid => allParentIds.add(pid));
    });

    table.getRowModel().rows.forEach(row => {
      const member = row.original;
      
      // Skip if this member has already been processed as a parent
      if (processedIds.has(member.id)) return;
      // Skip if this member is a parent (should only be shown nested)
      if (allParentIds.has(member.id)) return;

      // Check if this member is a player with parents
      const parentIds = parentChildRelationships[member.id] || [];
      const hasParents = parentIds.length > 0;

      // Add the player row
      rows.push(
        <tr key={member.id} className={`${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
          {row.getVisibleCells().map(cell => (
            <td
              key={cell.id}
              className={`px-6 py-4 whitespace-nowrap text-sm ${
                isDarkMode ? 'text-gray-300' : 'text-gray-500'
              }`}
            >
              {cell.column.id === 'user_name' && hasParents ? (
                <div className="flex items-center">
                  <button
                    onClick={() => onTogglePlayerExpansion(member.id)}
                    className="mr-2 text-gray-400 hover:text-gray-600"
                  >
                    {expandedPlayers[member.id] ? '▼' : '▶'}
                  </button>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ) : (
                flexRender(cell.column.columnDef.cell, cell.getContext())
              )}
            </td>
          ))}
        </tr>
      );

      // Add parent rows if expanded
      if (hasParents && expandedPlayers[member.id]) {
        parentIds.forEach(parentId => {
          const parentMember = teamMembers.find(m => m.id === parentId);
          if (parentMember) {
            processedIds.add(parentId);
            rows.push(
              <tr key={`${member.id}-${parentId}`} className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                {row.getVisibleCells().map(cell => {
                  if (cell.column.id === 'user_name') {
                    return (
                      <td key={cell.id} className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        <div className="flex items-center">
                          <div className="w-6" /> {/* Spacer for alignment */}
                          <span className="ml-6">{parentMember.user_name}</span>
                        </div>
                      </td>
                    );
                  } else if (cell.column.id === 'user_email') {
                    return (
                      <td key={cell.id} className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        <div className="ml-6">{parentMember.user_email || '-'}</div>
                      </td>
                    );
                  } else if (cell.column.id === 'jersey_number') {
                    return (
                      <td key={cell.id} className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        <div className="ml-6">-</div>
                      </td>
                    );
                  } else if (cell.column.id === 'roles') {
                    return (
                      <td key={cell.id} className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        <div className="ml-6">{parentMember.roles?.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ')}</div>
                      </td>
                    );
                  } else {
                    return (
                      <td key={cell.id} className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        <div className="ml-6">
                          {flexRender(cell.column.columnDef.cell, {
                            ...cell.getContext(),
                            row: {
                              ...cell.row,
                              original: parentMember
                            }
                          })}
                        </div>
                      </td>
                    );
                  }
                })}
              </tr>
            );
          }
        });
      }
    });

    return rows;
  };

  return (
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
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {renderTableBody()}
        </tbody>
      </table>
    </div>
  );
}

// Helper function to check if an email is a temporary placeholder
function isTempEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.includes('@placeholder.com') && email.startsWith('temp_');
} 