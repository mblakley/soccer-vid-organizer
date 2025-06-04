import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { z } from 'zod'
import { videoSchema, Video } from '@/lib/types/videos' // Assuming Video type includes all necessary fields

// Define the expected request body schema
// Add all fields that are expected to be passed in the request body for creating a video.
// This should align with what you are inserting into the 'videos' table.
const createVideoRequestSchema = videoSchema.omit({ 
  id: true,
  created_at: true
}).extend({
  // Add any additional fields if needed
});


// Define the expected response schema
const createVideoResponseSchema = z.object({
  video: videoSchema, // Return the full video object
})

type CreateVideoApiResponse = z.infer<typeof createVideoResponseSchema> | { error: string; issues?: z.ZodIssue[] }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateVideoApiResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = await getSupabaseClient(req.headers.authorization)

  try {
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate request body
    const parseResult = createVideoRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid request body', issues: parseResult.error.issues })
    }

    const videoDataToInsert = {
      ...parseResult.data,
      user_id: user.id, // Always associate the video with the authenticated user
      // Ensure all required fields by your 'videos' table are present
      // and default any optional ones if not provided and not defaulted by DB
    };

    // Insert video into Supabase
    const { data, error } = await supabase
      .from('videos')
      .insert([videoDataToInsert])
      .select(`
        id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error inserting video:', error)
      // Check for specific Supabase errors if needed, e.g., unique constraint violation
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'A video with similar properties already exists.'});
      }
      throw new Error(error.message)
    }

    if (!data) {
      console.error('Video data was not returned after insert.');
      throw new Error('Failed to create video, no data returned.');
    }
    
    // Validate the structure of the returned video (optional, but good practice)
    const validatedVideo = videoSchema.parse(data);

    return res.status(201).json({ video: validatedVideo as Video })

  } catch (error: any) {
    console.error('Error in videos/create handler:', error)
    if (error instanceof z.ZodError) { // Handle Zod validation errors for the response itself
        return res.status(500).json({ error: 'Response data validation failed.', issues: error.issues });
    }
    const statusCode = error.message?.includes('Unauthorized') ? 401 : 500
    return res.status(statusCode).json({ error: error.message || 'An unknown internal server error occurred' })
  }
} 