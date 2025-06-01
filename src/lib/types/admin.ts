import { z } from 'zod';
import type { ErrorResponse } from './auth'; // Assuming ErrorResponse is in auth.ts
import { teamSchema } from './teams'; // Import teamSchema
import { leagueSchema } from './leagues'; // Import leagueSchema
import { gameSchema } from './games'; // Import gameSchema
import { teamMemberSchema } from '@/lib/types/teams'; // Import teamMemberSchema
import { teamRequestSchema } from './teams'; // Import teamRequestSchema
import { userSchema } from './users'; // Import userSchema
import { tournamentSchema, tournamentStatusSchema } from './tournaments'; // Import tournamentSchema and tournamentStatusSchema

// For GET /api/admin/time-metrics
export const timeMetricsResponseSchema = z.object({
  newUsers: z.number().int().nonnegative(),
  newClips: z.number().int().nonnegative(),
  newComments: z.number().int().nonnegative(),
  uniqueLogins: z.number().int().nonnegative(),
});

export type TimeMetricsResponse = z.infer<typeof timeMetricsResponseSchema>;
export type TimeMetricsApiResponse = TimeMetricsResponse | ErrorResponse;

// For PUT /api/admin/team-requests (Approve/Reject Team Request)
export const processTeamRequestSchema = z.object({
  id: z.string().uuid('Invalid team request ID'),
  action: z.enum(['approve', 'reject']),
  review_notes: z.string().optional(),
});

export const approveTeamResponseSchema = z.object({
  success: z.boolean(),
  team: teamSchema, // Assuming teamSchema is imported from ../teams
});

export const rejectTeamResponseSchema = z.object({
  success: z.boolean(),
});

export type ProcessTeamRequest = z.infer<typeof processTeamRequestSchema>;
export type ApproveTeamResponse = z.infer<typeof approveTeamResponseSchema>;
export type RejectTeamResponse = z.infer<typeof rejectTeamResponseSchema>;

// Union type for the response of the PUT endpoint
export type ProcessTeamRequestApiResponse = ApproveTeamResponse | RejectTeamResponse | ErrorResponse;

// For POST /api/admin/notify-approval
export const notifyApprovalRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  team_name: z.string(),
  team_id: z.string().uuid('Invalid team ID'),
  roles: z.array(z.string()).optional(),      // Included as per original body, though not used in sendTeamNotificationEmail
  request_type: z.string().optional(), // Included as per original body, though not used
});

export const notifyApprovalResponseSchema = z.object({
  message: z.string(),
  messageId: z.string().optional(), // Assuming messageId might be returned from email client
});

export type NotifyApprovalRequest = z.infer<typeof notifyApprovalRequestSchema>;
export type NotifyApprovalResponse = z.infer<typeof notifyApprovalResponseSchema>;
export type NotifyApprovalApiResponse = NotifyApprovalResponse | ErrorResponse;

// For POST /api/admin/notify-rejection
export const notifyRejectionRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  team_name: z.string(),
  roles: z.array(z.string()).optional(),      // Included as per original body
  request_type: z.string().optional(), // Included as per original body
  // team_id is not in the original req.body for rejection but sendTeamNotificationEmail takes it
});

export const notifyRejectionResponseSchema = z.object({
  message: z.string(),
  messageId: z.string().optional(),
});

export type NotifyRejectionRequest = z.infer<typeof notifyRejectionRequestSchema>;
export type NotifyRejectionResponse = z.infer<typeof notifyRejectionResponseSchema>;
export type NotifyRejectionApiResponse = NotifyRejectionResponse | ErrorResponse;

// For POST /api/admin/check-user
export const checkUserRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  teamId: z.string().uuid('Invalid team ID')
});

export const checkUserResponseSchema = z.object({
  exists: z.boolean(),
  isTeamMember: z.boolean(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string()
  }).optional(),
  error: z.string().optional() // Added to allow for errors in the response body itself if needed
});

