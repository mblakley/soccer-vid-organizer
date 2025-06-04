import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { TeamMemberTable } from '@/components/teams/TeamMemberTable';
import { PendingRequestsTable } from '@/components/teams/PendingRequestsTable';
import { TeamMemberForm } from '@/components/teams/TeamMemberForm';
import { RemoveTeamMemberModal } from '@/components/teams/RemoveTeamMemberModal';
import { ProcessRequestModal } from '@/components/teams/ProcessRequestModal';
import { apiClient } from '@/lib/api/client';
import { AdminDisplayTeamRequest } from '@/lib/types/admin';
import { TeamMember, TeamMemberFormData } from '@/lib/types/teams';

export default function TeamMembersPage() {
  const router = useRouter();
  // Theme context is not used here, fallback to light mode
  const isDarkMode = false;

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{
    join: AdminDisplayTeamRequest[];
    role: AdminDisplayTeamRequest[];
  }>({ join: [], role: [] });
  const [formData, setFormData] = useState<TeamMemberFormData>({
    name: '',
    email: '',
    jersey_number: '',
    position: '',
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [requestToProcess, setRequestToProcess] = useState<AdminDisplayTeamRequest | null>(null);
  const [expandedPlayers, setExpandedPlayers] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchTeamMembers();
    fetchPendingRequests();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await apiClient.get<{ members: TeamMember[] }>('/api/admin/team-members');
      setTeamMembers(response.members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await apiClient.get<{ requests: { join: AdminDisplayTeamRequest[]; role: AdminDisplayTeamRequest[] } }>('/api/admin/team-requests');
      setPendingRequests(response.requests);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: TeamMemberFormData) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (role: string) => {
    setSelectedRoles((prev: string[]) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiClient.post('/api/admin/team-members', {
        ...formData,
        roles: selectedRoles,
      });

      setFormData({
        name: '',
        email: '',
        jersey_number: '',
        position: '',
      });
      setSelectedRoles([]);
      fetchTeamMembers();
    } catch (error) {
      console.error('Error adding team member:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveClick = (member: TeamMember) => {
    setMemberToRemove(member);
  };

  const handleRemoveConfirm = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);

    try {
      await apiClient.delete(`/api/admin/team-members/${memberToRemove.team_id}/${memberToRemove.user_id}`);

      setMemberToRemove(null);
      fetchTeamMembers();
    } catch (error) {
      console.error('Error removing team member:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRequestClick = (request: AdminDisplayTeamRequest) => {
    setRequestToProcess(request);
  };

  const handleRequestApprove = async () => {
    if (!requestToProcess) return;
    setIsProcessing(true);

    try {
      await apiClient.post('/api/admin/team-requests/approve', {
        request_id: requestToProcess.id,
      });

      setRequestToProcess(null);
      fetchPendingRequests();
      fetchTeamMembers();
    } catch (error) {
      console.error('Error approving request:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestReject = async () => {
    if (!requestToProcess) return;
    setIsProcessing(true);

    try {
      await apiClient.post('/api/admin/team-requests/reject', {
        request_id: requestToProcess.id,
      });

      setRequestToProcess(null);
      fetchPendingRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTogglePlayerExpansion = (playerId: string) => {
    setExpandedPlayers(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Team Members</h1>
        <button
          onClick={() => router.back()}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            isDarkMode
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Back
        </button>
      </div>

      <PendingRequestsTable
        pendingRequests={pendingRequests}
        isDarkMode={isDarkMode}
        onRequestClick={handleRequestClick}
      />

      <div className={`mb-8 p-6 rounded-lg shadow ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h2 className="text-xl font-semibold mb-4">Add Team Member</h2>
        <TeamMemberForm
          formData={formData}
          isDarkMode={isDarkMode}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onInputChange={handleInputChange}
          onRoleChange={handleRoleChange}
          selectedRoles={selectedRoles}
        />
      </div>

      <TeamMemberTable
        teamMembers={teamMembers}
        isDarkMode={isDarkMode}
        onEdit={() => {}}
        onRemove={handleRemoveClick}
        onSendEmail={() => {}}
        parentChildRelationships={{}}
        expandedPlayers={expandedPlayers}
        onTogglePlayerExpansion={handleTogglePlayerExpansion}
      />

      {memberToRemove && (
        <RemoveTeamMemberModal
          member={memberToRemove}
          isOpen={!!memberToRemove}
          onClose={() => setMemberToRemove(null)}
          onConfirm={handleRemoveConfirm}
          isRemoving={isRemoving}
          isDarkMode={isDarkMode}
        />
      )}

      {requestToProcess && (
        <ProcessRequestModal
          request={requestToProcess}
          isOpen={!!requestToProcess}
          onClose={() => setRequestToProcess(null)}
          onApprove={handleRequestApprove}
          onReject={handleRequestReject}
          isProcessing={isProcessing}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
} 