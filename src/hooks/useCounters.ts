import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { CountTracker, CounterType } from '@/components/counters/CounterInterfaces';
import { 
  CounterEvent, 
  CreateCounterEvent, 
  isCounterEvent, 
  CounterApiResponse, 
  CounterEventsApiResponse,
  Counter 
} from '@/lib/types/counters';
import { toast } from 'react-toastify';

interface UseCountersOptions {
  userId: string;
  videoId?: string;
  onError?: (message: string) => void;
}

export function useCounters({ userId, videoId, onError }: UseCountersOptions) {
  const [counters, setCounters] = useState<CountTracker[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterType, setNewCounterType] = useState<CounterType>('standard');
  const [newCounterPlayers, setNewCounterPlayers] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleError = useCallback((message: string, error?: any) => {
    console.error(message, error);
    if (onError) {
      onError(message);
    } else {
      toast.error(message);
    }
  }, [onError]);

  // Fetch counters for the current video
  const fetchCountersForVideo = useCallback(async () => {
    try {
      if (!videoId) {
        setCounters([]);
        return;
      }
      setLoading(true);
      const resp = await apiClient.get<CounterApiResponse>(`/api/counters?videoId=${videoId}`);
      if ('error' in resp) throw resp.error;
      const countersData = 'counter' in resp ? [resp.counter] : [];
      
      // For each counter, fetch its events
      const countersWithEvents = await Promise.all(
        countersData.map(async (counter: Counter) => {
          const eventsResp = await apiClient.get<CounterEventsApiResponse>(`/api/counter-events?counterId=${counter.id}`);
          if ('error' in eventsResp) throw eventsResp.error;
          const events = 'events' in eventsResp ? eventsResp.events : [];
          
          const mappedCounter: CountTracker = {
            id: counter.id,
            name: counter.name,
            count: counter.count,
            timestamps: events.map(e => e.timestamp),
            type: counter.type as CounterType,
          };
          if (counter.type === 'player-based') {
            mappedCounter.players = [];
            mappedCounter.playerCounts = {};
          }
          return mappedCounter;
        })
      );
      setCounters(countersWithEvents);
    } catch (error) {
      handleError('Error fetching counters', error);
    } finally {
      setLoading(false);
    }
  }, [videoId, handleError]);

  useEffect(() => {
    fetchCountersForVideo();
  }, [videoId, fetchCountersForVideo]);

  const handleAddCounter = useCallback(() => {
    setShowCounterForm(true);
  }, []);

  const handleCancelCounterForm = useCallback(() => {
    setShowCounterForm(false);
    setNewCounterName('');
    setNewCounterType('standard');
    setNewCounterPlayers([]);
    setNewPlayerName('');
  }, []);

  const saveCounter = useCallback(async () => {
    if (!newCounterName.trim()) {
      handleError('Please enter a name for the counter');
      return;
    }
    if (!videoId) {
      handleError('Please select a video before saving a counter.');
      return;
    }
    if (newCounterType === 'player-based' && newCounterPlayers.length === 0) {
      handleError('Please add at least one player for a player-based counter');
      return;
    }
    try {
      const resp = await apiClient.post<CounterApiResponse>('/api/counters', {
        name: newCounterName,
        type: newCounterType,
        count: 0,
        videoId: videoId,
        createdBy: userId
      });
      if ('error' in resp) throw resp.error;
      if (!('counter' in resp)) throw new Error('No counter data returned');
      
      const newCounter: CountTracker = {
        id: resp.counter.id,
        name: newCounterName,
        count: 0,
        timestamps: [],
        type: newCounterType,
      };
      if (newCounterType === 'player-based') {
        newCounter.players = [...newCounterPlayers];
        newCounter.playerCounts = {};
        newCounterPlayers.forEach(player => {
          newCounter.playerCounts![player] = {
            count: 0,
            timestamps: []
          };
        });
      }
      setCounters(prev => [newCounter, ...prev]);
      handleCancelCounterForm();
      toast.success(`Counter "${newCounterName}" added!`);
    } catch (error) {
      handleError('Error creating counter', error);
    }
  }, [newCounterName, newCounterType, newCounterPlayers, videoId, userId, handleCancelCounterForm, handleError]);

  const addPlayerToCounterForm = useCallback((player: string) => {
    if (!player.trim()) return;
    setNewCounterPlayers(prev => {
      if (!prev.includes(player.trim())) {
        return [...prev, player.trim()];
      }
      return prev;
    });
    setNewPlayerName('');
  }, []);

  const removePlayerFromCounterForm = useCallback((player: string) => {
    setNewCounterPlayers(prev => prev.filter(p => p !== player));
  }, []);

  const incrementCounter = useCallback(async (counterId: string, playerName?: string) => {
    try {
      // Create counter event
      const currentTime = Date.now() / 1000;
      const newEvent: CreateCounterEvent = {
        counterId: counterId,
        timestamp: currentTime,
        value: 1,
        teamMemberId: null
      };
      const eventResp = await apiClient.post<CounterEventsApiResponse>('/api/counter-events', newEvent);
      if ('error' in eventResp) throw eventResp.error;
      
      // Get the new count using RPC
      const countResp = await apiClient.post<CounterApiResponse>('/api/increment-counter', { counterId: counterId });
      if ('error' in countResp) throw countResp.error;
      if (!('counter' in countResp)) throw new Error('Invalid count returned');
      
      // Get all events for this counter to update timestamps
      const eventsResp = await apiClient.get<CounterEventsApiResponse>(`/api/counter-events?counterId=${counterId}`);
      if ('error' in eventsResp) throw eventsResp.error;
      if (!('events' in eventsResp)) throw new Error('No events returned');
      
      const events = eventsResp.events;
      
      // Validate that all events match the CounterEvent interface
      if (!events.every(isCounterEvent)) {
        throw new Error('Invalid counter events data received from server');
      }

      setCounters(prevCounters =>
        prevCounters.map(counter => {
          if (counter.id !== counterId) return counter;
          if (counter.type === 'player-based' && playerName && counter.playerCounts) {
            const playerData = counter.playerCounts[playerName];
            const lastTimestamp = playerData?.timestamps[playerData.timestamps.length - 1];
            if (
              lastTimestamp !== undefined &&
              Math.abs(lastTimestamp - currentTime) < 0.5
            ) {
              return counter;
            }
            const updatedPlayerCounts = { ...counter.playerCounts };
            updatedPlayerCounts[playerName] = {
              count: (updatedPlayerCounts[playerName]?.count || 0) + 1,
              timestamps: [...(updatedPlayerCounts[playerName]?.timestamps || []), currentTime]
            };
            return {
              ...counter,
              count: countResp.counter.count,
              timestamps: events.map(e => e.timestamp),
              playerCounts: updatedPlayerCounts
            };
          }
          const lastTimestamp = counter.timestamps[counter.timestamps.length - 1];
          if (
            lastTimestamp !== undefined &&
            Math.abs(lastTimestamp - currentTime) < 0.5
          ) {
            return counter;
          }
          return {
            ...counter,
            count: countResp.counter.count,
            timestamps: events.map(e => e.timestamp)
          };
        })
      );
    } catch (error) {
      handleError('Error incrementing counter', error);
    }
  }, [handleError]);

  const removeCounter = useCallback(async (counterId: string) => {
    try {
      // First delete all counter events
      const eventsResp = await apiClient.post<CounterEventsApiResponse>('/api/counter-events/delete', { counterId });
      if ('error' in eventsResp) throw eventsResp.error;
      
      // Then delete the counter
      const counterResp = await apiClient.post<CounterApiResponse>('/api/counters/delete', { id: counterId });
      if ('error' in counterResp) throw counterResp.error;
      
      setCounters(prevCounters => 
        prevCounters.filter(counter => counter.id !== counterId)
      );
    } catch (error) {
      handleError('Error removing counter', error);
    }
  }, [handleError]);

  const resetCounter = useCallback((counterId: string) => {
    const currentTime = Date.now() / 1000;
    setCounters(prevCounters =>
      prevCounters.map(counter =>
        counter.id === counterId
          ? { ...counter, count: 1, timestamps: [currentTime] }
          : counter
      )
    );
  }, []);

  const addPlayerToCounter = useCallback((counterId: string, playerName: string) => {
    if (!playerName.trim()) return;
    setCounters(prevCounters =>
      prevCounters.map(counter => {
        if (counter.id !== counterId || counter.type !== 'player-based') return counter;
        if (counter.players?.includes(playerName.trim())) {
          return counter;
        }
        const updatedPlayers = [...(counter.players || []), playerName.trim()];
        const updatedPlayerCounts = { ...(counter.playerCounts || {}) };
        updatedPlayerCounts[playerName.trim()] = {
          count: 0,
          timestamps: []
        };
        return {
          ...counter,
          players: updatedPlayers,
          playerCounts: updatedPlayerCounts
        };
      })
    );
  }, []);

  return {
    counters,
    loading,
    showCounterForm,
    newCounterName,
    newCounterType,
    newCounterPlayers,
    newPlayerName,
    setNewCounterName,
    setNewCounterType,
    setNewCounterPlayers,
    setNewPlayerName,
    handleAddCounter,
    handleCancelCounterForm,
    saveCounter,
    addPlayerToCounterForm,
    removePlayerFromCounterForm,
    incrementCounter,
    removeCounter,
    resetCounter,
    addPlayerToCounter
  };
} 