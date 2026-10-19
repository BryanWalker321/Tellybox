# Contributing

Use Node.js 22+. There are no runtime dependencies. Run `npm test` and `npm run validate` before submitting changes. Test the player, newspaper guide and Teletext at desktop and phone widths when editing the interface.

Keep the engine independent of the included UK catalogue. Prefer explicit configuration and provider adapters to hard-coded broadcasters or titles. New media entries need a verified file URL, measured duration, useful title, source link, UK provenance for the UK pack, and a rights note. Do not commit video files or credentials.

Preserve deterministic schedules: a viewer-specific error must not silently alter the channel schedule. Browser-local settings should remain local and the public server should not gain unauthenticated catalogue-write or upload endpoints.

Original contributions use the MIT licence. Clearly identify third-party code and assets before proposing them; do not assume linked media or public repositories have compatible redistribution rights.
