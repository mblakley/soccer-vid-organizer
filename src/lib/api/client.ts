import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

class ApiClient {
  private async getAuthHeader() {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || null;

    if (!token) {
      // Optionally handle the case where there's no token differently,
      // e.g., by not setting the Authorization header or throwing an error earlier.
      // For now, it will result in 'Bearer null' which the backend should reject.
      console.warn("[ApiClient] No auth token found in session.");
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private async fetchWithAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
    const authHeaders = await this.getAuthHeader();
    const response = await fetch(path, {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.headers || {})
      }
    });
    
    if (response.status === 401) {
      // Specific handling for unauthorized, perhaps redirect to login or refresh token
      // For now, let the generic error handler below catch it after .json() fails or is attempted.
      // Or, throw a more specific error:
      throw new Error(`API request failed: Unauthorized (401)`);
    }

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text(); // Try to get more details from the response body
      } catch (e) { /* ignore if body can't be read */ }
      throw new Error(`API request failed: ${response.statusText} (status: ${response.status}) ${errorBody ? `- ${errorBody}` : ''}`);
    }
    
    // Handle cases where response might be empty (e.g., 204 No Content)
    const contentType = response.headers.get("content-type");
    if (response.status === 204 || !contentType || !contentType.includes("application/json")) {
      return {} as T; // Return an empty object or appropriate type for non-JSON/empty responses
    }
    
    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.fetchWithAuth<T>(path)
  }

  async post<T>(path: string, body: any = {}): Promise<T> {
    return this.fetchWithAuth<T>(path, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  async put<T>(path: string, body: any): Promise<T> {
    return this.fetchWithAuth<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  }

  async delete<T>(path: string): Promise<T> {
    return this.fetchWithAuth<T>(path, {
      method: 'DELETE'
    })
  }
}

export const apiClient = new ApiClient() 