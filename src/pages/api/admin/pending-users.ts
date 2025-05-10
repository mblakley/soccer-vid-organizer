import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Starting /api/admin/pending-users handler')
    
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL

    console.log('Environment variables:', { 
      url: url ? 'set' : 'missing', 
      adminKey: adminKey ? 'set' : 'missing' 
    })

    if (!adminKey || !url) {
      return res.status(500).json({ error: 'Missing environment variables' })
    }

    const fullUrl = `${url}/auth/v1/users`
    console.log("Calling Supabase API URL:", fullUrl)
    
    console.log('Sending request to Supabase')
    const response = await fetch(fullUrl, {
      headers: {
        apiKey: adminKey,
        Authorization: `Bearer ${adminKey}`
      }
    })

    console.log('Supabase response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response body:', errorText)
      throw new Error(`Failed to fetch users: ${response.statusText} - ${errorText}`)
    }

    const allUsers = await response.json()
    console.log(`Received ${allUsers?.users?.length || 0} users from Supabase`)
    
    if (!allUsers || !Array.isArray(allUsers.users)) {
      console.warn('No users found or invalid response format')
      return res.status(200).json([])
    }
    
    const pendingUsers = allUsers.users.filter((user: any) => 
      user.user_metadata?.role === 'pending' || 
      (Array.isArray(user.user_metadata?.roles) && user.user_metadata?.roles.includes('pending'))
    )
    
    console.log(`Found ${pendingUsers.length} pending users`)
    res.status(200).json(pendingUsers)
  } catch (error: any) {
    console.error('Error fetching pending users:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch pending users' })
  }
}