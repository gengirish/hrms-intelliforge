---
name: hrms-tanstack-query
description: TanStack Query v5 data fetching patterns including useSuspenseQuery, useQuery, mutations, cache management, and API service integration. Use when fetching data, managing server state, or working with TanStack Query hooks in the Interview Bot frontend.
---

# TanStack Query Patterns

Modern data fetching with TanStack Query v5, emphasizing Suspense-based queries, cache-first strategies, and centralized API services.

**v5 Breaking Changes from v4:**
- `isLoading` → `isPending`
- `cacheTime` → `gcTime`
- React 18.0+ required
- Callbacks removed from useQuery (onError, onSuccess, onSettled)
- `keepPreviousData` replaced with `placeholderData`

## Primary Pattern: useSuspenseQuery

```typescript
import { useSuspenseQuery } from '@tanstack/react-query'

function InterviewList() {
  const { data: interviews } = useSuspenseQuery({
    queryKey: ['interviews', orgId],
    queryFn: () => api.getInterviews(orgId),
    staleTime: 1000 * 60,
  })

  return (
    <div>
      {interviews.map(interview => (
        <InterviewCard key={interview.id} interview={interview} />
      ))}
    </div>
  )
}

// Wrap with Suspense
<Suspense fallback={<InterviewsSkeleton />}>
  <InterviewList />
</Suspense>
```

## useQuery (when you need component-level loading)

```typescript
const { data, isPending, error } = useQuery({
  queryKey: ['interviews'],
  queryFn: api.getInterviews,
})

if (isPending) return <Skeleton />
if (error) return <ErrorState onRetry={() => refetch()} />
```

## Mutations

### Basic Mutation

```typescript
const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: api.createJobPosting,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['job-postings'] })
  },
})
```

### Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: api.updateJobPosting,
  onMutate: async (updated) => {
    await queryClient.cancelQueries({ queryKey: ['job-postings', updated.id] })
    const previous = queryClient.getQueryData(['job-postings', updated.id])
    queryClient.setQueryData(['job-postings', updated.id], updated)
    return { previous }
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(['job-postings', variables.id], context?.previous)
  },
  onSettled: (data, error, variables) => {
    queryClient.invalidateQueries({ queryKey: ['job-postings', variables.id] })
  },
})
```

## Cache Management

```typescript
const queryClient = useQueryClient()

// Invalidate
queryClient.invalidateQueries({ queryKey: ['interviews'] })
queryClient.invalidateQueries({ queryKey: ['interviews', sessionId] })

// Manual update
queryClient.setQueryData(['interviews', sessionId], newSession)

// Prefetch (on hover)
queryClient.prefetchQuery({
  queryKey: ['reports', sessionId],
  queryFn: () => api.getReport(sessionId),
})
```

## Query Key Factories

```typescript
export const jobPostingKeys = {
  all: ['job-postings'] as const,
  lists: () => [...jobPostingKeys.all, 'list'] as const,
  list: (orgId: string) => [...jobPostingKeys.lists(), orgId] as const,
  details: () => [...jobPostingKeys.all, 'detail'] as const,
  detail: (id: string) => [...jobPostingKeys.details(), id] as const,
  interviews: (id: string) => [...jobPostingKeys.detail(id), 'interviews'] as const,
}

export const interviewKeys = {
  all: ['interviews'] as const,
  lists: () => [...interviewKeys.all, 'list'] as const,
  list: (jobId?: string) => [...interviewKeys.lists(), jobId] as const,
  details: () => [...interviewKeys.all, 'detail'] as const,
  detail: (id: string) => [...interviewKeys.details(), id] as const,
  report: (id: string) => [...interviewKeys.detail(id), 'report'] as const,
}

// Usage
useSuspenseQuery({
  queryKey: interviewKeys.detail(sessionId),
  queryFn: () => api.getInterview(sessionId),
})

// Invalidate all interview lists
queryClient.invalidateQueries({ queryKey: interviewKeys.lists() })
```

## API Service Pattern

```typescript
// hooks/useJobPostings.ts
import { api } from '@/lib/api'
import { jobPostingKeys } from '@/lib/queryKeys'

export function useJobPostings(orgId: string) {
  return useSuspenseQuery({
    queryKey: jobPostingKeys.list(orgId),
    queryFn: () => api.getJobPostings(),
    staleTime: 1000 * 60,
  })
}

export function useJobPosting(id: string) {
  return useSuspenseQuery({
    queryKey: jobPostingKeys.detail(id),
    queryFn: () => api.getJobPosting(id),
    staleTime: 1000 * 60,
  })
}

export function useCreateJobPosting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createJobPosting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobPostingKeys.lists() })
    },
  })
}
```

## Error Handling with Boundaries

```typescript
import { ErrorBoundary } from 'react-error-boundary'

<ErrorBoundary fallback={<ErrorFallback />}>
  <Suspense fallback={<Skeleton />}>
    <DataComponent />
  </Suspense>
</ErrorBoundary>
```

## Best Practices

1. Use `useSuspenseQuery` by default, `useQuery` only when needed
2. Use query key factories for consistency
3. Centralize API calls in `lib/api.ts`
4. Set `staleTime: 1000 * 60` for interview data
5. Use optimistic updates for snappy UI on mutations
6. Prefetch on hover for detail pages
7. Always invalidate related queries after mutations