export type CheckUserRequest = z.infer<typeof checkUserRequestSchema>;
export type CheckUserResponse = z.infer<typeof checkUserResponseSchema>;
export type CheckUserApiResponse = CheckUserResponse | ErrorResponse;

// For POST /api/admin/create-user
export const adminCreateUserRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(1, 'Display name is required'),
  metadata: z.record(z.any()).optional() // For additional user_metadata
});

// Using Supabase User type for the user object in response, or a custom one if needed
export const adminCreateUserResponseSchema = z.object({
  user: z.any(), // This should ideally be a more specific User schema
  error: z.string().optional()
});

export type AdminCreateUserRequest = z.infer<typeof adminCreateUserRequestSchema>;
export type AdminCreateUserResponse = z.infer<typeof adminCreateUserResponseSchema>;
export type AdminCreateUserApiResponse = AdminCreateUserResponse | ErrorResponse;

// For POST /api/admin/disable-user
export const disableUserRequestSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
  disabled: z.boolean()
});

export const disableUserResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional()
});

export type DisableUserRequest = z.infer<typeof disableUserRequestSchema>;
export type DisableUserResponse = z.infer<typeof disableUserResponseSchema>;
export type DisableUserApiResponse = DisableUserResponse | ErrorResponse;

// For POST /api/admin/invite-user
export const inviteUserRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  team_id: z.string().uuid('Invalid team ID'),
  team_name: z.string().min(1, 'Team name is required')
});

export const inviteUserResponseSchema = z.object({
  message: z.string(),
  messageId: z.string().optional(), // From email client
  error: z.string().optional()
});

export type InviteUserRequest = z.infer<typeof inviteUserRequestSchema>;
export type InviteUserResponse = z.infer<typeof inviteUserResponseSchema>;
export type InviteUserApiResponse = InviteUserResponse | ErrorResponse;

// For POST /api/admin/notify-team-member
export const notifyTeamMemberRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  team_id: z.string().uuid('Invalid team ID'),
  team_name: z.string().min(1, 'Team name is required')
});

export const notifyTeamMemberResponseSchema = z.object({
  message: z.string(),
  messageId: z.string().optional(), // From email client
  error: z.string().optional()
});

export type NotifyTeamMemberRequest = z.infer<typeof notifyTeamMemberRequestSchema>;
export type NotifyTeamMemberResponse = z.infer<typeof notifyTeamMemberResponseSchema>;
export type NotifyTeamMemberApiResponse = NotifyTeamMemberResponse | ErrorResponse;

// For POST /api/admin/remove-user
export const removeUserRequestSchema = z.object({
  id: z.string().uuid('Invalid user ID')
});

export const removeUserResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional()
});

export type RemoveUserRequest = z.infer<typeof removeUserRequestSchema>;
export type RemoveUserResponse = z.infer<typeof removeUserResponseSchema>;
export type RemoveUserApiResponse = RemoveUserResponse | ErrorResponse;

// For POST /api/admin/team-members (Add Team Member)
export const addTeamMemberRequestSchema = z.object({
  team_id: z.string().uuid('Invalid team ID'),
  user_id: z.string().uuid('Invalid user ID'),
  role: z.string().min(1, 'Role is required') // Or z.enum if roles are predefined
});

// Assuming teamMemberSchema is available from team types
// import { teamMemberSchema } from '../teams'; 
export const addTeamMemberResponseSchema = z.object({
  member: z.any(), // Replace z.any() with teamMemberSchema if imported and applicable
  error: z.string().optional()
});

export type AddTeamMemberRequest = z.infer<typeof addTeamMemberRequestSchema>;
export type AddTeamMemberResponse = z.infer<typeof addTeamMemberResponseSchema>;
export type AddTeamMemberApiResponse = AddTeamMemberResponse | ErrorResponse;

