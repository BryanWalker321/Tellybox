# Discord sign-in and channel conversations

Viewing television stays anonymous. Each channel has a separate comment history; reading and posting comments require Discord sign-in. Every self-hosted station can use its own Discord application, database and logging webhook.

## Configure your station

For just a link to your community, open **Settings → Hosting & help → Guided station setup**, or **Discord & chat**, enter your own `https://discord.gg/YOUR_INVITE` URL and save. This updates the Discord icon in the top menu and the community links. Save an empty invite to hide those links. No application, bot token or webhook is needed for an invite link alone. The steps below are for optional Discord sign-in and channel conversations.

1. Open **Settings** and claim the station using the setup key printed in the server console. Choose an owner password; afterwards only that password is needed.
2. In **Station**, save the exact website origin viewers use (for example `http://127.0.0.1:4173` or `https://tv.example.com`). Use one address consistently.
3. In **Discord & chat**, follow the Developer Portal link, create an application, and register the exact callback shown on screen. Paste the application ID and client secret and save.
4. For comment logging, create a webhook in your Discord server’s destination channel under **Edit Channel → Integrations → Webhooks**. Paste the URL into Settings and save. All station channels log there with channel/author labels. **Check saved webhook** verifies its connection without posting a message.
5. Set moderator user IDs and the daily comment allowance in the same section. Save changes; no restart is required.
6. Use the main **Sign in** button to verify real Discord sign-in. The application and webhook must be created in Discord; this build cannot create them on your behalf.

Secrets are write-only in Settings. A blank field keeps the saved value; use the explicit removal checkbox to disconnect it. Saved values in `data/owner.json` override the corresponding environment defaults. `.env` remains available for automated installations; browser setup requires no `.env` editing. Changing the Discord application, secret or public origin invalidates existing viewer sessions and pending OAuth flows. Changing the logging webhook clears pending deliveries so old comments cannot be sent to a newly selected server.

No Discord bot is required for comment logging. Optional automatic server joining uses a bot and requests `identify guilds.join` during Discord authorisation. With it disabled, sign-in requests only `identify`. The website does not read Discord messages, request email addresses or mirror Discord replies back to the website. A signed-in viewer can chat with other viewers on the station itself.

## Behaviour

- Persistent SQLite database in `data/community.sqlite`, or `DATA_DIR` if set. Keep this directory private and back it up with the service stopped, including any journal files.
- Per-channel history, refreshed every five seconds; the most recent 100 visible comments are displayed. Stored comments survive restarts.
- Default limit: 20 comments per user per UTC day and a three-second pause between posts. Change the allowance in Owner Settings (or use `CHAT_DAILY_LIMIT` as its initial default). A comment may contain up to 1,000 characters.
- Text is rendered as text, not HTML. Discord log messages suppress mentions, including `@everyone`.
- A durable webhook outbox retries failures and honours Discord rate-limit delays. The website can accept comments while Discord is temporarily unavailable. Check the webhook configuration if queued deliveries persist.
- Reports and removals are logged to the configured Discord channel. Removing a comment hides it from the station, but retains its original record and any Discord audit copy. It does not delete Discord history.
- Signed-in sessions expire after seven days. Signing out invalidates the server session. Discord access tokens are used briefly to obtain the profile and, when enabled, add the viewer to the configured server. They are not saved in the database. The bot token is an owner credential saved privately in owner.json, never returned by the public API or revealed in Settings responses. Session cookies use HttpOnly/SameSite protections and Secure on HTTPS origins. Auth state is checked once; comment writes require same-origin requests and a CSRF token.

## Viewer counts

Counts are based on active browser playback heartbeats. Signing in is not required. A paused or stopped player leaves the count; stale viewers expire after 55 seconds. Each tab has a temporary random ID. These are **active player estimates**, not counts of distinct people. IPTV software does not send these heartbeats, so external IPTV viewers are excluded. Empty rooms display zero, not a fabricated audience.

Presence is in memory and resets when the service restarts. The SQLite database and presence model target one Node service instance. Multiple replicas would need shared storage and shared presence. Use your reverse proxy's normal traffic controls for a large public service.

## Verification

Automated tests exercise the real HTTP routes with mocked Discord responses: authorization-code exchange, state-cookie matching and replay rejection, profile session creation, required login/CSRF/origin checks, channel isolation, author/moderator removal, reports, rate limits, webhook retries and presence expiry. No test posts to a real Discord server. Actual Discord sign-in and webhook delivery still need to be checked after the station owner supplies credentials.

References: [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2), [Discord webhooks](https://docs.discord.com/developers/resources/webhook).

## Public community buttons and automatic joining

In Settings → Discord & chat, enter your public server invite URL. A Discord invite button appears in the community banner, with a small yellow Discord shortcut beside the header settings cog. Channel conversations show the sign-in button on its own. Leaving it blank hides the buttons. The self-hosted starter has no Tellybox invite: use your own server.

To add viewers to your Discord server during sign-in:

1. Use a bot belonging to the **same application** as the website's Application/client ID and client secret. An existing installed bot works; do not recreate it. The public key is not the bot token.
2. Ensure that bot is installed in your server and has Create Instant Invite permission. Administrator permission and privileged intents are not required. If installing it for the first time, use the Developer Portal's OAuth2 URL Generator with the bot scope and that permission.
3. Enable Discord Developer Mode, right-click your server and Copy Server ID. Enter it in the server ID field.
4. Enter your existing bot token privately in the password field in Settings. Do not post it in chat or commit it to source control. If it was already saved, leave the field blank to keep it.
5. Enable **Add viewers to this Discord server when they authorise sign-in** and save. Visitors see the joining notice and Discord requests `guilds.join` permission. Previously signed-in visitors must sign out/in to authorise joining.
6. Test using a consenting viewer account. Already-member responses count as success. A rejected scope or failed membership request does not create a new website session; the viewer receives a retry/contact-owner message. Server membership screening is preserved: viewers may still need to accept the Discord server's rules.

An invite alone is not sufficient for automatic joining. Only after the credentials and enable switch are configured does the website request that permission and display the automatic-joining notice. Watching remains anonymous and needs no membership.

The automated membership tests cover 201 added, 204 already present, failed additions, missing authorisation scope and token non-persistence. Real joining still needs an owner-provided bot token and a consenting test login. See [Discord Add Guild Member](https://docs.discord.com/developers/resources/guild#add-guild-member).

## Assign a member role

Settings → Discord & chat includes an optional Member role ID. When automatic joining is enabled, the bot assigns that role after a successful join, including when Discord reports the viewer was already a member. It adds only that role and preserves all existing roles. Leave the field blank to disable role assignment. The bot needs Manage Roles permission and its highest role must be above the target role in Discord’s hierarchy. A missing permission/deleted role produces a clear sign-in error rather than reporting success. Existing signed-in viewers receive the role on their next sign-out/sign-in, not retroactively in bulk.
