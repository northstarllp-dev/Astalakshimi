export type ConnectStatus = "connect" | "sent" | "mutual" | "accept"

export type InterestItem = {
  profileId?: string
  status?: string
  profile?: { id?: string }
}

export type InterestsSummary = {
  sent?: InterestItem[]
  received?: InterestItem[]
  mutual?: InterestItem[]
}

function matchesProfile(item: InterestItem, profileId: string) {
  return item.profileId === profileId || item.profile?.id === profileId
}

export function getConnectStatus(
  profileId: string,
  interests?: InterestsSummary | null,
  options?: { justSent?: boolean }
): ConnectStatus {
  const sentItem = interests?.sent?.find((i) => matchesProfile(i, profileId))
  const receivedItem = interests?.received?.find((i) => matchesProfile(i, profileId))
  const mutualItem = interests?.mutual?.find((i) => matchesProfile(i, profileId))

  const isMutual =
    !!mutualItem || sentItem?.status === "accepted" || receivedItem?.status === "accepted"
  if (isMutual) return "mutual"

  if (receivedItem?.status === "pending") return "accept"

  if (options?.justSent || sentItem?.status === "pending") return "sent"

  return "connect"
}