// For PUT /api/admin/team-members (Update Team Member)
export const updateTeamMemberRequestSchema = z.object({
  id: z.string().uuid('Invalid team member ID'),
  role: z.string().min(1, 'Role is required') // Or z.enum
});

export const updateTeamMemberResponseSchema = z.object({
  member: z.any(), // Replace z.any() with teamMemberSchema
  error: z.string().optional()
});

export type UpdateTeamMemberRequest = z.infer<typeof updateTeamMemberRequestSchema>;
export type UpdateTeamMemberResponse = z.infer<typeof updateTeamMemberResponseSchema>;
export type UpdateTeamMemberApiResponse = UpdateTeamMemberResponse | ErrorResponse;

// For DELETE /api/admin/team-members (Remove Team Member)
export const removeTeamMemberRequestSchema = z.object({
  id: z.string().uuid('Invalid team member ID')
});

export const removeTeamMemberResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional()
});

export type RemoveTeamMemberRequest = z.infer<typeof removeTeamMemberRequestSchema>;
export type RemoveTeamMemberResponse = z.infer<typeof removeTeamMemberResponseSchema>;
export type RemoveTeamMemberApiResponse = RemoveTeamMemberResponse | ErrorResponse;

// For GET /api/admin/dashboard-stats
export const dashboardStatsDataSchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  adminUsers: z.number().int().nonnegative(),
  disabledUsers: z.number().int().nonnegative(),
  totalTeams: z.number().int().nonnegative(),
  activeTeams: z.number().int().nonnegative(), // Assuming active teams are a subset of total teams
  totalTeamMembers: z.number().int().nonnegative(),
  pendingJoinRequests: z.number().int().nonnegative(),
  pendingRoleRequests: z.number().int().nonnegative(),
  totalLeagues: z.number().int().nonnegative(),
  totalTournaments: z.number().int().nonnegative(),
});

export const dashboardStatsResponseSchema = z.object({
  // The API might return the stats directly or nested under a key, e.g., 'stats'
  // Assuming it returns the flat object directly for now, matching the client-side state
  totalUsers: z.number().int().nonnegative(),
  adminUsers: z.number().int().nonnegative(),
  disabledUsers: z.number().int().nonnegative(),
  totalTeams: z.number().int().nonnegative(),
  activeTeams: z.number().int().nonnegative(),
  totalTeamMembers: z.number().int().nonnegative(),
  pendingJoinRequests: z.number().int().nonnegative(),
  pendingRoleRequests: z.number().int().nonnegative(),
  totalLeagues: z.number().int().nonnegative(),
  totalTournaments: z.number().int().nonnegative(),
  // If the API wraps it, it would be: stats: dashboardStatsDataSchema
});

export type DashboardStatsData = z.infer<typeof dashboardStatsDataSchema>;
export type DashboardStatsResponse = z.infer<typeof dashboardStatsResponseSchema>;
export type DashboardStatsApiResponse = DashboardStatsResponse | ErrorResponse;

// For GET /api/admin/leagues/list
export const adminListLeaguesResponseSchema = z.object({
  leagues: z.array(leagueSchema), // Assuming leagueSchema is imported from './leagues'
});
export type AdminListLeaguesResponse = z.infer<typeof adminListLeaguesResponseSchema>;
export type AdminListLeaguesApiResponse = AdminListLeaguesResponse | ErrorResponse;

// For DELETE /api/admin/leagues/:id/delete and /api/admin/games/:id/delete
// This can be a generic delete response if the message is similar
export const adminDeleteResponseSchema = z.object({
  message: z.string().optional(), // Optional message, success is implied by 2xx status
  success: z.boolean().optional(), // Explicit success boolean
});
export type AdminDeleteResponse = z.infer<typeof adminDeleteResponseSchema>;
export type AdminDeleteApiResponse = AdminDeleteResponse | ErrorResponse;

