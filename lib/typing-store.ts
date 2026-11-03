import { create } from "zustand"

type TypingState = {
  text: string
  typed: string
  /** Letters typed past the end of each word, indexed by word (Monkeytype "extra" letters) */
  extras: string[]
  isFocused: boolean
  startedAt: number | null
  elapsedMs: number
  isRunning: boolean
  setText: (text: string) => void
  setTyped: (typed: string) => void
  setExtras: (extras: string[]) => void
  setFocused: (focused: boolean) => void
  start: () => void
  stop: () => void
  tick: () => void
  reset: (text: string) => void
}

export const useTypingStore = create<TypingState>((set) => ({
  text: "",
  typed: "",
  extras: [],
  isFocused: false,
  startedAt: null,
  elapsedMs: 0,
  isRunning: false,
  setText: (text) => set({ text, typed: "", extras: [], elapsedMs: 0, startedAt: null, isRunning: false }),
  setTyped: (typed) => set({ typed }),
  setExtras: (extras) => set({ extras }),
  setFocused: (isFocused) => set({ isFocused }),
  start: () =>
    set((state) =>
      state.isRunning
        ? state
        : { isRunning: true, startedAt: state.startedAt ?? Date.now() }
    ),
  // Freeze the final elapsed time — otherwise results use the last 100ms tick
  stop: () =>
    set((state) =>
      state.isRunning && state.startedAt
        ? { isRunning: false, elapsedMs: Date.now() - state.startedAt }
        : { isRunning: false }
    ),
  tick: () =>
    set((state) =>
      state.startedAt
        ? { elapsedMs: Date.now() - state.startedAt }
        : { elapsedMs: 0 }
    ),
  reset: (text) =>
    set({
      text,
      typed: "",
      extras: [],
      elapsedMs: 0,
      startedAt: null,
      isRunning: false,
    }),
}))
