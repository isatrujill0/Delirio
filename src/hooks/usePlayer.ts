import { useSyncExternalStore } from 'react';
import { audioEngine, type PlayerState } from '../services/audioEngine';

/** Subscribes a component to the shared player (status, progress). */
export function usePlayer(): PlayerState {
  return useSyncExternalStore(audioEngine.subscribe, audioEngine.getState, audioEngine.getState);
}

export { audioEngine };
