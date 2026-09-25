import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardPage from './page'
import { useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import {
  useProfileQuery,
  useSearchQuery,
  useActivitySummaryQuery,
  useSkippedQuery,
  useInterestsQuery,
  useShortlistQuery,
  useSavedSearchesQuery,
  usePaidQuery,
  useSubscriptionQuery,
} from '@/hooks/queries'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: vi.fn(),
}))

// Mock API Client for preferences
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    preferences: {
      getMyPreferences: vi.fn(),
    }
  }
}))

// Mock all required query hooks
vi.mock('@/hooks/queries', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    useProfileQuery: vi.fn(),
    useSearchQuery: vi.fn(),
    useActivitySummaryQuery: vi.fn(),
    useSkippedQuery: vi.fn(),
    useInterestsQuery: vi.fn(),
    useShortlistQuery: vi.fn(),
    useSavedSearchesQuery: vi.fn(),
    usePaidQuery: vi.fn(),
    useSubscriptionQuery: vi.fn(),
    useContactUsageQuery: () => ({ data: null }),
    useUnlockedContactsQuery: () => ({ data: [] }),
    useSkipMatchMutation: () => ({ mutate: vi.fn() }),
    useSendInterestMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useAddSavedSearchMutation: () => ({ mutate: vi.fn() }),
    useToggleShortlistMutation: () => ({ mutate: vi.fn() }),
    useTopMatchesPaginatedQuery: () => ({ data: { matches: [], totalCount: 0 }, isLoading: false }),
  }
})

// Mock the require-full-portal wrapper
vi.mock('@/components/layout/require-full-portal', () => ({
  RequireFullPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('DashboardPage - Browse Section (SearchFilterPanel)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // View is search
    ;(useSearchParams as any).mockReturnValue(new URLSearchParams('?view=search'))
    
    ;(useProfileQuery as any).mockReturnValue({
      data: {
        id: 'user1',
        fullName: 'Test User',
      }
    })

    ;(useSkippedQuery as any).mockReturnValue({ data: [] })
    ;(useInterestsQuery as any).mockReturnValue({ data: { pendingCount: 0 } })
    ;(useShortlistQuery as any).mockReturnValue({ data: [] })
    ;(useActivitySummaryQuery as any).mockReturnValue({ data: { viewers: [] } })
    ;(useSavedSearchesQuery as any).mockReturnValue({ data: [] })
    ;(usePaidQuery as any).mockReturnValue({ data: false })
    ;(useSubscriptionQuery as any).mockReturnValue({ data: null })
  })

  it('renders Browse section and displays profiles', async () => {
    ;(useSearchQuery as any).mockImplementation(() => ({
      data: {
        profiles: [
          { id: 'match1', fullName: 'Browse Profile 1', age: 28, city: 'Delhi', photos: [] }
        ],
        totalCount: 1,
      },
      isLoading: false,
    }))

    renderWithClient(<DashboardPage />)

    expect(await screen.findByText(/profiles found/i)).toBeInTheDocument()
    expect(screen.getAllByText('Browse Profile 1, 28').length).toBeGreaterThan(0)
  })

  it('opens Age & filters modal and applies My Preferences', async () => {
    ;(useSearchQuery as any).mockReturnValue({
      data: { profiles: [], totalCount: 0 },
      isLoading: false,
    })

    // Mock saved preferences
    ;(apiClient.preferences.getMyPreferences as any).mockResolvedValue({
      prefAgeMin: 22,
      prefAgeMax: 29,
      prefLocations: ['Mumbai'],
      prefCastes: ['Brahmin'],
    })

    renderWithClient(<DashboardPage />)

    // Click My Preferences
    const prefButton = screen.getByText(/My preferences/i)
    fireEvent.click(prefButton)

    // Check if the query values updated
    expect(await screen.findByText('Preferences applied')).toBeInTheDocument()
    
    // We should see the chips for Mumbai and Brahmin and 22-29 yrs
    expect(screen.getByText('Mumbai')).toBeInTheDocument()
    expect(screen.getByText('Brahmin')).toBeInTheDocument()
    expect(screen.getByText('22–29 yrs')).toBeInTheDocument()

    // Click Clear all
    const clearButton = screen.getByText(/Clear all/i)
    fireEvent.click(clearButton)

    // Chips should be removed
    expect(screen.queryByText('Mumbai')).not.toBeInTheDocument()
  })
})
