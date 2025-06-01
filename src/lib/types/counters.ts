export interface Counter {
  id: string;
  name: string;
  count: number;
  created_at: string;
  updated_at: string;
}

export interface CounterUpdate {
  id: string;
  count: number;
}

export interface CounterResponse {
  data?: Counter;
  error?: string;
} 