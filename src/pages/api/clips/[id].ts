import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type {
  UpdateClipApiResponse,
  DeleteClipApiResponse
} from '@/lib/types/clips'
import type { ErrorResponse } from '@/lib/types/auth' // Import ErrorResponse from auth types
import {
  updateClipRequestSchema,
  updateClipResponseSchema,
  deleteClipResponseSchema
} from '@/lib/types/clips'
import { z } from 'zod'

const queryParamsSchema = z.object({
  id: z.string().uuid('Invalid clip ID')
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateClipApiResponse | DeleteClipApiResponse> // Union type for response
) {
  const queryValidation = queryParamsSchema.safeParse(req.query);
  if (!queryValidation.success) {
    const errorResponse: ErrorResponse = { 
      error: 'Invalid clip ID in URL',
      // issues: queryValidation.error.issues
    };
    return res.status(400).json(errorResponse);
  }
  const { id } = queryValidation.data;

  try {
    const supabase = getSupabaseClient(req.headers.authorization);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return res.status(401).json(errorResponse);
    }

    // Optional: Check if the clip exists and if the user is authorized to modify it
    // This might involve fetching the clip first to check created_by or team admin status
    // For simplicity, this example proceeds, relying on RLS for data access control primarily.

    if (req.method === 'PUT') {
      const updateData = updateClipRequestSchema.parse(req.body);
      
      const { data: clip, error: updateError } = await supabase
        .from('clips')
        .update(updateData)
        .eq('id', id)
        .eq('created_by', user.id) // Ensure user can only update their own clips (or use RLS)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating clip:', updateError);
        // Check if error is due to not found (e.g. RLS or wrong ID)
        if (updateError.code === 'PGRST116') { // PostgREST error for no rows found
            const errorResponse: ErrorResponse = { error: 'Clip not found or not authorized to update' };
            return res.status(404).json(errorResponse);
        }
        throw new Error(updateError.message);
      }
       if (!clip) { // Should be caught by PGRST116 but as a safeguard
        const errorResponse: ErrorResponse = { error: 'Clip not found or not authorized to update' };
        return res.status(404).json(errorResponse);
      }

      const responseData = { clip };
      updateClipResponseSchema.parse(responseData);
      return res.status(200).json(responseData);

    } else if (req.method === 'DELETE') {
      const { error: deleteError } = await supabase
        .from('clips')
        .delete()
        .eq('id', id)
        .eq('created_by', user.id); // Ensure user can only delete their own clips (or use RLS)

      if (deleteError) {
        console.error('Error deleting clip:', deleteError);
        // Add specific error handling for not found / not authorized if needed
        throw new Error(deleteError.message);
      }
      
      // To confirm deletion, you might check the count of affected rows if the client returns it.
      // Supabase delete doesn't return the deleted record by default.
      const responseData = { success: true, id };
      deleteClipResponseSchema.parse(responseData);
      return res.status(200).json(responseData);

    } else {
      res.setHeader('Allow', ['PUT', 'DELETE']);
      const errorResponse: ErrorResponse = { error: `Method ${req.method} Not Allowed` };
      return res.status(405).json(errorResponse);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = { 
        error: 'Invalid request body or parameters',
        // issues: error.issues
       };
      return res.status(400).json(errorResponse);
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      return res.status(500).json(errorResponse); // Use 500 for general server errors
    }
    console.error('Error in clip [id] handler:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
} 