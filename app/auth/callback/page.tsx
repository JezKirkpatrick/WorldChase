// This file is intentionally minimal.
// All auth callback logic is handled by route.ts (server-side PKCE exchange).
// This page is only reached if someone navigates to /auth/callback directly
// without a ?code= parameter — route.ts handles the actual redirect.
export default function CallbackPage() {
  return null
}
