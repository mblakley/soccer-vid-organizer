'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { withAdminAuth } from '@/components/auth'
import { User } from '@supabase/supabase-js'
import { ArrowLeft, Pencil, Plus, Check, X } from 'lucide-react'
import { toast } from 'react-toastify'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table'
import { Dialog, Listbox } from '@headlessui/react'
import { ChevronsUpDown, Check as CheckIcon } from 'lucide-react'
import React from 'react'
import { apiClient } from '@/lib/api/client'

// Import correct types and remove local ones
import { Team, TeamMember } from '@/lib/types/teams'; // Assuming TeamMember's roles is non-optional array
import { UserWithRole } from '@/lib/types/auth';
// TeamRequest for pending requests - might need a more specific AdminDisplayTeamRequest later
import { TeamRequest } from '@/lib/types/teams'; 
import { ErrorResponse } from '@/lib/types/auth'; // For type guard
// Import the new AdminDisplayTeamRequest and AdminPendingRequestsResponse
import { AdminDisplayTeamRequest, AdminPendingRequestsResponse } from '@/lib/types/admin'; 
import {
  AdminTeamMembersApiResponse, // For fetching members
  AdminTeamRelationshipsApiResponse, // For fetching relationships
  AdminTeamApiResponse, // For fetching single team details
  Relationship, // Import the new Relationship type from admin types
  AdminListTeamsApiResponseForTeamsPage,
  AdminListRolesApiResponse,
  AdminPendingRequestsApiResponse,
  CheckUserApiResponse,
  AdminManageTeamMemberRequest,
  AdminManageTeamMemberApiResponse,
  InviteUserRequest,
  NotifyTeamMemberRequest,
  InviteUserApiResponse,
  NotifyTeamMemberApiResponse,
  AdminRemoveTeamMemberRequest,
  AdminRemoveTeamMemberApiResponse,
  ProcessTeamRequest,
  ProcessTeamRequestApiResponse,
} from '@/lib/types/admin'; 

// Remove local AuthUser
/*
interface AuthUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    name?: string
  }
}
*/

// Remove local TeamMember if covered by imported TeamMember
// The local one had roles as optional, the imported one has it as required array.
// This might require adjustments where TeamMember is used if data can have optional roles.
// For now, assume imported TeamMember is the standard.
/*
interface TeamMember {
  id: string
  team_id: string
  user_id: string
  jersey_number?: string
  position?: string
  joined_date: string
  left_date?: string
  is_active: boolean
  user_email?: string
  user_name?: string
  roles?: string[]
}
*/

// Remove local Team
/*
interface Team {
  id: string
  name: string
  club_affiliation?: string
}
*/

// Remove local Relationship interface as it's now imported from admin types
/*
interface Relationship { 
  player_team_member_id: string
  parent_team_member_id: string
  team_id: string | null;
  user_id?: string;
}
*/

// Adjusted TeamMemberRequest to use imported TeamRequest as a base, then extend or use a new Admin one
// For now, let's use a more specific local type that matches the fields used.
// This will eventually be replaced by a type from src/lib/types/admin.ts
/*
interface DisplayTeamRequest extends TeamRequest { // Extending TeamRequest for now
  user_email?: string;
  user_name?: string;
  team_name?: string; // This might be redundant if team object is nested
  request_type: 'join' | 'role'; // Custom field for UI logic
  // team_members and teams are from the original local interface, likely from a complex query.
  // These would be part of the structure returned by a dedicated admin API for requests.
  team_members?: {
    user_id: string;
    team_id: string;
  };
  teams?: {
    name: string;
  };
  requested_role?: string; // If request_type is 'role', this might hold the specific role
  additional_info?: {
    playerName?: string;
    [key: string]: any;
  };
}

interface PendingRequests {
  join: DisplayTeamRequest[];
  role: DisplayTeamRequest[];
}
*/

