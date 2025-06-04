import { z } from 'zod';
import type { ErrorResponse } from './api';

export interface Counter {
  id: string;
  name: string;
  type: string;
  count: number;
  video_id: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface CounterUpdate {
  id: string;
  count: number;
}

export interface CounterResponse {
  counter: Counter;
}

export interface CounterEvent {
  id: string;
  counter_id: string;
  timestamp: number;
  value: number;
  team_member_id: string | null;
  created_at: string;
}

export interface CounterEventsResponse {
  events: CounterEvent[];
}

export interface CreateCounterEvent {
  counterId: string;
  timestamp: number;
  value: number;
  teamMemberId: string | null;
}

export type CounterApiResponse = CounterResponse | ErrorResponse;
export type CounterEventsApiResponse = CounterEventsResponse | ErrorResponse;

export const counterSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  count: z.number(),
  video_id: z.string().uuid(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional()
});

export const counterEventSchema = z.object({
  id: z.string().uuid(),
  counter_id: z.string().uuid(),
  timestamp: z.number(),
  value: z.number(),
  team_member_id: z.string().uuid().nullable(),
  created_at: z.string().datetime()
});

export const createCounterEventSchema = z.object({
  counterId: z.string().uuid(),
  timestamp: z.number(),
  value: z.number(),
  teamMemberId: z.string().uuid().nullable()
});

export const isCounterEvent = (event: any): event is CounterEvent => {
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof event.id === 'string' &&
    typeof event.counter_id === 'string' &&
    typeof event.timestamp === 'number' &&
    typeof event.value === 'number' &&
    (event.team_member_id === null || typeof event.team_member_id === 'string') &&
    typeof event.created_at === 'string'
  );
}; 