import { create } from "zustand"

type TypingState = {
  text: string
  typed: string
  isFocused: boolean
  startedAt: number | null
  elapsedMs: number
  isRunning: boolean
  setText: (text: string) => void
  setTyped: (typed: string) => void
  setFocused: (focused: boolean) => void
  start: () => void
  stop: () => void
  tick: () => void
  reset: (text: string) => void
}

export const useTypingStore = create<TypingState>((set) => ({
  text: "",
  typed: "",
  isFocused: false,
  startedAt: null,
  elapsedMs: 0,
  isRunning: false,
  setText: (text) => set({ text, typed: "", elapsedMs: 0, startedAt: null, isRunning: false }),
  setTyped: (typed) => set({ typed }),
  setFocused: (isFocused) => set({ isFocused }),
  start: () =>
    set((state) =>
      state.isRunning
        ? state
        : { isRunning: true, startedAt: state.startedAt ?? Date.now() }
    ),
  stop: () => set({ isRunning: false }),
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
      elapsedMs: 0,
      startedAt: null,
      isRunning: false,
    }),
}))