// For GET /api/admin/leagues/:leagueId/games
export const adminLeagueGamesResponseSchema = z.object({
  games: z.array(gameSchema), // Assuming gameSchema is imported from './games'
  availableDivisions: z.array(z.string()),
});
export type AdminLeagueGamesResponse = z.infer<typeof adminLeagueGamesResponseSchema>;
export type AdminLeagueGamesApiResponse = AdminLeagueGamesResponse | ErrorResponse;

// For POST /api/admin/teams/create
export const adminCreateTeamRequestSchema = teamSchema.omit({ id: true, created_at: true, updated_at: true, member_count: true }); // Admin provides all other details
export const adminCreateTeamResponseSchema = z.object({
  team: teamSchema,
});
export type AdminCreateTeamRequest = z.infer<typeof adminCreateTeamRequestSchema>;
export type AdminCreateTeamResponse = z.infer<typeof adminCreateTeamResponseSchema>;
export type AdminCreateTeamApiResponse = AdminCreateTeamResponse | ErrorResponse;

// For PUT /api/admin/teams/:id/update
export const adminUpdateTeamRequestSchema = teamSchema.partial().omit({ id: true, created_at: true, updated_at: true, member_count: true }); // All fields optional for update, except id which is in path
export const adminUpdateTeamResponseSchema = z.object({
  team: teamSchema,
});
export type AdminUpdateTeamRequest = z.infer<typeof adminUpdateTeamRequestSchema>;
export type AdminUpdateTeamResponse = z.infer<typeof adminUpdateTeamResponseSchema>;
export type AdminUpdateTeamApiResponse = AdminUpdateTeamResponse | ErrorResponse;

// Note: AdminListTeamsResponse and AdminDeleteResponse (for teams) are already defined or covered by generic AdminDeleteResponse
// If AdminListTeamsResponse isn't defined yet, it would be:
// export const adminListTeamsResponseSchema = z.object({ teams: z.array(teamSchema) });
// export type AdminListTeamsResponse = z.infer<typeof adminListTeamsResponseSchema>;
// export type AdminListTeamsApiResponse = AdminListTeamsResponse | ErrorResponse;
// It was defined above as using leagueSchema, that was a mistake. It should use teamSchema for /api/admin/teams/list
// Correcting AdminListLeaguesResponse to AdminListTeamsResponse (if it was meant for teams)
// The previous AdminListLeaguesResponse using leagueSchema is correct for /api/admin/leagues/list.
// Let's assume an AdminListTeamsResponse is needed for /api/admin/teams/list using teamSchema.

export const adminListTeamsResponseForTeamsPageSchema = z.object({ // Specific name to avoid collision if generic one exists
  teams: z.array(teamSchema),
});
export type AdminListTeamsResponseForTeamsPage = z.infer<typeof adminListTeamsResponseForTeamsPageSchema>;
export type AdminListTeamsApiResponseForTeamsPage = AdminListTeamsResponseForTeamsPage | ErrorResponse;


// For GET /api/admin/teams/:teamId/members
// This will return team members with their user details embedded or referenced.
// We can use the existing TeamMember type from '@/lib/types/teams' which includes user_email and user_name.
export const adminTeamMembersResponseSchema = z.object({
  members: z.array(teamMemberSchema), // teamMemberSchema from '@/lib/types/teams'
});
export type AdminTeamMembersResponse = z.infer<typeof adminTeamMembersResponseSchema>;
export type AdminTeamMembersApiResponse = AdminTeamMembersResponse | ErrorResponse;

// For GET /api/admin/teams/:teamId (get single team details)
export const adminTeamResponseSchema = z.object({
  team: teamSchema, // from ./teams
});
export type AdminTeamResponse = z.infer<typeof adminTeamResponseSchema>;
export type AdminTeamApiResponse = AdminTeamResponse | ErrorResponse;

