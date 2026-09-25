import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardPage from './page'
import { useSearchParams } from 'next/navigation'
import {
  useProfileQuery,
  useTopMatchesPaginatedQuery,
  useActivitySummaryQuery,
  useSkippedQuery,
  useInterestsQuery,
  useShortlistQuery,
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

// Mock all required query hooks
vi.mock('@/hooks/queries', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    useProfileQuery: vi.fn(),
    useTopMatchesPaginatedQuery: vi.fn(),
    useActivitySummaryQuery: vi.fn(),
    useSkippedQuery: vi.fn(),
    useInterestsQuery: vi.fn(),
    useShortlistQuery: vi.fn(),
    useSkipMatchMutation: () => ({ mutate: vi.fn() }),
    useSendInterestMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useAddSavedSearchMutation: () => ({ mutate: vi.fn() }),
    useToggleShortlistMutation: () => ({ mutate: vi.fn() }),
    usePaidQuery: () => ({ data: false }),
    useSubscriptionQuery: () => ({ data: null }),
    useSavedSearchesQuery: () => ({ data: [] }),
    useSearchQuery: () => ({ data: { profiles: [], totalCount: 0 }, isLoading: false }),
    useUnlockedContactsQuery: () => ({ data: [] }),
    useContactUsageQuery: () => ({ data: null }),
  }
})

// Mock the require-full-portal wrapper to just render children
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

describe('DashboardPage - For You Section', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    ;(useSearchParams as any).mockReturnValue(new URLSearchParams('?view=matches'))
    
    ;(useProfileQuery as any).mockReturnValue({
      data: {
        id: 'user1',
        fullName: 'Test User',
        gender: 'Male',
        prefReligion: ['Hindu'],
        prefMaritalStatuses: ['Never Married'],
        prefAgeMin: 20,
        prefAgeMax: 30,
      }
    })

    ;(useSkippedQuery as any).mockReturnValue({ data: [] })
    ;(useInterestsQuery as any).mockReturnValue({ data: { pendingCount: 0 } })
    ;(useShortlistQuery as any).mockReturnValue({ data: [] })
    ;(useActivitySummaryQuery as any).mockReturnValue({ data: { viewers: [] } })
  })

  it('renders the Top Matches correctly when there are matches', async () => {
    const mockMatches = [
      {
        id: 'match1',
        fullName: 'Match One',
        age: 25,
        city: 'Chennai',
        state: 'Tamil Nadu',
        heightCm: 165,
        photos: ['photo1.jpg'],
        matchReasons: ['Age', 'City'],
      },
      {
        id: 'match2',
        fullName: 'Match Two',
        age: 24,
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        heightCm: 160,
        photos: ['photo2.jpg'],
        matchReasons: ['Religion'],
      }
    ]

    ;(useTopMatchesPaginatedQuery as any).mockReturnValue({
      data: {
        matches: mockMatches,
        totalCount: 2,
      },
      isLoading: false,
    })

    renderWithClient(<DashboardPage />)

    // Assert "For You" text appears
    expect(await screen.findByText(/People who fit the age, religion, and marital status you set/i)).toBeInTheDocument()

    // Assert the matches are rendered
    expect(screen.getAllByText('Match One, 25')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Match Two, 24')[0]).toBeInTheDocument()
  })

  it('displays empty state when no matches found', async () => {
    ;(useTopMatchesPaginatedQuery as any).mockReturnValue({
      data: {
        matches: [],
        totalCount: 0,
      },
      isLoading: false,
    })

    renderWithClient(<DashboardPage />)

    expect(await screen.findByText(/No profiles fit those preferences yet/i)).toBeInTheDocument()
  })

  it('renders stats boxes for Interests, Shortlisted, Views', async () => {
    ;(useTopMatchesPaginatedQuery as any).mockReturnValue({
      data: { matches: [], totalCount: 0 },
      isLoading: false,
    })
    ;(useInterestsQuery as any).mockReturnValue({ data: { pendingCount: 5 } })
    ;(useShortlistQuery as any).mockReturnValue({ data: [1, 2, 3] })
    ;(useActivitySummaryQuery as any).mockReturnValue({ data: { viewers: [1, 2] } })
    
    renderWithClient(<DashboardPage />)

    expect(await screen.findByText('Interests')).toBeInTheDocument()
    expect(await screen.findByText('5')).toBeInTheDocument()
    expect(await screen.findByText('Shortlisted')).toBeInTheDocument()
    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(await screen.findByText('Views')).toBeInTheDocument()
    expect(await screen.findByText('2')).toBeInTheDocument()
  })

  it('switches to Browse tab and shows filter button and quick preferences', async () => {
    ;(useSearchParams as any).mockReturnValue(new URLSearchParams('?view=search'))
    
    renderWithClient(<DashboardPage />)

    // Check tabs
    const browseTab = await screen.findByRole('tab', { name: /Browse/i })
    expect(browseTab).toHaveAttribute('aria-selected', 'true')

    // Check filters
    expect(screen.getByText('Age & filters')).toBeInTheDocument()
    expect(screen.getByText('My preferences')).toBeInTheDocument()
    expect(screen.getByText(/profiles found/i)).toBeInTheDocument()
  })

  it('opens filter modal when Age & filters is clicked', async () => {
    ;(useSearchParams as any).mockReturnValue(new URLSearchParams('?view=search'))
    
    renderWithClient(<DashboardPage />)

    const filterBtn = await screen.findByText('Age & filters')
    filterBtn.click()

    expect(await screen.findByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Filter profiles by age, location, and community')).toBeInTheDocument()
  })
})
