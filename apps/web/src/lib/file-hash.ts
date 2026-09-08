/** SHA-256 hex digest of a file, used to reject duplicate profile photos. */
export async function hashFile(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest("SHA-256", buffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
