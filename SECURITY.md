# Security policy

## Supported versions

Security fixes target the latest stable Tellybox release. Older releases and development snapshots may be investigated to understand a report, but do not have a separate backport or long-term support commitment. Install ready updates through Station Control Room where managed updates are configured. See [the update guide](docs/UPDATES.md).

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/BryanWalker321/Tellybox/security/advisories/new) (**Security → Report a vulnerability**). Do not put exploit details, credentials, personal information or unpublished vulnerabilities in public issues, pull requests or Discord channels.

Include:

- Affected Tellybox version, installation method and operating system.
- A description of the issue and its security impact.
- Minimal reproduction steps or a proof of concept using your own disposable station.
- Relevant sanitised logs and whether the issue affects a default installation or requires particular settings.
- Any suggested mitigation, if known.

Never submit real passwords, Discord webhooks, OAuth secrets, provider cookies, private media or an owner's data directory. If you accidentally expose a credential, revoke or rotate it immediately; deleting a message alone does not invalidate it.

## What happens next

Maintainers will review the private report, ask for details where needed and coordinate a fix and disclosure when appropriate. This is a community project: there is no guaranteed response deadline, paid support arrangement or bug bounty. Please keep exploitable details private while the report is assessed and agree a disclosure plan with the maintainers. Credit preferences can be included in the report.

Only test installations and accounts you own or have explicit permission to assess. Do not disrupt live broadcasts, access another owner's files, collect viewer data or test unrelated services on a shared server.

## Station-owner responsibilities

Keep the operating system, Node.js/container runtime, FFmpeg and reverse proxy maintained. Use HTTPS for public owner access; protect the owner password, persistent data and provider sessions. The Docker updater has privileged access to Docker and must remain private. Retain independent disaster-recovery backups and do not expose data/media storage as a general file listing.

Remote source availability, ordinary playback faults and feature requests belong in [issues](https://github.com/BryanWalker321/Tellybox/issues/new/choose), unless they reveal a security weakness. This policy covers Tellybox application security; third-party platforms and independent stations have their own security contacts.
