import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { CreateClipApiResponse } from '@/lib/types/clips'
import type { ErrorResponse } from '@/lib/types/auth' // Shared ErrorResponse
import {
  createClipRequestSchema,
  createClipResponseSchema
} from '@/lib/types/clips'
import { z } from 'zod'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateClipApiResponse>
) {
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };
    res.setHeader('Allow', ['POST']);
    return res.status(405).json(errorResponse);
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return res.status(401).json(errorResponse);
    }

    const rawClipData = req.body;
    const validatedClipData = createClipRequestSchema.parse(rawClipData);

    // Add created_by field from authenticated user
    const clipToInsert = {
      ...validatedClipData,
      created_by: user.id
    };

    const { data: clip, error: insertError } = await supabase
      .from('clips')
      .insert(clipToInsert)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating clip:', insertError);
      // Handle specific Supabase errors, e.g., unique constraint violation
      if (insertError.code === '23505') { // Unique violation
        const errorResponse: ErrorResponse = { error: 'Clip already exists or unique constraint failed.' };
        return res.status(409).json(errorResponse); // 409 Conflict
      }
      throw new Error(insertError.message);
    }
    if (!clip) { // Should not happen if insertError is null, but good practice
        throw new Error('Clip creation did not return data.')
    }

    const responseData = { clip };
    createClipResponseSchema.parse(responseData);
    return res.status(201).json(responseData);

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = { 
        error: 'Invalid request body',
        // issues: error.issues 
      };
      return res.status(400).json(errorResponse);
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      // Consider more specific status codes based on error type if possible
      return res.status(500).json(errorResponse);
    }
    console.error('Error in create clip handler:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
} 