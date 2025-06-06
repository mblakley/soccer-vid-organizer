import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { PlayerTimer, TimerSession } from '@/components/timers/TimerInterfaces';
import { TimerResponse, TimersResponse, TimerEventResponse, TimerEventsResponse } from '@/lib/types/timers';
import { toast } from 'react-toastify';

interface UseTimersOptions {
  userId: string;
  videoId?: string;
  onError?: (message: string) => void;
}

export function useTimers({ userId, videoId, onError }: UseTimersOptions) {
  const [playerTimers, setPlayerTimers] = useState<PlayerTimer[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTimerName, setNewTimerName] = useState('');
  const [showTimerForm, setShowTimerForm] = useState(false);
  const [newTimerType, setNewTimerType] = useState<'standard' | 'player-based'>('standard');
  const [newTimerPlayers, setNewTimerPlayers] = useState<string[]>([]);
  const [newTimerPlayerName, setNewTimerPlayerName] = useState('');
  const [selectedPlayerForSessions, setSelectedPlayerForSessions] = useState<{timerId: string, playerName: string} | null>(null);
  const [selectedTimerId, setSelectedTimerId] = useState<string | null>(null);

  const handleError = useCallback((message: string, error?: any) => {
    console.error(message, error);
    if (onError) {
      onError(message);
    } else {
      toast.error(message);
    }
  }, [onError]);

  // Fetch timers for the current video
  const fetchTimersForVideo = useCallback(async () => {
    try {
      if (!videoId) {
        setPlayerTimers([]);
        return;
      }
      setLoading(true);
      const response = await apiClient.get<TimersResponse>(`/api/timers?videoId=${videoId}`);
      const { data: timersData, error: timersError } = response;
      if (timersError) throw timersError;
      // For each timer, fetch its events
      const timersWithEvents = await Promise.all(
        (timersData?.timers || []).map(async (timer: any) => {
          const response = await apiClient.get<TimerEventsResponse>(`/api/timer-events?timerId=${timer.id}`);
          const { data: events, error: eventsError } = response;
          if (eventsError) throw eventsError;
          // Calculate total duration from sessions
          const totalDurationFromSessions = (events || []).reduce((acc: number, session: any) => acc + (session.duration || 0), 0);
          const mappedTimer: PlayerTimer = {
            id: timer.id,
            name: timer.name,
            startTime: null,
            endTime: null,
            duration: totalDurationFromSessions,
            active: false,
            type: timer.type,
            sessions: events.map((e: any) => ({
              startTime: e.start_time,
              endTime: e.end_time,
              duration: e.duration || 0
            }))
          };
          if (timer.type === 'player-based') {
            mappedTimer.players = [];
            mappedTimer.playerTimes = {};
          }
          return mappedTimer;
        })
      );
      setPlayerTimers(timersWithEvents);
    } catch (error) {
      handleError('Error fetching timers', error);
    } finally {
      setLoading(false);
    }
  }, [videoId, handleError]);

  // Load timers when videoId changes
  useEffect(() => {
    fetchTimersForVideo();
  }, [videoId, fetchTimersForVideo]);

  // Show/hide the timer form
  const handleAddTimer = useCallback(() => {
    setShowTimerForm(true);
  }, []);

  // Cancel the timer form
  const handleCancelTimerForm = useCallback(() => {
    setShowTimerForm(false);
    setNewTimerName('');
    setNewTimerType('standard');
    setNewTimerPlayers([]);
    setNewTimerPlayerName('');
  }, []);

  // Save a new timer
  const saveTimer = useCallback(async () => {
    if (!newTimerName.trim()) {
      handleError('Please enter a name for the timer');
      return;
    }
    
    if (!videoId) {
      handleError('Please select a video before saving a timer');
      return;
    }
    
    // For player-based timers, validate that we have players
    if (newTimerType === 'player-based' && newTimerPlayers.length === 0) {
      handleError('Please add at least one player for a player-based timer');
      return;
    }
    
    try {
      // Create timer in database
      const response = await apiClient.post<TimerResponse>('/api/timers', {
        name: newTimerName,
        type: newTimerType,
        video_id: videoId,
        created_by: userId
      });
      const { data: timerData, error: timerError } = response;

      if (timerError) throw timerError;

      const newTimer: PlayerTimer = {
        id: timerData.id,
        name: newTimerName,
        startTime: null,
        endTime: null,
        duration: 0,
        active: false,
        type: newTimerType,
        sessions: []
      };
      
      // Add player-specific data if it's a player-based timer
      if (newTimerType === 'player-based') {
        newTimer.players = [...newTimerPlayers];
        newTimer.playerTimes = {};
        
        // Initialize times for each player
        newTimerPlayers.forEach(player => {
          newTimer.playerTimes![player] = {
            duration: 0,
            active: false,
            startTime: null,
            sessions: []
          };
        });
      }
      
      setPlayerTimers(prev => [newTimer, ...prev]);
      
      // Reset the form
      handleCancelTimerForm();
      
      toast.success(`Timer "${newTimerName}" added!`);
    } catch (error) {
      handleError('Error creating timer', error);
    }
  }, [newTimerName, newTimerType, newTimerPlayers, videoId, userId, handleCancelTimerForm, handleError]);

  // Player functionality for timer forms
  const addPlayerToTimerForm = useCallback((player: string) => {
    if (!player.trim()) return;
    
    setNewTimerPlayers(prev => {
      if (!prev.includes(player.trim())) {
        return [...prev, player.trim()];
      }
      return prev;
    });
    
    setNewTimerPlayerName('');
  }, []);
  
  const removePlayerFromTimerForm = useCallback((player: string) => {
    setNewTimerPlayers(prev => prev.filter(p => p !== player));
  }, []);

  // Start a timer
  const startTimer = useCallback(async (timerId: string) => {
    if (!videoId) return;
    
    try {
      const currentTime = Date.now() / 1000; // Use current timestamp if no player
      
      // Create timer event
      const response = await apiClient.post<TimerEventResponse>('/api/timer-events', {
        timer_id: timerId,
        start_time: currentTime,
        end_time: null,
        duration: null,
        team_member_id: null
      });
      const { data: eventData, error: eventError } = response;

      if (eventError) throw eventError;

      // Update local state
      setPlayerTimers(prevTimers =>
        prevTimers.map(timer => {
          if (timer.id !== timerId) return timer;
          
          // Create a new session when starting the timer
          const newSession: TimerSession = {
            startTime: currentTime,
            endTime: null,
            duration: 0
          };
          
          return {
            ...timer,
            startTime: currentTime,
            active: true,
            sessions: [...timer.sessions, newSession]
          };
        })
      );
    } catch (error) {
      handleError('Error starting timer', error);
    }
  }, [videoId, handleError]);
  
  // Stop a timer
  const stopTimer = useCallback(async (timerId: string) => {
    if (!videoId) return;
    
    try {
      const currentTime = Date.now() / 1000; // Use current timestamp if no player
      
      // Get the most recent timer event for this timer
      const response = await apiClient.get<TimerEventResponse>(`/api/timer-events?timerId=${timerId}&end_time=null`);
      const { data: events, error: eventsError } = response;

      if (eventsError) throw eventsError;

      if (events) {
        // Update the timer event
        const updateResponse = await apiClient.put<TimerEventResponse>(`/api/timer-events/${events.id}`, {
          end_time: currentTime,
          duration: currentTime - events.start_time
        });
        const { error: updateError } = updateResponse;

        if (updateError) throw updateError;
      }

      // Update local state
      setPlayerTimers(prevTimers =>
        prevTimers.map(timer => {
          if (timer.id !== timerId) return timer;
          
          // Calculate duration only if timer was active and had a start time
          if (timer.active && timer.startTime !== null) {
            const sessionDuration = currentTime - timer.startTime;
            
            // Update the most recent session
            const updatedSessions = [...timer.sessions];
            if (updatedSessions.length > 0) {
              const lastSession = updatedSessions[updatedSessions.length - 1];
              updatedSessions[updatedSessions.length - 1] = {
                ...lastSession,
                endTime: currentTime,
                duration: sessionDuration
              };
            }
            
            return {
              ...timer,
              duration: timer.duration + sessionDuration,
              active: false,
              startTime: null,
              sessions: updatedSessions
            };
          }
          
          return timer;
        })
      );
    } catch (error) {
      handleError('Error stopping timer', error);
    }
  }, [videoId, handleError]);
  
  // Reset a timer 
  const resetTimer = useCallback((timerId: string) => {
    setPlayerTimers(prevTimers =>
      prevTimers.map(timer => {
        if (timer.id !== timerId) return timer;
        return {
          ...timer,
          startTime: null,
          endTime: null,
          duration: 0,
          active: false,
          sessions: []
        };
      })
    );
  }, []);
  
  // Remove a timer
  const removeTimer = useCallback(async (timerId: string) => {
    try {
      // First delete all timer events
      const deleteEventsResponse = await apiClient.delete<TimerEventResponse>(`/api/timer-events?timerId=${timerId}`);
      const { error: eventsError } = deleteEventsResponse;

      if (eventsError) throw eventsError;

      // Then delete the timer
      const deleteTimerResponse = await apiClient.delete<TimerResponse>(`/api/timers/${timerId}`);
      const { error: timerError } = deleteTimerResponse;

      if (timerError) throw timerError;

      // Update local state
      setPlayerTimers(prevTimers => 
        prevTimers.filter(timer => timer.id !== timerId)
      );
    } catch (error) {
      handleError('Error removing timer', error);
    }
  }, [handleError]);

  // Add player to existing player-based timer
  const addPlayerToTimer = useCallback((timerId: string, playerName: string) => {
    if (!playerName.trim()) return;
    
    setPlayerTimers(prevTimers =>
      prevTimers.map(timer => {
        if (timer.id !== timerId || timer.type !== 'player-based') return timer;
        
        // Check if player already exists
        if (timer.players?.includes(playerName.trim())) {
          return timer;
        }
        
        // Add player to the timer
        const updatedPlayers = [...(timer.players || []), playerName.trim()];
        const updatedPlayerTimes = { ...(timer.playerTimes || {}) };
        
        // Initialize time for the new player
        updatedPlayerTimes[playerName.trim()] = {
          duration: 0,
          active: false,
          startTime: null,
          sessions: []
        };
        
        return {
          ...timer,
          players: updatedPlayers,
          playerTimes: updatedPlayerTimes
        };
      })
    );
  }, []);

  // Toggle individual player timer
  const togglePlayerTimer = useCallback((timerId: string, playerName: string) => {
    const currentTime = Date.now() / 1000; // Use current timestamp if no player
    
    setPlayerTimers(prevTimers =>
      prevTimers.map(timer => {
        if (timer.id !== timerId || !timer.playerTimes || !timer.players?.includes(playerName)) 
          return timer;
        
        const playerTime = timer.playerTimes[playerName];
        
        if (playerTime.active) {
          // Stop the timer for this player
          const sessionDuration = playerTime.startTime !== null
            ? currentTime - playerTime.startTime
            : 0;
            
          // Update the most recent session
          const updatedSessions = [...playerTime.sessions];
          if (updatedSessions.length > 0) {
            const lastSession = updatedSessions[updatedSessions.length - 1];
            updatedSessions[updatedSessions.length - 1] = {
              ...lastSession,
              endTime: currentTime,
              duration: sessionDuration
            };
          }
          
          return {
            ...timer,
            playerTimes: {
              ...timer.playerTimes,
              [playerName]: {
                ...playerTime,
                duration: playerTime.duration + sessionDuration,
                active: false,
                startTime: null,
                sessions: updatedSessions
              }
            }
          };
        } else {
          // Start the timer for this player
          const newSession: TimerSession = {
            startTime: currentTime,
            endTime: null,
            duration: 0
          };
          
          return {
            ...timer,
            playerTimes: {
              ...timer.playerTimes,
              [playerName]: {
                ...playerTime,
                active: true,
                startTime: currentTime,
                sessions: [...playerTime.sessions, newSession]
              }
            }
          };
        }
      })
    );
  }, []);

  // Handle selecting a player to view their sessions
  const handleSelectPlayerForSessions = useCallback((timerId: string, playerName: string) => {
    if (!playerName) {
      setSelectedPlayerForSessions(null);
      return;
    }
    
    setSelectedPlayerForSessions({
      timerId,
      playerName
    });
  }, []);

  return {
    // State
    playerTimers,
    loading,
    newTimerName,
    showTimerForm,
    newTimerType,
    newTimerPlayers,
    newTimerPlayerName,
    selectedPlayerForSessions,
    selectedTimerId,
    
    // Form state setters
    setNewTimerName,
    setNewTimerType,
    setNewTimerPlayerName,
    setSelectedTimerId,
    
    // Operations
    handleAddTimer,
    handleCancelTimerForm,
    saveTimer,
    addPlayerToTimerForm,
    removePlayerFromTimerForm,
    startTimer,
    stopTimer,
    resetTimer,
    removeTimer,
    addPlayerToTimer,
    togglePlayerTimer,
    handleSelectPlayerForSessions
  };
} 