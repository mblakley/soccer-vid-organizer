import { z } from 'zod'
import type { ErrorResponse } from './auth'

export const teamSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  club_affiliation: z.string().optional(),
  season: z.string().optional(),
  age_group: z.string().optional(),
  gender: z.string().optional(),
  additional_info: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  member_count: z.number().optional()
})

export const teamMemberSchema = z.object({
  id: z.string().uuid(),
  team_id: z.string().uuid(),
  user_id: z.string().uuid(),
  roles: z.array(z.string()),
  jersey_number: z.string().optional(),
  position: z.string().optional(),
  joined_date: z.string().datetime().optional(),
  left_date: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
  user_email: z.string().email().optional(),
  user_name: z.string().optional()
})

export const teamRequestSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  team_id: z.string().uuid(),
  requested_roles: z.array(z.string()),
  status: z.enum(['pending', 'approved', 'rejected']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  reviewed_by: z.string().uuid().optional(),
  reviewed_at: z.string().datetime().optional(),
  user: z
    .object({
      email: z.string().email().optional(),
      full_name: z.string().optional()
    })
    .optional(),
  team: teamSchema.pick({ name: true }).optional()
})

export const teamsResponseSchema = z.object({
  teams: z.array(teamSchema)
})

export const teamMembersResponseSchema = z.object({
  members: z.array(teamMemberSchema)
})

export const teamRequestsResponseSchema = z.object({
  requests: z.array(teamRequestSchema)
})

export type Team = z.infer<typeof teamSchema>
export type TeamMember = z.infer<typeof teamMemberSchema>
export type TeamRequest = z.infer<typeof teamRequestSchema>

export type TeamsResponse = z.infer<typeof teamsResponseSchema>
export type TeamMembersResponse = z.infer<typeof teamMembersResponseSchema>
export type TeamRequestsResponse = z.infer<typeof teamRequestsResponseSchema>

export type TeamsApiResponse = TeamsResponse | ErrorResponse
export type TeamMembersApiResponse = TeamMembersResponse | ErrorResponse
export type TeamRequestsApiResponse = TeamRequestsResponse | ErrorResponse

export const listTeamsResponseSchema = z.object({
  teams: z.array(teamSchema.pick({ id: true, name: true }))
})

export type ListTeamsResponse = z.infer<typeof listTeamsResponseSchema>
export type ListTeamsApiResponse = ListTeamsResponse | ErrorResponse

export const teamRolesResponseSchema = z.object({
  userRoles: z.array(z.string()),
  pendingRoles: z.array(z.string()),
})

export type TeamRolesResponse = z.infer<typeof teamRolesResponseSchema>
export type TeamRolesApiResponse = TeamRolesResponse | ErrorResponse

export const requestRoleSchema = z.object({
  requestedRole: z.string(),
  teamId: z.string().uuid(),
  playerName: z.string().optional()
})

export const requestRoleResponseSchema = z.object({
  success: z.boolean(),
  roleRequest: teamRequestSchema
})

export type RequestRoleRequest = z.infer<typeof requestRoleSchema>
export type RequestRoleResponse = z.infer<typeof requestRoleResponseSchema>
export type RequestRoleApiResponse = RequestRoleResponse | ErrorResponse

export const requestTeamRequestSchema = z.object({
  team_name: z.string().min(1, 'Team name is required'),
  description: z.string().optional()
});

export const requestTeamResponseSchema = z.object({
  request: teamRequestSchema 
});

export type RequestTeamRequest = z.infer<typeof requestTeamRequestSchema>;
export type RequestTeamResponse = z.infer<typeof requestTeamResponseSchema>;
export type RequestTeamApiResponse = RequestTeamResponse | ErrorResponse;

export const requestJoinTeamRequestSchema = z.object({
  team_id: z.string().uuid('Invalid team ID'),
  requested_roles: z.array(z.string()).min(1, 'At least one role must be requested')
  // We might want to validate the actual role strings against an enum if they are predefined
});

export const requestJoinTeamResponseSchema = z.object({
  // This assumes the response is the created team_member_request record
  request: teamRequestSchema 
});

export type RequestJoinTeamRequest = z.infer<typeof requestJoinTeamRequestSchema>;
export type RequestJoinTeamResponse = z.infer<typeof requestJoinTeamResponseSchema>;
export type RequestJoinTeamApiResponse = RequestJoinTeamResponse | ErrorResponse;

export const availableTeamSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable() // Assuming description can be null
});

export const availableTeamsResponseSchema = z.object({
  teams: z.array(availableTeamSchema)
});

export type AvailableTeam = z.infer<typeof availableTeamSchema>;
export type AvailableTeamsResponse = z.infer<typeof availableTeamsResponseSchema>;
export type AvailableTeamsApiResponse = AvailableTeamsResponse | ErrorResponse; 