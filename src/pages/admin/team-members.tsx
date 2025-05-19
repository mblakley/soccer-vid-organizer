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

interface AuthUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    name?: string
  }
}

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

interface Team {
  id: string
  name: string
  club_affiliation: string | null
}

interface FormData {
  name: string;
  email: string;
  jersey_number: string;
  position: string;
  roles: string[];
  team_id: string | null;
  user_id?: string;
}

interface TeamMemberRequest {
  id: string
  user_id: string
  team_id: string
  requested_roles: string[]
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  user_email?: string
  user_name?: string
  team_name?: string
  request_type: 'join' | 'role'
  team_members?: {
    user_id: string
    team_id: string
  }
  teams?: {
    name: string
  }
  requested_role?: string
  additional_info?: {
    playerName?: string
    [key: string]: any
  }
}

const columnHelper = createColumnHelper<TeamMember>()

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
  const [existingUser, setExistingUser] = useState<AuthUser | null>(null)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [existingUserFound, setExistingUserFound] = useState(false)
  const [roleError, setRoleError] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<TeamMemberRequest[]>([])
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<TeamMemberRequest | null>(null)
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

    try {
      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true);

      if (membersError) throw membersError;

      // Fetch user details
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const users = await response.json() as AuthUser[];
      // Create a map of user_id to user data
      const userMap = new Map(users.map((user) => [
        user.id,
        {
          email: isTempEmail(user.email) ? '' : (user.email || ''),
          name: user.user_metadata?.full_name || 'Unknown'
        }
      ]));

      // Fetch roles for each team member
      const { data: rolesData, error: rolesError } = await supabase
        .from('team_member_roles')
        .select('team_member_id, role')
        .in('team_member_id', membersData.map(m => m.id));

      if (rolesError) throw rolesError;

      // Create a map of team_member_id to roles
      const rolesMap = new Map<string, string[]>();
      rolesData.forEach(role => {
        const currentRoles = rolesMap.get(role.team_member_id) || [];
        rolesMap.set(role.team_member_id, [...currentRoles, role.role]);
      });

      // Combine the data
      const membersWithUserData = membersData.map(member => ({
        ...member,
        user_email: userMap.get(member.user_id)?.email || '',
        user_name: userMap.get(member.user_id)?.name || 'Unknown',
        roles: rolesMap.get(member.id) || []
      }));

      setTeamMembers(membersWithUserData);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      setError(error.message || 'Failed to fetch team members');
    }
  }, [teamId]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, club_affiliation')
          .order('name');

        if (teamsError) throw teamsError;
        setTeams(teamsData);

        // If we have a teamId in the URL, make sure it's in the teams list
        if (teamId && !teamsData.some(team => team.id === teamId)) {
          // If not, fetch the specific team
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('id, name, club_affiliation')
            .eq('id', teamId)
            .single();

          if (!teamError && teamData) {
            setTeams(prev => [...prev, teamData]);
          }
        }
      } catch (error: any) {
        console.error('Error fetching teams:', error);
        setError(error.message || 'Failed to fetch teams');
      }
    };

    fetchTeams();
  }, [teamId]);

  const fetchParentChildRelationships = useCallback(async () => {
    if (!teamId) return;

    try {
      const { data: relationships, error: relError } = await supabase
        .from('player_parent_relationships')
        .select(`
          player_team_member_id,
          parent_team_member_id,
          team_members!player_team_member_id(id, user_id),
          parent_team_members:team_members!parent_team_member_id(id, user_id)
        `)
        .eq('team_members.team_id', teamId)
        .eq('parent_team_members.team_id', teamId);

      if (relError) throw relError;

      // Create a map of player IDs to their parent IDs
      const relationshipMap: {[key: string]: string[]} = {};
      relationships?.forEach(rel => {
        if (!relationshipMap[rel.player_team_member_id]) {
          relationshipMap[rel.player_team_member_id] = [];
        }
        relationshipMap[rel.player_team_member_id].push(rel.parent_team_member_id);
      });

      setParentChildRelationships(relationshipMap);
    } catch (error) {
      console.error('Error fetching parent-child relationships:', error);
    }
  }, [teamId]);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    const fetchTeamAndMembers = async () => {
      try {
        setLoading(true);
        // Fetch team details
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id, name, club_affiliation')
          .eq('id', teamId)
          .single();

        if (teamError) throw teamError;
        setTeam(teamData);

        await fetchTeamMembers();
        await fetchParentChildRelationships();
      } catch (error: any) {
        console.error('Error fetching team data:', error);
        setError(error.message || 'Failed to fetch team data');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamAndMembers();
  }, [teamId, fetchTeamMembers, fetchParentChildRelationships]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_team_member_roles')

        if (error) {
          console.error('Error fetching roles:', error)
          return
        }

        if (data) {
          setAvailableRoles(data)
        }
      } catch (error) {
        console.error('Error in fetchRoles:', error)
      }
    }

    fetchRoles()
  }, [])

  const fetchPendingRequests = useCallback(async () => {
    try {
      // Fetch team join requests
      const { data: joinRequests, error: joinError } = await supabase
        .from('team_member_requests')
        .select('*, teams:team_id(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (joinError) throw joinError;

      // Fetch role requests
      const { data: roleRequests, error: roleError } = await supabase
        .from('team_member_role_requests')
        .select(`
          *,
          team_members!inner(
            user_id,
            team_id,
            teams!inner(name)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (roleError) throw roleError;

      // Fetch user details for all requests
      const userIds = new Set([
        ...(joinRequests?.map(r => r.user_id) || []),
        ...(roleRequests?.map(r => r.team_members.user_id) || [])
      ]);

      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const users = await response.json() as AuthUser[];
      const userMap = new Map(users.map(user => [user.id, user]));

      // Format join requests
      const formattedJoinRequests = joinRequests?.map(request => ({
        ...request,
        request_type: 'join' as const,
        user_email: userMap.get(request.user_id)?.email,
        user_name: userMap.get(request.user_id)?.user_metadata?.full_name || 'Unknown',
        team_name: request.teams?.name,
        additional_info: request.additional_info
      })) || [];

      // Format role requests
      const formattedRoleRequests = roleRequests?.map(request => ({
        id: request.id,
        user_id: request.team_members.user_id,
        team_id: request.team_members.team_id,
        requested_roles: [request.requested_role],
        status: request.status,
        created_at: request.created_at,
        request_type: 'role' as const,
        user_email: userMap.get(request.team_members.user_id)?.email,
        user_name: userMap.get(request.team_members.user_id)?.user_metadata?.full_name || 'Unknown',
        team_name: request.team_members.teams.name,
        additional_info: request.additional_info
      })) || [];

      setPendingRequests([...formattedJoinRequests, ...formattedRoleRequests]);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      toast.error('Failed to fetch pending requests');
    }
  }, []);

  useEffect(() => {
    fetchPendingRequests()
  }, [fetchPendingRequests])

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
      return
    }

    setIsCheckingEmail(true)
    try {
      const response = await fetch('/api/admin/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          teamId
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (data.isTeamMember) {
          toast.error('This user is already a member of this team')
          setFormData(prev => ({ ...prev, email: '' }))
        } else {
          toast.error(data.error || 'Failed to check user')
        }
        setExistingUserFound(false)
        return
      }
      
      if (data.exists) {
        setExistingUserFound(true)
        setFormData(prev => ({
          ...prev,
          name: data.user.name || ''
        }))
      } else {
        setExistingUserFound(false)
      }
    } catch (error) {
      console.error('Error checking existing user:', error)
      toast.error('Failed to check existing user')
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.roles.length === 0) {
      setRoleError(true);
      return;
    }

    // Check for duplicate jersey number if player role is selected
    if (formData.roles.includes('player') && formData.jersey_number) {
      const { data: existingMembers, error: checkError } = await supabase
        .from('team_members')
        .select('id, jersey_number')
        .eq('team_id', formData.team_id)
        .eq('jersey_number', formData.jersey_number)
        .eq('is_active', true);

      if (checkError) {
        toast.error('Error checking for duplicate jersey number');
        return;
      }

      // If editing, exclude the current member from the check
      const isDuplicate = existingMembers?.some(member => 
        !editingMember || member.id !== editingMember.id
      );

      if (isDuplicate) {
        toast.error('This jersey number is already in use by another team member');
        return;
      }
    }

    try {
      let userId = formData.user_id;

      // Only check for existing user if we're not editing and have an email
      if (!editingMember && formData.email) {
        const response = await fetch('/api/admin/check-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: formData.email,
            teamId
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          if (data.isTeamMember) {
            toast.error('This user is already a member of this team');
            return;
          } else {
            throw new Error(data.error || 'Failed to check user');
          }
        }
        
        if (data.exists) {
          // Use the existing user's ID
          userId = data.user.id;
          
          // Send team notification email to existing user
          const notifyResponse = await fetch('/api/admin/notify-team-member', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email,
              team_id: formData.team_id,
              team_name: team?.name || 'Your Team'
            }),
          });

          if (!notifyResponse.ok) {
            const error = await notifyResponse.json();
            console.error('Failed to send team notification email:', error);
            // Continue anyway, don't throw an error
          }
        } else {
          // Only create a new user if they don't exist
          const createResponse = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email,
              password: Math.random().toString(36).slice(-8),
              metadata: { 
                name: formData.name,
                ...(formData.email ? {} : { disabled: true })
              },
              display_name: formData.name
            }),
          });

          if (!createResponse.ok) {
            const error = await createResponse.json();
            throw new Error(error.message || 'Failed to create user');
          }

          const { user } = await createResponse.json();
          console.log('Created user:', user);
          userId = user.user.id;

          // Send invitation email for new users
          const inviteResponse = await fetch('/api/admin/invite-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email,
              team_id: formData.team_id,
              team_name: team?.name || 'Your Team'
            }),
          });

          if (!inviteResponse.ok) {
            const error = await inviteResponse.json();
            console.error('Failed to send invitation email:', error);
            // Continue anyway, don't throw an error
          }
        }
      } else if (!editingMember && !formData.email) {
        // Create a temporary user for team members without email
        const createResponse = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: `temp_${Date.now()}@placeholder.com`,
            password: Math.random().toString(36).slice(-8),
            metadata: { 
              name: formData.name,
              disabled: true
            },
            display_name: formData.name
          }),
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.message || 'Failed to create user');
        }

        const { user } = await createResponse.json();
        console.log('Created temporary user:', user);
        userId = user.user.id;
      }

      if (!userId) {
        throw new Error('Failed to get user ID');
      }

      let teamMemberId;
      
      if (editingMember) {
        // We're editing an existing team member
        // Update the team member with the new user_id and other details
        const { error: updateError } = await supabase
          .from('team_members')
          .update({
            user_id: userId,
            jersey_number: formData.jersey_number,
            position: formData.position
          })
          .eq('id', editingMember.id);
          
        if (updateError) throw updateError;
        
        teamMemberId = editingMember.id;
        
        // Delete existing roles for this team member
        const { error: deleteRolesError } = await supabase
          .from('team_member_roles')
          .delete()
          .eq('team_member_id', teamMemberId);
          
        if (deleteRolesError) throw deleteRolesError;
      } else {
        // Check if the user was previously a member of this team but is inactive
        const { data: existingMember, error: checkError } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', formData.team_id)
          .eq('user_id', userId)
          .eq('is_active', false)
          .maybeSingle();
        
        if (checkError) {
          console.error('Error checking for existing inactive member:', checkError);
          // Continue with creating a new member
        }
        
        if (existingMember) {
          // Reactivate the existing team member
          const { error: reactivateError } = await supabase
            .from('team_members')
            .update({
              is_active: true,
              jersey_number: formData.jersey_number,
              position: formData.position,
              // Update joined_date to current date
              joined_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', existingMember.id);
            
          if (reactivateError) throw reactivateError;
          
          teamMemberId = existingMember.id;
          
          // Delete existing roles for this team member
          const { error: deleteRolesError } = await supabase
            .from('team_member_roles')
            .delete()
            .eq('team_member_id', teamMemberId);
            
          if (deleteRolesError) throw deleteRolesError;
        } else {
          // Create a new team member
          const { data: member, error: memberError } = await supabase
            .from('team_members')
            .insert([{
              team_id: formData.team_id,
              user_id: userId,
              jersey_number: formData.jersey_number,
              position: formData.position,
              joined_date: new Date().toISOString().split('T')[0]
            }])
            .select()
            .single();

          if (memberError) throw memberError;
          teamMemberId = member.id;
        }
      }

      // Add roles
      const roleInserts = formData.roles.map(role => ({
        team_member_id: teamMemberId,
        role
      }));

      const { error: roleError } = await supabase
        .from('team_member_roles')
        .insert(roleInserts);

      if (roleError) throw roleError;

      // Show success message
      toast.success(
        editingMember
          ? 'Team member updated successfully!'
          : (formData.email 
              ? 'Team member added and invitation sent!' 
              : 'Team member added successfully!')
      );

      // Close modal and refresh data
      handleCloseModal();
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'An error occurred');
    }
  };

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
    try {
      console.log('Sending email to:', {
        email: member.user_email,
        team_id: member.team_id,
        team_name: team?.name
      });

      // Determine if this is a new or existing user
      const response = await fetch('/api/admin/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: member.user_email,
          teamId: member.team_id
        }),
      });
      
      const data = await response.json();
      
      // Choose the correct endpoint based on user status
      const endpoint = data.exists 
        ? '/api/admin/notify-team-member' 
        : '/api/admin/invite-user';
      
      const emailResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: member.user_email,
          team_id: member.team_id,
          team_name: team?.name || 'Your Team'
        }),
      });

      console.log('API Response status:', emailResponse.status);
      const emailData = await emailResponse.json();
      console.log('API Response data:', emailData);

      if (!emailResponse.ok) {
        throw new Error(emailData.error || 'Failed to send email');
      }

      toast.success(data.exists 
        ? 'Team notification email sent successfully!' 
        : 'Invitation email sent successfully!');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
    }
  };

  const handleRemoveClick = (member: TeamMember) => {
    setMemberToRemove(member)
    setIsRemoveModalOpen(true)
  }

  const handleRemoveConfirm = async () => {
    if (!memberToRemove) return

    setIsRemoving(true)
    try {
      // Update team member to inactive
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ is_active: false })
        .eq('id', memberToRemove.id)

      if (updateError) throw updateError

      toast.success('Team member removed successfully')
      setIsRemoveModalOpen(false)
      setMemberToRemove(null)
      fetchTeamMembers()
    } catch (error: any) {
      console.error('Error removing team member:', error)
      toast.error(error.message || 'Failed to remove team member')
    } finally {
      setIsRemoving(false)
    }
  }

  const handleRemoveCancel = () => {
    setIsRemoveModalOpen(false)
    setMemberToRemove(null)
  }

  const handleRequestClick = (request: TeamMemberRequest) => {
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
    setPendingRequests(prev => 
      prev.map(request => {
        if (request.id === requestId) {
          const updatedRoles = checked 
            ? [...request.requested_roles, role]
            : request.requested_roles.filter(r => r !== role);
          
          return { ...request, requested_roles: updatedRoles };
        }
        return request;
      })
    );
  };

  const handleApproveDirectly = async (request: TeamMemberRequest) => {
    try {
      setIsProcessingRequest(true);
      
      // Get the playerName from either the edit field or the original request
      const playerName = editPlayerName || request.additional_info?.playerName;
      
      if (request.request_type === 'join') {
        // Create team member record
        const { data: member, error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: request.team_id,
            user_id: request.user_id,
            is_active: true,
            joined_date: new Date().toISOString()
          })
          .select()
          .single();

        if (memberError) throw memberError;

        // Add roles (only the ones that are still checked)
        if (request.requested_roles.length > 0) {
          const roleInserts = request.requested_roles.map(role => ({
            team_member_id: member.id,
            role
          }));

          const { error: rolesError } = await supabase
            .from('team_member_roles')
            .insert(roleInserts);

          if (rolesError) throw rolesError;
          
          // If this is a parent role with a player name, try to create the relationship
          if (request.requested_roles.includes('parent') && playerName) {
            await createParentPlayerRelationship(request.team_id, request.user_id, member.id, playerName);
          }
        }

        // Update request status
        const { error: updateError } = await supabase
          .from('team_member_requests')
          .update({ status: 'approved' })
          .eq('id', request.id);

        if (updateError) throw updateError;
      } else {
        // Handle role request
        // First get the team member record
        const { data: member, error: memberError } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', request.team_id)
          .eq('user_id', request.user_id)
          .single();

        if (memberError) throw memberError;

        // Add new roles (only the ones that are still checked)
        if (request.requested_roles.length > 0) {
          const roleInserts = request.requested_roles.map(role => ({
            team_member_id: member.id,
            role
          }));

          const { error: rolesError } = await supabase
            .from('team_member_roles')
            .insert(roleInserts);

          if (rolesError) throw rolesError;
          
          // If this is a parent role with a player name, try to create the relationship
          if (request.requested_roles.includes('parent') && playerName) {
            await createParentPlayerRelationship(request.team_id, request.user_id, member.id, playerName);
          }
        }

        // Update request status
        const { error: updateError } = await supabase
          .from('team_member_role_requests')
          .update({ status: 'approved' })
          .eq('id', request.id);

        if (updateError) throw updateError;
      }

      // Send email notification
      await fetch('/api/admin/notify-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: request.user_email,
          team_name: request.team_name,
          team_id: request.team_id,
          roles: request.requested_roles,
          request_type: request.request_type
        }),
      });

      toast.success('Request approved successfully');
      fetchTeamMembers();
      fetchPendingRequests();
      setIsRequestModalOpen(false);
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleRejectDirectly = async (request: TeamMemberRequest) => {
    try {
      setIsProcessingRequest(true);
      
      const table = request.request_type === 'join' ? 'team_member_requests' : 'team_member_role_requests';
      const { error } = await supabase
        .from(table)
        .update({ status: 'rejected' })
        .eq('id', request.id);

      if (error) throw error;

      // Send email notification
      await fetch('/api/admin/notify-rejection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: request.user_email,
          team_name: request.team_name,
          roles: request.requested_roles,
          request_type: request.request_type
        }),
      });

      toast.success('Request rejected');
      fetchPendingRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const createParentPlayerRelationship = async (teamId: string, parentUserId: string, parentTeamMemberId: string, playerName: string) => {
    try {
      console.log(`Attempting to create parent-player relationship for player "${playerName}"`);
      
      // Find player team members in the same team
      const { data: playerMembers, error: playerError } = await supabase
        .from('team_members')
        .select(`
          id, 
          user_id,
          team_member_roles(role)
        `)
        .eq('team_id', teamId)
        .not('user_id', 'eq', parentUserId)
        .eq('is_active', true);
      
      if (playerError) {
        console.error('Error fetching potential player matches:', playerError);
        return;
      }
      
      if (!playerMembers || playerMembers.length === 0) {
        console.log('No team members found to match with');
        return;
      }
      
      // Get player team members who have the "player" role
      const playersWithRole = playerMembers.filter(member => 
        member.team_member_roles?.some(r => r.role === 'player')
      );
      
      if (playersWithRole.length === 0) {
        console.log('No team members with player role found');
        return;
      }
      
      // Get user details to match by name
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        console.error('Error fetching user details for players:', response.statusText);
        return;
      }
      const users = await response.json();
      
      if (!Array.isArray(users)) {
        console.error('Invalid response format from /api/admin/users');
        return;
      }
      
      // Find player that matches the name
      const matchedPlayer = playersWithRole.find(member => {
        const user = users.find((u: any) => u.id === member.user_id);
        if (!user) return false;
        
        // Normalize names for comparison
        const normalizedPlayerName = playerName.toLowerCase().trim();
        
        // Check different name fields
        const fullName = user.user_metadata?.full_name || '';
        const firstName = user.user_metadata?.first_name || '';
        const lastName = user.user_metadata?.last_name || '';
        const displayName = user.user_metadata?.name || '';
        
        const possibleNames = [
          fullName.toLowerCase().trim(),
          `${firstName} ${lastName}`.toLowerCase().trim(),
          displayName.toLowerCase().trim()
        ];
        
        // Check for exact match
        return possibleNames.some(name => name === normalizedPlayerName);
      });
      
      if (!matchedPlayer) {
        console.log('No exact matching player found for:', playerName);
        return;
      }
      
      console.log('Found matching player:', matchedPlayer.id);
      
      // Create the parent-player relationship
      const { data: relationship, error: relationshipError } = await supabase
        .from('player_parent_relationships')
        .insert({
          player_team_member_id: matchedPlayer.id,
          parent_team_member_id: parentTeamMemberId,
          relationship_type: 'parent',
          is_primary_contact: true
        })
        .select();
        
      if (relationshipError) {
        console.error('Failed to create parent-player relationship:', relationshipError);
      } else {
        console.log('Successfully created parent-player relationship:', relationship);
        toast.success('Parent-player relationship created');
      }
    } catch (error) {
      console.error('Error in createParentPlayerRelationship:', error);
    }
  };

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
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Pending Requests</h2>
              <div className="flex gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
                  {pendingRequests.filter(r => r.request_type === 'join').length} team request{pendingRequests.filter(r => r.request_type === 'join').length !== 1 ? 's' : ''}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800`}>
                  {pendingRequests.filter(r => r.request_type === 'role').length} role request{pendingRequests.filter(r => r.request_type === 'role').length !== 1 ? 's' : ''}
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
                  {pendingRequests.map(request => (
                    (
                      <tr key={request.id} className={isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{request.user_name}</div>
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{request.user_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{request.team_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${request.request_type === 'join' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{request.request_type === 'join' ? 'Join Team' : 'New Role'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex flex-wrap gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}> 
                            {availableRoles.filter(role => request.request_type === 'join' ? true : request.requested_roles.includes(role)).map(role => (
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
                            {/* Display player name for parent role requests */}
                            {request.requested_roles.includes('parent') && request.additional_info?.playerName && (
                              <div className="w-full mt-1 flex items-center">
                                <span className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} mr-2`}>Player name:</span>
                                <span className="text-sm font-medium">{request.additional_info.playerName}</span>
                              </div>
                            )}
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
                    )
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
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!!editingMember}
                    className={`w-full rounded-md border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-200'
                        : 'bg-white border-gray-300 text-gray-900'
                    } px-3 py-2`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Email {!editingMember && <span className="text-gray-500">(optional)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      onBlur={e => {
                        if ((!editingMember || !hasRealEmail(editingMember)) && e.target.value) {
                          checkExistingUser(e.target.value)
                        }
                      }}
                      disabled={!!editingMember && hasRealEmail(editingMember)}
                      className={`w-full rounded-md border ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-gray-200'
                          : 'bg-white border-gray-300 text-gray-900'
                      } px-3 py-2`}
                    />
                    {isCheckingEmail && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>
                  {!editingMember && existingUserFound && (
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      Existing user found
                    </p>
                  )}
                  {editingMember && existingUserFound && !hasRealEmail(editingMember) && (
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      Existing user found
                    </p>
                  )}
                </div>

                {hasRealEmail(editingMember) && (
                  <div className="col-span-2 text-center">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Name and Email cannot be changed
                    </p>
                  </div>
                )}

                <div className="col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Roles
                  </label>
                  <div className={`flex flex-wrap gap-3 p-3 rounded-md border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-white border-gray-300'
                  } ${roleError ? 'border-red-500' : ''}`}>
                    {availableRoles.map(role => (
                      <label key={role} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.roles.includes(role)}
                          onChange={(e) => {
                            setRoleError(false)
                            setFormData(prev => ({
                              ...prev,
                              roles: e.target.checked
                                ? [...prev.roles, role]
                                : prev.roles.filter(r => r !== role)
                            }))
                          }}
                          className={`rounded ${
                            isDarkMode
                              ? 'border-gray-600 bg-gray-800 text-blue-500'
                              : 'border-gray-300 bg-white text-blue-600'
                          }`}
                        />
                        <span className={`text-sm ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-700'
                        }`}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                  {roleError && (
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                      Please select at least one role
                    </p>
                  )}
                </div>

                {formData.roles.includes('player') && (
                  <>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Jersey Number
                      </label>
                      <input
                        type="text"
                        value={formData.jersey_number}
                        onChange={e => setFormData(prev => ({ ...prev, jersey_number: e.target.value }))}
                        className={`w-full rounded-md border ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-gray-200'
                            : 'bg-white border-gray-300 text-gray-900'
                        } px-3 py-2`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Position
                      </label>
                      <input
                        type="text"
                        value={formData.position}
                        onChange={e => setFormData(prev => ({ ...prev, position: e.target.value }))}
                        className={`w-full rounded-md border ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-gray-200'
                            : 'bg-white border-gray-300 text-gray-900'
                        } px-3 py-2`}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className={`px-4 py-2 rounded-md ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-md ${
                    isDarkMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isInviting ? 'Processing...' : (editingMember ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      <Dialog
        open={isRemoveModalOpen}
        onClose={handleRemoveCancel}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className={`mx-auto w-full max-w-md rounded-lg p-6 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <Dialog.Title className={`text-lg font-medium mb-4 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-900'
            }`}>
              Remove Team Member
            </Dialog.Title>

            <div className={`mb-4 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              <p>Are you sure you want to remove {memberToRemove?.user_name || 'this team member'} from the team?</p>
              <p className="mt-2 text-sm">This action cannot be undone.</p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleRemoveCancel}
                className={`px-4 py-2 rounded-md ${
                  isDarkMode
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveConfirm}
                className={`px-4 py-2 rounded-md ${
                  isDarkMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                disabled={isRemoving}
              >
                {isRemoving ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Request Review Modal */}
      <Dialog
        open={isRequestModalOpen}
        onClose={() => !isProcessingRequest && setIsRequestModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className={`mx-auto max-w-sm rounded-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Dialog.Title className="text-lg font-medium mb-4">
              Review {selectedRequest?.request_type === 'join' ? 'Team Join' : 'Role'} Request
            </Dialog.Title>
            {selectedRequest && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">User</p>
                  <p className="text-sm">{selectedRequest.user_name} ({selectedRequest.user_email})</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Team</p>
                  <p className="text-sm">{selectedRequest.team_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Request Type</p>
                  <p className="text-sm">
                    {selectedRequest.request_type === 'join' ? 'Join Team' : 'New Role'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Requested Roles</p>
                  <p className="text-sm">
                    {selectedRequest.requested_roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ')}
                  </p>
                </div>
                
                {/* Player name field for parent role requests */}
                {selectedRequest.requested_roles.includes('parent') && (
                  <div>
                    <label className="text-sm font-medium">
                      Player Name
                      <input
                        type="text"
                        value={editPlayerName}
                        onChange={(e) => setEditPlayerName(e.target.value)}
                        className={`mt-1 block w-full rounded-md ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'border-gray-300 text-gray-900'
                          } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                        placeholder="Player's name"
                      />
                    </label>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      This will be used to link the parent to their player
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium">Requested On</p>
                  <p className="text-sm">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => handleRejectDirectly(selectedRequest)}
                    disabled={isProcessingRequest}
                    className={`px-4 py-2 rounded-md ${
                      isDarkMode
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-red-100 hover:bg-red-200 text-red-800'
                    }`}
                  >
                    <X className="h-4 w-4 inline-block mr-1" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproveDirectly(selectedRequest)}
                    disabled={isProcessingRequest}
                    className={`px-4 py-2 rounded-md ${
                      isDarkMode
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-green-100 hover:bg-green-200 text-green-800'
                    }`}
                  >
                    <CheckIcon className="h-4 w-4 inline-block mr-1" />
                    Approve
                  </button>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  )
}

export default withAdminAuth(TeamMembersPage, "Team Member Management")