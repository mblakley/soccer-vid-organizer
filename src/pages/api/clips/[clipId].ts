import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type {
  UpdateClipApiResponse,
  DeleteClipApiResponse
} from '@/lib/types/clips'
import type { ErrorResponse } from '@/lib/types/api'
import {
  updateClipRequestSchema,
  updateClipResponseSchema,
  deleteClipResponseSchema
} from '@/lib/types/clips'
import { z } from 'zod'

const queryParamsSchema = z.object({
  clipId: z.string().uuid('Invalid clip ID')
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateClipApiResponse | DeleteClipApiResponse>
) {
  const queryValidation = queryParamsSchema.safeParse(req.query);
  if (!queryValidation.success) {
    const errorResponse: ErrorResponse = { 
      error: 'Invalid clip ID in URL'
    };
    return res.status(400).json(errorResponse);
  }
  const { clipId } = queryValidation.data;

  try {
    const supabase = await getSupabaseClient(req.headers.authorization);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return res.status(401).json(errorResponse);
    }

    if (req.method === 'PUT') {
      const updateData = updateClipRequestSchema.parse(req.body);
      
      const { data: clip, error: updateError } = await supabase
        .from('clips')
        .update(updateData)
        .eq('id', clipId)
        .eq('created_by', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating clip:', updateError);
        if (updateError.code === 'PGRST116') {
            const errorResponse: ErrorResponse = { error: 'Clip not found or not authorized to update' };
            return res.status(404).json(errorResponse);
        }
        throw new Error(updateError.message);
      }
      if (!clip) {
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
        .eq('id', clipId)
        .eq('created_by', user.id);

      if (deleteError) {
        console.error('Error deleting clip:', deleteError);
        throw new Error(deleteError.message);
      }
      
      const responseData = { success: true, id: clipId };
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
        error: 'Invalid request body or parameters'
      };
      return res.status(400).json(errorResponse);
    }
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = { error: error.message };
      return res.status(500).json(errorResponse);
    }
    console.error('Error in clip handler:', error);
    const errorResponse: ErrorResponse = { error: 'An unknown error occurred' };
    return res.status(500).json(errorResponse);
  }
} 