// For GET /api/admin/teams/:teamId/relationships
export const relationshipSchema = z.object({
  player_team_member_id: z.string().uuid(),
  parent_team_member_id: z.string().uuid(),
  team_id: z.string().uuid().nullable(), // team_id might be on the relationship itself
  user_id: z.string().uuid().optional(), // user_id of the parent, if needed directly
});
export type Relationship = z.infer<typeof relationshipSchema>;

export const adminTeamRelationshipsResponseSchema = z.object({
  relationships: z.array(relationshipSchema),
});
export type AdminTeamRelationshipsResponse = z.infer<typeof adminTeamRelationshipsResponseSchema>;
export type AdminTeamRelationshipsApiResponse = AdminTeamRelationshipsResponse | ErrorResponse;

// For GET /api/admin/roles/list
export const roleSchema = z.object({
  name: z.string(), // Or an ID if roles have more properties
  // description: z.string().optional(),
});
export type Role = z.infer<typeof roleSchema>;

export const adminListRolesResponseSchema = z.object({
  roles: z.array(roleSchema),
});
export type AdminListRolesResponse = z.infer<typeof adminListRolesResponseSchema>;
export type AdminListRolesApiResponse = AdminListRolesResponse | ErrorResponse;

// For GET /api/admin/pending-requests (or similar endpoint for team member requests)
export const adminDisplayTeamRequestSchema = teamRequestSchema.extend({
  user_email: z.string().email().optional(),
  user_name: z.string().optional(),
  team_name: z.string().optional(), // If the team name is joined directly
  request_type: z.enum(['join', 'role']).optional(), // If this is determined by the API
  // Include nested user/team details if provided by the API
  user: userSchema.pick({ email: true, user_metadata: true }).optional(), // Example: picking parts of the main userSchema
  team: teamSchema.pick({ name: true }).optional(), // Example: picking parts of the main teamSchema
  // requested_role is already in teamRequestSchema as requested_roles: z.array(z.string())
  // additional_info can be kept as part of the base teamRequestSchema if it has z.any() or a defined schema there.
  // If additional_info specific to admin display is needed, add it here.
  // For example, if the UI expects a specific structure for additional_info.playerName:
  additional_info: z.object({
    playerName: z.string().optional(),
    // other fields from original additional_info if any
  }).passthrough().optional().nullable(), // passthrough() allows other fields not explicitly defined
});

export type AdminDisplayTeamRequest = z.infer<typeof adminDisplayTeamRequestSchema>;

export const adminPendingRequestsResponseSchema = z.object({
  // Assuming the API returns them categorized or the client categorizes them.
  // If categorized by API:
  // joinRequests: z.array(adminDisplayTeamRequestSchema),
  // roleRequests: z.array(adminDisplayTeamRequestSchema),
  // If flat list to be categorized by client:
  requests: z.array(adminDisplayTeamRequestSchema),
});

export type AdminPendingRequestsResponse = z.infer<typeof adminPendingRequestsResponseSchema>;
export type AdminPendingRequestsApiResponse = AdminPendingRequestsResponse | ErrorResponse;

// For POST /api/admin/team-members/manage (Add/Update Team Member)
// This schema is more comprehensive to match the FormData in team-members.tsx
export const adminManageTeamMemberRequestSchema = z.object({
  team_id: z.string().uuid(),
  user_id: z.string().uuid().optional(), // Optional: only for existing users being added or updated
  email: z.string().email().optional(),   // Optional: for inviting new users or identifying existing ones
  name: z.string().optional(),          // Optional: for new users or updating display name
  roles: z.array(z.string()).min(1, 'At least one role is required'),
  jersey_number: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  // Supabase might handle joined_date automatically, or it can be set here.
  // is_active is usually managed by add/remove actions, not directly in an update form like this.
});
export type AdminManageTeamMemberRequest = z.infer<typeof adminManageTeamMemberRequestSchema>;

