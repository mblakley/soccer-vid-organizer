import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { z } from 'zod'

// Define the expected response schema for available roles
const rolesResponseSchema = z.object({
  roles: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })),
})

type RolesApiResponse = z.infer<typeof rolesResponseSchema> | { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RolesApiResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = await getSupabaseClient(req.headers.authorization)

  try {
    // Check user session first, as even fetching roles might require authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Fetch roles using the RPC call
    const { data: rolesData, error: rpcError } = await supabase
      .rpc('get_team_member_roles')

    if (rpcError) {
      console.error('Error fetching roles via RPC:', rpcError)
      throw new Error(rpcError.message)
    }

    if (!rolesData) {
      return res.status(404).json({ error: 'No roles found or RPC returned no data' })
    }

    // Format roles as value/label pairs
    const formattedRoles = rolesData.map((role: string) => ({
      value: role,
      label: role.charAt(0).toUpperCase() + role.slice(1),
    }))

    const responseData = { roles: formattedRoles }
    
    // Validate the response data
    const parsedResponse = rolesResponseSchema.safeParse(responseData)
    if (!parsedResponse.success) {
      console.error('Role list response validation error:', parsedResponse.error.issues)
      return res.status(500).json({ error: 'Response data validation failed for roles list.' })
    }

    return res.status(200).json(parsedResponse.data)

  } catch (error: any) {
    console.error('Error in roles/list handler:', error)
    const statusCode =
      error.message?.includes('Unauthorized') ? 401 :
      500 // Default to 500 for other errors
    return res.status(statusCode).json({ error: error.message || 'An unknown internal server error occurred' })
  }
} 