// Type guard for ErrorResponse
function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response.error === 'string';
}

const columnHelper = createColumnHelper<TeamMember>() // Uses imported TeamMember

function TeamMembersPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const teamId = searchParams.get('teamId')
  const { isDarkMode } = useTheme()
  const [team, setTeam] = useState<Team | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [parentChildRelationships, setParentChildRelationships] = useState<{[key: string]: string[]}>({})
  const [expandedPlayers, setExpandedPlayers] = useState<{[key: string]: boolean}>({})
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    jersey_number: '',
    position: '',
    roles: [],
    team_id: teamId
  })
  const [isInviting, setIsInviting] = useState(false)
  const [newMemberData, setNewMemberData] = useState({
    email: '',
    name: '',
    jersey_number: '',
    position: '',
    roles: [] as string[]
  })
  const [existingUser, setExistingUser] = useState<UserWithRole | null>(null)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [existingUserFound, setExistingUserFound] = useState(false)
  const [roleError, setRoleError] = useState(false)
  // Use AdminDisplayTeamRequest for pendingRequests state
  const [pendingRequests, setPendingRequests] = useState<{ join: AdminDisplayTeamRequest[], role: AdminDisplayTeamRequest[] }>({ join: [], role: [] })
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<AdminDisplayTeamRequest | null>(null) // Use AdminDisplayTeamRequest
  const [isProcessingRequest, setIsProcessingRequest] = useState(false)
  const [editPlayerName, setEditPlayerName] = useState<string>('')

  // Helper function to check if an email is a temporary placeholder
  const isTempEmail = (email: string | null | undefined): boolean => {
    if (!email) return false;
    return email.includes('@placeholder.com') && email.startsWith('temp_');
  };

  // Helper function to check if user has a real email (not empty and not temp)
  const hasRealEmail = (member: TeamMember | null): boolean => {
    if (!member) return false;
    if (!member.user_email) return false;
    return !isTempEmail(member.user_email);
  };

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
        const roles = info.getValue()
        return roles && roles.length > 0 
          ? roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ') 
          : '-'
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
      cell: info => new Date(info.getValue()).toLocaleDateString(),
    }),
    columnHelper.accessor('id', {
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditClick(info.row.original)}
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
              onClick={() => handleSendEmail(info.row.original)}
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
            onClick={() => handleRemoveClick(info.row.original)}
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
  ]

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
  })

  const fetchTeamMembers = useCallback(async () => {
    if (!teamId) return;
    setError(null); // Clear previous errors
    try {
      const response = await apiClient.get<AdminTeamMembersApiResponse>(`/api/admin/teams/${teamId}/members`)
      
      if (isErrorResponse(response)) {
        setError(response.error || 'Failed to fetch team members');
        setTeamMembers([]);
      } else if (response && response.members) {
        setTeamMembers(response.members)
      } else {
        setTeamMembers([]); // Handle case where response is successful but no members array
      }
    } catch (error: any) {
      console.error('Error fetching team members:', error)
      setError(error.message || 'Failed to fetch team members')
      setTeamMembers([]);
    }
  }, [teamId])

  const fetchTeams = async () => {
    setError(null);
    try {
      // Use AdminListTeamsApiResponseForTeamsPage for consistency, assuming it lists all teams for admin
      const response = await apiClient.get<AdminListTeamsApiResponseForTeamsPage>('/api/admin/teams/list')
      
      if (isErrorResponse(response)) {
        setError(response.error || 'Failed to fetch teams');
        setTeams([]);
      } else if (response && response.teams) {
        setTeams(response.teams)
        // If a teamId is in the URL and not in the list, fetch it specifically (AdminTeamApiResponse)
        if (teamId && !response.teams.some((t: Team) => t.id === teamId)) {
          const teamDetailsResponse = await apiClient.get<AdminTeamApiResponse>(`/api/admin/teams/${teamId}`);
          if (!isErrorResponse(teamDetailsResponse) && teamDetailsResponse.team) {
            setTeams(prev => [...prev, teamDetailsResponse.team]);
          }
        }
      } else {
        setTeams([]);
      }
    } catch (error: any) {
      console.error('Error fetching teams:', error)
      setError(error.message || 'Failed to fetch teams')
      setTeams([]);
    }
  }

  const fetchParentChildRelationships = useCallback(async () => {
    if (!teamId) return
    setError(null);
    try {
      const response = await apiClient.get<AdminTeamRelationshipsApiResponse>(`/api/admin/teams/${teamId}/relationships`)
      
      if (isErrorResponse(response)) {
        setError(response.error || 'Failed to fetch relationships');
        setParentChildRelationships({});
      } else if (response && response.relationships) {
        const relationshipMap: {[key: string]: string[]} = {}
        response.relationships.forEach((rel: Relationship) => {
          if (!relationshipMap[rel.player_team_member_id]) {
            relationshipMap[rel.player_team_member_id] = []
          }
          relationshipMap[rel.player_team_member_id].push(rel.parent_team_member_id)
        })
        setParentChildRelationships(relationshipMap)
      } else {
        setParentChildRelationships({});
      }
    } catch (error: any) {
      console.error('Error fetching parent-child relationships:', error)
      setError(error.message || 'Failed to fetch relationships');
      setParentChildRelationships({});
    }
  }, [teamId])

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    const fetchTeamAndMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch team details
        const teamDetailsResponse = await apiClient.get<AdminTeamApiResponse>(`/api/admin/teams/${teamId}`)

        if (isErrorResponse(teamDetailsResponse)) {
          throw new Error(teamDetailsResponse.error || 'Failed to fetch team details');
        }
        if (teamDetailsResponse && teamDetailsResponse.team) {
           setTeam(teamDetailsResponse.team); 
        } else {
           throw new Error('Invalid team data received');
        }

        // Parallel fetch for members and relationships might be possible if independent
        await fetchTeamMembers();
        await fetchParentChildRelationships();
      } catch (error: any) {
        console.error('Error fetching team data:', error);
        setError(error.message || 'Failed to fetch team data');
        setTeam(null); // Clear team data on error
      } finally {
        setLoading(false);
      }
    };

    fetchTeamAndMembers();
  }, [teamId, fetchTeamMembers, fetchParentChildRelationships]);

  const fetchRoles = async () => {
    setError(null);
    try {
      const response = await apiClient.get<AdminListRolesApiResponse>('/api/admin/roles/list') // Assuming this new endpoint
      
      if (isErrorResponse(response)) {
        setError(response.error || 'Failed to fetch roles');
        setAvailableRoles([]);
      } else if (response && response.roles) {
        setAvailableRoles(response.roles.map(r => r.name)) // Assuming Role type has a name property
      } else {
        setAvailableRoles([]);
      }
    } catch (err: any) {
      console.error('Exception fetching roles:', err)
      setError(err.message || 'An unexpected error occurred');
      setAvailableRoles([]);
    }
  }

  useEffect(() => {
    fetchRoles()
  }, []) // Removed fetchPendingRequests from here, will call it separately or ensure it's in a relevant useEffect

  const fetchPendingRequests = useCallback(async () => {
    setError(null);
    try {
      // Assuming a single endpoint that returns both types of requests, or separate if needed.
      // For this example, using the AdminPendingRequestsApiResponse which expects a flat list.
      const response = await apiClient.get<AdminPendingRequestsApiResponse>('/api/admin/pending-requests');

      if (isErrorResponse(response)) {
        setError(response.error || 'Failed to fetch pending requests');
        setPendingRequests({ join: [], role: [] });
      } else if (response && response.requests) {
        // Categorize requests if the API returns a flat list
        const joinRequests = response.requests.filter(r => r.request_type === 'join');
        const roleRequests = response.requests.filter(r => r.request_type === 'role');
        setPendingRequests({ join: joinRequests, role: roleRequests });
      } else {
        setPendingRequests({ join: [], role: [] });
      }
    } catch (err: any) {
      console.error('Exception fetching pending requests:', err);
      setError(err.message || 'An unexpected error occurred while fetching requests');
      setPendingRequests({ join: [], role: [] });
    }
  }, []); // useCallback dependencies might be needed if it uses state/props that change

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTeamId = e.target.value
    if (newTeamId) {
      router.push(`/admin/team-members?teamId=${newTeamId}`)
    }
  }

  const handleEditClick = (member: TeamMember) => {
    setEditingMember(member)
    setFormData({
      name: member.user_name || '',
      email: member.user_email || '',
      jersey_number: member.jersey_number || '',
      position: member.position || '',
      roles: member.roles || [],
      team_id: member.team_id,
      user_id: member.user_id
    })
    setIsEditModalOpen(true)
    setExistingUserFound(false)
  }

  const handleCloseModal = () => {
    setIsEditModalOpen(false)
    setEditingMember(null)
    setFormData({
      name: '',
      email: '',
      jersey_number: '',
      position: '',
      roles: [],
      team_id: teamId ?? null
    })
    setExistingUserFound(false)
  }

  const checkExistingUser = async (email: string) => {
    if (!email || email.length < 3) {
      setExistingUserFound(false)
      setExistingUser(null); // Clear existing user data
      return
    }

    setIsCheckingEmail(true)
    setError(null);
    try {
      const response = await apiClient.post<CheckUserApiResponse>('/api/admin/check-user', {
        email,
        teamId: teamId // Pass current teamId to check if user is already a member of THIS team
      });

      if (isErrorResponse(response)) {
        if (response.error.includes('already a member')) { // More specific error check
            toast.error(response.error);
            setFormData(prev => ({ ...prev, email: '' })); // Clear email if already member
        } else {
            toast.error(response.error || 'Failed to check user');
        }
        setExistingUserFound(false);
        setExistingUser(null);
        return;
      }
      
      // If CheckUserResponse itself can contain an error property for business logic errors
      if (response.error) { 
        toast.error(response.error);
        setExistingUserFound(false);
        setExistingUser(null);
        return;
      }

      if (response.exists) {
        setExistingUserFound(true);
        // Assuming response.user is UserWithRole compatible or parts of it.
        // The CheckUserResponse schema has user: {id, email, name}. Ensure this maps to UserWithRole if needed elsewhere.
        // For now, just setting name in formData.
        setFormData(prev => ({
          ...prev,
          name: response.user?.name || '' 
        }));
        // setExistingUser(response.user); // If you need to store the full user object
      } else {
        setExistingUserFound(false);
        setExistingUser(null);
      }
    } catch (error: any) {
      console.error('Error checking existing user:', error);
      toast.error(error.message || 'Failed to check existing user');
      setExistingUserFound(false);
      setExistingUser(null);
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.roles.length === 0) {
      setRoleError(true)
      return
    }
    setRoleError(false); // Clear error if roles are selected
    setIsInviting(true); // Use isInviting as a generic loading state for submit
    setError(null);

    try {
      const requestBody: AdminManageTeamMemberRequest = {
        team_id: teamId!,
        user_id: editingMember ? editingMember.user_id : (existingUser ? existingUser.id : undefined),
        email: (!editingMember || !hasRealEmail(editingMember)) && formData.email ? formData.email : undefined,
        name: (!editingMember || !hasRealEmail(editingMember)) && formData.name ? formData.name : (editingMember?.user_name || undefined),
        roles: formData.roles,
        jersey_number: formData.jersey_number || null,
        position: formData.position || null,
      };

      // Determine if it's an update (editingMember exists) or add
      // The backend endpoint /api/admin/team-members/manage should handle creation or update based on user_id/email
      const response = await apiClient.post<AdminManageTeamMemberApiResponse>('/api/admin/team-members/manage', requestBody);
      
      if (isErrorResponse(response)) {
        throw new Error(response.error);
      }

      toast.success(
        editingMember
          ? 'Team member updated successfully!'
          : 'Team member added/invited successfully!' 
      );

      handleCloseModal();
      fetchTeamMembers(); // Refresh member list

    } catch (error: any) {
      console.error('Error submitting team member data:', error);
      setError(error.message || 'An error occurred while saving team member.');
      toast.error(error.message || 'An error occurred while saving team member.');
    } finally {
      setIsInviting(false);
    }
  }

  const handleAddClick = () => {
    setEditingMember(null)
    setFormData({
      name: '',
      email: '',
      jersey_number: '',
      position: '',
      roles: [],
      team_id: teamId ?? null
    })
    setIsEditModalOpen(true)
  }

  const handleSendEmail = async (member: TeamMember) => {
    if (!member.user_email || !team?.name || !member.team_id) {
      toast.error('Missing required information to send email.');
      return;
    }
    setError(null);
    // It seems isInviting is used as a general loading state for this kind of operation
    setIsInviting(true); 

    try {
      // Determine if this is a new or existing user by calling check-user
      const checkUserRequestBody = { email: member.user_email, teamId: member.team_id };
      const checkUserResponse = await apiClient.post<CheckUserApiResponse>('/api/admin/check-user', checkUserRequestBody);

      let endpoint = '';
      let emailRequestBody: InviteUserRequest | NotifyTeamMemberRequest | null = null;
      let successMessage = '';

      if (isErrorResponse(checkUserResponse)) {
        // If check-user itself fails, but not because user is already member (which is a business logic handled by response.isTeamMember)
        if (!checkUserResponse.error.includes('already a member')) {
             throw new Error(checkUserResponse.error || 'Failed to check user status before sending email.');
        }
        // If error is 'already a member', proceed as if user exists for notification purposes.
        // This case implies user exists and is part of the team.
        endpoint = '/api/admin/notify-team-member';
        emailRequestBody = { email: member.user_email, team_id: member.team_id, team_name: team.name };
        successMessage = 'Team notification email sent successfully!';

      } else if (checkUserResponse.exists) {
        endpoint = '/api/admin/notify-team-member';
        emailRequestBody = { email: member.user_email, team_id: member.team_id, team_name: team.name };
        successMessage = 'Team notification email sent successfully!';
      } else {
        endpoint = '/api/admin/invite-user';
        emailRequestBody = { email: member.user_email, team_id: member.team_id, team_name: team.name };
        successMessage = 'Invitation email sent successfully!';
      }
      
      if (!emailRequestBody) { // Should not happen if logic is correct
          throw new Error('Could not determine email request details.');
      }

      // Call the determined email endpoint
      // The response type here could be InviteUserApiResponse or NotifyTeamMemberApiResponse
      const emailResponse = await apiClient.post<InviteUserApiResponse | NotifyTeamMemberApiResponse>(endpoint, emailRequestBody);

      if (isErrorResponse(emailResponse) || (emailResponse && (emailResponse as any).error && !(emailResponse as any).messageId)) {
        // Checking for error property in the response body itself if not caught by isErrorResponse
        const errorMsg = isErrorResponse(emailResponse) ? emailResponse.error : ((emailResponse as any)?.error || 'Failed to send email');
        throw new Error(errorMsg);
      }

      toast.success(successMessage);

    } catch (error: any) {
      console.error('Error sending email:', error);
      setError(error.message || 'Failed to send email');
      toast.error(error.message || 'Failed to send email');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveClick = (member: TeamMember) => {
    setMemberToRemove(member)
    setIsRemoveModalOpen(true)
  }

  const handleRemoveConfirm = async () => {
    if (!memberToRemove || !teamId) return;

    setIsRemoving(true);
    setError(null);
    try {
      const requestBody: AdminRemoveTeamMemberRequest = {
        team_id: teamId,
        user_id: memberToRemove.user_id // Assuming memberToRemove.user_id is the ID of the user to remove
      };
      const response = await apiClient.post<AdminRemoveTeamMemberApiResponse>('/api/admin/team-members/remove', requestBody);

      if (isErrorResponse(response) || (response && response.success === false)) {
        const errorMsg = isErrorResponse(response) ? response.error : (response?.message || 'Failed to remove team member');
        throw new Error(errorMsg);
      }
      
      toast.success(response?.message || 'Team member removed successfully');
      fetchTeamMembers(); // Refresh the list
      setIsRemoveModalOpen(false);
      setMemberToRemove(null);
    } catch (err: any) {
      console.error('Error removing team member:', err);
      setError(err.message || 'Failed to remove team member');
      toast.error(err.message || 'Failed to remove team member');
    } finally {
      setIsRemoving(false);
    }
  }

  const handleRemoveCancel = () => {
    setIsRemoveModalOpen(false)
    setMemberToRemove(null)
  }

  const handleRequestClick = (request: AdminDisplayTeamRequest) => {
    setSelectedRequest(request)
    // Initialize the player name edit field if this is a parent role request
    if (request.requested_roles.includes('parent') && request.additional_info?.playerName) {
      setEditPlayerName(request.additional_info.playerName)
    } else {
      setEditPlayerName('')
    }
    setIsRequestModalOpen(true)
  }

  const handleRoleCheckboxChange = (requestId: string, role: string, checked: boolean) => {
    setPendingRequests(prev => ({
      ...prev,
      join: prev.join.map(request => {
        if (request.id === requestId) {
          const updatedRoles = checked 
            ? [...request.requested_roles, role]
            : request.requested_roles.filter(r => r !== role);
          
          return { ...request, requested_roles: updatedRoles };
        }
        return request;
      })
    }));
  };

  const handleApproveDirectly = async (request: AdminDisplayTeamRequest) => {
    setIsProcessingRequest(true);
    setError(null);
    try {
      const requestBody: ProcessTeamRequest = {
        requestId: request.id,
        action: 'approve',
        team_id: request.team_id,
        user_id: request.user_id,
        roles: request.requested_roles,
        // If approving a parent role, player name might be needed.
        // The AdminDisplayTeamRequest has additional_info.playerName if set in UI.
        // The backend /api/admin/requests/process should handle this if necessary.
        additional_info: editPlayerName && request.requested_roles.includes('parent') ? { playerName: editPlayerName } : request.additional_info
      };

      const response = await apiClient.post<ProcessTeamRequestApiResponse>('/api/admin/requests/process', requestBody);

      if (isErrorResponse(response) || (response && response.success === false)) {
        const errorMsg = isErrorResponse(response) ? response.error : (response?.message || 'Failed to approve request');
        throw new Error(errorMsg);
      }

      toast.success(response?.message || 'Request approved successfully');
      fetchPendingRequests(); // Refresh requests
      fetchTeamMembers();   // Refresh team members as one might have been added/updated
      setIsRequestModalOpen(false);
      setSelectedRequest(null);
      setEditPlayerName(''); // Reset player name field
    } catch (err: any) {
      console.error('Error approving request:', err);
      setError(err.message || 'Failed to approve request');
      toast.error(err.message || 'Failed to approve request');
    } finally {
      setIsProcessingRequest(false);
    }
  }

  const handleRejectDirectly = async (request: AdminDisplayTeamRequest) => {
    setIsProcessingRequest(true);
    setError(null);
    try {
      const requestBody: ProcessTeamRequest = {
        requestId: request.id,
        action: 'reject',
        team_id: request.team_id, // Include these for context if backend needs them
        user_id: request.user_id,
        roles: request.requested_roles
      };
      const response = await apiClient.post<ProcessTeamRequestApiResponse>('/api/admin/requests/process', requestBody);

      if (isErrorResponse(response) || (response && response.success === false)) {
        const errorMsg = isErrorResponse(response) ? response.error : (response?.message || 'Failed to reject request');
        throw new Error(errorMsg);
      }

      toast.success(response?.message || 'Request rejected successfully');
      fetchPendingRequests(); // Refresh requests
      setIsRequestModalOpen(false);
      setSelectedRequest(null);
      setEditPlayerName('');
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      setError(err.message || 'Failed to reject request');
      toast.error(err.message || 'Failed to reject request');
    } finally {
      setIsProcessingRequest(false);
    }
  }

  const togglePlayerExpansion = (playerId: string) => {
    setExpandedPlayers(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };

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
                    onClick={() => togglePlayerExpansion(member.id)}
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="mb-6 space-x-4">
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

        {/* Pending Requests Section */}
        {pendingRequests.join.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Pending Requests</h2>
              <div className="flex gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
                  {pendingRequests.join.length} team request{pendingRequests.join.length !== 1 ? 's' : ''}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800`}>
                  {pendingRequests.role.length} role request{pendingRequests.role.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className={`overflow-x-auto rounded-lg shadow ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
              <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      User
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Team
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Request Type
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Requested Roles
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Requested
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {pendingRequests.join.map((request: AdminDisplayTeamRequest) => (
                    <tr key={request.id} className={isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{request.user_name}</div>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{request.user_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{request.team_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${'bg-blue-100 text-blue-800'}`}>Join Team</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex flex-wrap gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}> 
                          {availableRoles.filter((role: string) => request.requested_roles.includes(role)).map((role: string) => (
                            <label key={`${request.id}-${role}`} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={request.requested_roles.includes(role)}
                                onChange={(e) => handleRoleCheckboxChange(request.id, role, e.target.checked)}
                                className={`rounded ${isDarkMode ? 'border-gray-600 bg-gray-700 text-blue-500' : 'border-gray-300 bg-white text-blue-600'}`}
                              />
                              <span className="text-sm">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{new Date(request.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRejectDirectly(request)}
                            disabled={isProcessingRequest}
                            className={`p-2 rounded-md ${isDarkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'}`}
                            title="Reject request"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRequestClick(request)}
                            disabled={isProcessingRequest}
                            className={`p-2 rounded-md ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                            title="Review request details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleApproveDirectly(request)}
                            disabled={isProcessingRequest}
                            className={`p-2 rounded-md ${isDarkMode ? 'text-green-400 hover:bg-gray-700' : 'text-green-600 hover:bg-gray-100'}`}
                            title="Approve request"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <label 
              htmlFor="team-select" 
              className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Select Team:
            </label>
            <select
              id="team-select"
              value={teamId || ''}
              onChange={handleTeamChange}
              className={`rounded-md border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-gray-300' 
                  : 'bg-white border-gray-300 text-gray-700'
              } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Select a team...</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name} {team.club_affiliation ? `(${team.club_affiliation})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className={`p-4 rounded ${isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`}>
            {error}
          </div>
        ) : team ? (
          <>
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold mb-2">{team.name} - Team Members</h1>
                {team.club_affiliation && (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {team.club_affiliation}
                  </p>
                )}
              </div>
              <button
                onClick={handleAddClick}
                className={`inline-flex items-center px-4 py-2 rounded-md ${
                  isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Team Member
              </button>
            </div>

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
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {renderTableBody()}
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
        ) : (
          <div className="text-center py-8">
            <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Please select a team to view its members
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={isEditModalOpen}
        onClose={handleCloseModal}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className={`mx-auto w-full max-w-2xl rounded-lg p-6 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <Dialog.Title className={`text-lg font-medium mb-4 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-900'
            }`}>
              {editingMember ? 'Edit Team Member' : 'Add Team Member'}
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`