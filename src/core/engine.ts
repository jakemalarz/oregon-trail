import type { GameState } from './types';
import { createRng, type Rng } from './rng';
import { dailyTravel, type DayResult } from './travel';
import { applyIllnessTick, attemptRecovery } from './illness';
import { rollEvent, type EventOutcome } from './events';
import { aliveCount } from './state';
import { checkGameOver } from './scoring';

export interface StepResult {
  travel: DayResult;
  event: EventOutcome;
  illnessMessages: string[];
  gameOver: boolean;
  reason?: string;
}

export interface Engine {
  state: GameState;
  rng: Rng;
  step(): StepResult;
}

export function createEngine(state: GameState): Engine {
  const rng = createRng(state.rngSeed);
  return {
    state,
    rng,
    step(): StepResult {
      if (state.ended) {
        return {
          travel: { milesAdvanced: 0, foodEaten: 0, reachedLandmark: false, notes: [] },
          event: { id: 'none', message: '' },
          illnessMessages: [],
          gameOver: true,
          reason: 'Game already ended.',
        };
      }
      const travel = dailyTravel(state);
      const event = rollEvent(state, rng);
      attemptRecovery(state, rng);
      const illnessMessages = applyIllnessTick(state);
      state.rngSeed = rng.state();

      const messages = [...travel.notes];
      if (event.message) messages.push(event.message);
      messages.push(...illnessMessages);
      for (const m of messages) state.log.push(m);

      const over = checkGameOver(state);
      if (over.over) {
        state.ended = true;
        return { travel, event, illnessMessages, gameOver: true, reason: over.reason };
      }
      if (aliveCount(state) === 0) {
        state.ended = true;
        return { travel, event, illnessMessages, gameOver: true, reason: 'Everyone has died.' };
      }
      return { travel, event, illnessMessages, gameOver: false };
    },
  };
}
