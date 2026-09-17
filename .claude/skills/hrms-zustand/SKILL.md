---
name: hrms-zustand
description: Zustand v4/v5 state management patterns for client-side stores. Use when creating stores, managing UI state, persisting data, or working with Zustand selectors in the Interview Bot frontend.
---

# Zustand State Management

Lightweight client state management for Interview Bot UI state.

## When to Use Zustand vs TanStack Query

| Use Case | Tool |
|----------|------|
| Server data (jobs, interviews, reports) | TanStack Query |
| UI state (sidebar open, active tab, filters) | Zustand |
| Form state | react-hook-form |
| Auth state (token, user) | Zustand (persisted) |

## Basic Store

```typescript
import { create } from 'zustand'

interface InterviewFilterStore {
  status: string | null
  searchQuery: string
  setStatus: (status: string | null) => void
  setSearchQuery: (query: string) => void
  reset: () => void
}

export const useInterviewFilterStore = create<InterviewFilterStore>((set) => ({
  status: null,
  searchQuery: '',
  setStatus: (status) => set({ status }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  reset: () => set({ status: null, searchQuery: '' }),
}))
```

## TypeScript Pattern (CRITICAL)

```typescript
// v4+ with TypeScript requires double parentheses
export const useStore = create<StoreType>()((set) => ({
  // ...
}))

// Without TypeScript, single call
export const useStore = create((set) => ({
  // ...
}))
```

## Using Selectors (prevent unnecessary re-renders)

```typescript
// GOOD — only re-renders when status changes
const status = useInterviewFilterStore((state) => state.status)
const setStatus = useInterviewFilterStore((state) => state.setStatus)

// BAD — re-renders on ANY state change
const store = useInterviewFilterStore()
```

### Multiple Selectors

```typescript
import { useShallow } from 'zustand/react/shallow'

const { status, searchQuery } = useInterviewFilterStore(
  useShallow((state) => ({
    status: state.status,
    searchQuery: state.searchQuery,
  }))
)
```

## Persist Middleware (localStorage)

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarStore {
  isOpen: boolean
  toggle: () => void
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isOpen: true,
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    { name: 'interviewbot-sidebar' }
  )
)
```

## Computed Values (derived state)

```typescript
interface InterviewStore {
  sessions: InterviewSession[]
  setSessions: (sessions: InterviewSession[]) => void
  getSessionsByStatus: (status: string) => InterviewSession[]
}

export const useInterviewStore = create<InterviewStore>()((set, get) => ({
  sessions: [],
  setSessions: (sessions) => set({ sessions }),
  getSessionsByStatus: (status) => get().sessions.filter((s) => s.status === status),
}))
```

## Immer Middleware (complex nested updates)

```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface ChatStore {
  messages: Record<string, ChatMessage[]>
  addMessage: (sessionId: string, message: ChatMessage) => void
}

export const useChatStore = create<ChatStore>()(
  immer((set) => ({
    messages: {},
    addMessage: (sessionId, message) =>
      set((state) => {
        if (!state.messages[sessionId]) state.messages[sessionId] = []
        state.messages[sessionId].push(message)
      }),
  }))
)
```

## Interview Bot Store Examples

### Dashboard UI Store

```typescript
export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      activeTab: 'overview',
      dateRange: 'this-month',
      setActiveTab: (tab: string) => set({ activeTab: tab }),
      setDateRange: (range: string) => set({ dateRange: range }),
    }),
    { name: 'interviewbot-dashboard' }
  )
)
```

### Auth Store

```typescript
interface AuthStore {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'interviewbot-auth' }
  )
)
```

### Interview Chat Store

```typescript
export const useInterviewChatStore = create<InterviewChatStore>()((set) => ({
  isRecording: false,
  isMuted: false,
  cameraOn: true,
  setRecording: (val: boolean) => set({ isRecording: val }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleCamera: () => set((s) => ({ cameraOn: !s.cameraOn })),
}))
```

## Accessing Store Outside React

```typescript
// Read
const status = useInterviewFilterStore.getState().status

// Write
useInterviewFilterStore.getState().setStatus('completed')

// Subscribe
const unsub = useInterviewFilterStore.subscribe(
  (state) => console.log('Status changed:', state.status)
)
```

## Best Practices

1. **One store per domain** — `useInterviewFilterStore`, `useSidebarStore`, `useDashboardStore`
2. **Use selectors** — never destructure the whole store
3. **Keep stores small** — server data belongs in TanStack Query
4. **Persist sparingly** — only UI preferences and auth token, not data
5. **Naming**: `use[Feature]Store` convention
6. **Immutable updates** — use `set()` or immer, never mutate directly