// Response could be the updated/created team member
export const adminManageTeamMemberResponseSchema = z.object({
  member: teamMemberSchema, // from ./teams
});
export type AdminManageTeamMemberResponse = z.infer<typeof adminManageTeamMemberResponseSchema>;
export type AdminManageTeamMemberApiResponse = AdminManageTeamMemberResponse | ErrorResponse;

// For GET /api/admin/tournaments/list (or /api/tournaments/list if admin uses general endpoint)
export const adminListTournamentsResponseSchema = z.object({
  tournaments: z.array(tournamentSchema), // Assuming tournamentSchema is imported from './tournaments'
  message: z.string().optional(), // message was in the local interface
});
export type AdminListTournamentsResponse = z.infer<typeof adminListTournamentsResponseSchema>;
export type AdminListTournamentsApiResponse = AdminListTournamentsResponse | ErrorResponse;

// For DELETE /api/admin/tournaments/:id/delete (or /api/tournaments/:id if admin uses general endpoint)
// Can use the generic AdminDeleteResponse if the shape { message?: string, success?: boolean } is suitable.
// If a specific shape is needed, define AdminDeleteTournamentResponse.
// The local interface was: interface DeleteTournamentResponse { message?: string; }
// This matches the optional message in AdminDeleteResponseSchema. So, AdminDeleteResponse can be reused.
// However, to be explicit for this context, defining AdminDeleteTournamentResponse:
export const adminDeleteTournamentResponseSchema = z.object({
  message: z.string().optional(),
  success: z.boolean().optional(), // Adding success for consistency with AdminDeleteResponse
});
export type AdminDeleteTournamentResponse = z.infer<typeof adminDeleteTournamentResponseSchema>;
export type AdminDeleteTournamentApiResponse = AdminDeleteTournamentResponse | ErrorResponse;

// For POST /api/admin/tournaments/create
// The request can be a partial tournament, but name, start/end dates are typically required by business logic.
// The schema should reflect what the API endpoint strictly requires for creation.
// For now, mirroring Partial<Tournament> but highlighting essential fields.
export const adminCreateTournamentRequestSchema = tournamentSchema.partial().extend({
  name: z.string().min(1, 'Tournament name is required'),
  start_date: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  end_date: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  status: tournamentStatusSchema.optional().default('upcoming'), // Default status
});
export type AdminCreateTournamentRequest = z.infer<typeof adminCreateTournamentRequestSchema>;

export const adminCreateTournamentResponseSchema = z.object({
  tournament: tournamentSchema,
  message: z.string().optional(),
});
export type AdminCreateTournamentResponse = z.infer<typeof adminCreateTournamentResponseSchema>;
export type AdminCreateTournamentApiResponse = AdminCreateTournamentResponse | ErrorResponse;

// For GET /api/admin/tournaments/:id (fetch single tournament for editing)
export const adminGetTournamentResponseSchema = z.object({
  tournament: tournamentSchema.optional(), // Tournament might not be found
  message: z.string().optional(),
});
export type AdminGetTournamentResponse = z.infer<typeof adminGetTournamentResponseSchema>;
export type AdminGetTournamentApiResponse = AdminGetTournamentResponse | ErrorResponse;

// For PUT /api/admin/tournaments/:id (update tournament)
// Request can be a partial tournament. The schema should reflect only editable fields.
export const adminUpdateTournamentRequestSchema = tournamentSchema.partial().omit({ id: true, created_at: true, updated_at: true }); // id, created_at, updated_at not directly updatable via form
export type AdminUpdateTournamentRequest = z.infer<typeof adminUpdateTournamentRequestSchema>;

export const adminUpdateTournamentResponseSchema = z.object({
  tournament: tournamentSchema,
  message: z.string().optional(),
});
export type AdminUpdateTournamentResponse = z.infer<typeof adminUpdateTournamentResponseSchema>;
export type AdminUpdateTournamentApiResponse = AdminUpdateTournamentResponse | ErrorResponse;

// Add other admin-specific types here as needed 