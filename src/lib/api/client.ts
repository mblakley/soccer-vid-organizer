class ApiClient {
  private getAuthHeader() {
    return {
      'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
      'Content-Type': 'application/json'
    }
  }

  private async fetchWithAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(path, {
      ...options,
      headers: {
        ...this.getAuthHeader(),
        ...(options.headers || {})
      }
    })
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }
    
    return response.json()
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