# Updating your station

Open **Station Control Room → Updates**. The page shows the installed version, the latest ready release and its changelist. Choose **Install update**. Tellybox downloads and checks the application before briefly restarting the station. Sign in again after the restart.

There is no manual download, backup or reinstallation step for managed updates. Updates replace application code and keep the existing media and data locations. The updater never removes media volumes. Local videos, audio, artwork, uploaded logos, channels, programme entries, schedule configuration, owner password and saved settings remain in place. Remote media URLs remain in the catalogue; continued availability at an external provider is outside the update process.

If a new application fails its startup check, Tellybox attempts to restore the previous application. If recovery itself fails, the page reports that recovery is needed and retains the recovery journal and persistent data. It does not falsely report success. This is application rollback, not a promise to reverse arbitrary future database migrations. Releases using update protocol 1 must retain compatibility with the existing data format.

## Enable managed updates once

Installations older than v0.1.6 need a one-time adoption of the managed launcher or Docker updater. Later updates are installed from the Control Room.

### Docker Compose

The supplied `compose.yaml` runs the official public image and a separate `updater` service. Keep the same Compose project name, existing data/media mounts and port settings when adopting the new Compose file. Do not rename the project or its volumes. Run `docker compose pull` and `docker compose up -d` once from the existing project folder. Never use `docker compose down --volumes` when retaining a station.

The updater has Docker socket access so it can replace this station's containers. The web application has no Docker socket mount. Treat access to the updater service and its host as privileged. The managed updater identifies its own Compose project and retains the app's environment, ports, networks and all existing mounts.

Do not use `docker compose up` against stale application-image configuration after a managed update; it can deliberately select another version. The Control Room is the normal update route. Owners using custom images or orchestrators should continue to use their own deployment process unless they adopt the supported managed configuration.

### Node.js on Windows or Linux

Install Git, Node.js 22.13+ and FFmpeg. Start with `npm start`, which uses the managed launcher. Keep the original application folder and launch command. Subsequent releases are checked out into the station data folder's `.updates/releases/` directory. The launcher pins the original absolute media, data and custom catalogue locations before starting the selected release. It never moves the owner's media into a new release folder.

Run the launcher under your usual service manager for automatic startup. Restart the original launcher after a machine reboot. The saved active-release pointer selects the installed version. Starting `node server.mjs` directly bypasses the managed launcher and disables in-app installation.

## Release and verification policy

Stable releases increment the patch number by one. A release is offered for installation only after its official image and `tellybox-update.json` manifest are available. Images support AMD64 and ARM64. The manifest pins the Git commit and immutable image digest. The custom Discord announcement waits until this installable manifest exists.

Automated tests cover authenticated update endpoints, cross-origin and CSRF rejection, stable-release validation, preserving media checksums and configuration, a complete native update/restart and deliberate candidate failure/rollback. Docker integration verification also uses isolated containers and separate station storage. Physical Raspberry Pi and macOS hardware testing remain separate from Linux ARM64 and Windows testing.
