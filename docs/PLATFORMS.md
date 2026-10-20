# Supported platforms and installation choices

Tellybox runs a Node.js server and uses FFmpeg to produce its live channels. The Docker build uses the native processor architecture; it does not force an Intel-only image.

| Platform | Installation | Verification |
|---|---|---|
| Windows x64 | Docker Desktop with Linux containers, or native Node.js and FFmpeg | Native Windows test suite checked; Docker Desktop uses the Linux container route |
| Linux x64 | Docker Engine/Compose, or native Node.js and FFmpeg | Linux tests and Docker installation/playback checks |
| Linux ARM64 / Raspberry Pi OS 64-bit | Docker Engine/Compose | Native ARM64 CI tests and Docker smoke checks; actual Raspberry Pi throughput has not been benchmarked |
| macOS | Docker Desktop or native dependencies are possible routes | Dedicated Mac compatibility testing is a follow-up; not certified in this release |

See the repository's [test runs](https://github.com/BryanWalker321/Tellybox/actions/workflows/ci.yml) for the result against each commit. CI on an ARM server checks that architecture, not the cooling, storage, network or encoding capacity of a physical Raspberry Pi. 32-bit Raspberry Pi OS and older ARMv6 devices are outside this release's tested target.

## Windows

1. Follow the current [Docker Desktop Windows installation guide](https://docs.docker.com/desktop/setup/install/windows-install/), including its supported Windows and WSL requirements. Select Linux containers and start Docker Desktop.
2. Extract the release ZIP into a permanent folder such as `C:\Tellybox`.
3. Open PowerShell in that folder and run `docker compose up --build -d`.
4. Open `http://127.0.0.1:4173`, then Settings. Retrieve the setup key privately with `docker compose logs` and create an owner password.
5. Follow [Hosting](HOSTING.md) for LAN access, startup, firewall rules and public hosting. Docker Desktop must remain running. Windows Server users should use the native setup or a supported Linux VM; Docker Desktop is not supported on Windows Server.

A native installation is also available: install supported Node.js (22.13 or later) and FFmpeg, then follow the native steps in [Hosting](HOSTING.md). There is no separate Windows installer executable.

## Linux

Install [Docker Engine and the Compose plugin](https://docs.docker.com/engine/install/) for your distribution, extract or clone Tellybox into its own project directory, then run `docker compose up --build -d`. Keep the Docker data volumes across updates. Native Node.js/FFmpeg and systemd instructions are in [Hosting](HOSTING.md).

## Raspberry Pi

1. Use a Raspberry Pi 4 or 5 with an up-to-date **64-bit** Raspberry Pi OS or another supported ARM64 Linux distribution. This is a compatibility target, not a promise of a particular channel count. Use adequate power, cooling and storage for sustained workloads.
2. Check the user-space architecture: `dpkg --print-architecture` should print `arm64`. A 64-bit kernel alone does not prove the installed user space is 64-bit.
3. Install Docker Engine and the Compose plugin using Docker's [Debian ARM64 instructions](https://docs.docker.com/engine/install/debian/). Docker directs 64-bit Raspberry Pi users to the Debian packages; its separate Raspberry Pi OS page concerns 32-bit installations. Confirm `sudo docker compose version` works.
4. Extract the starter into a dedicated folder such as `/home/YOUR_USER/tellybox`. Open a terminal in that folder.
5. For access from a PC or phone on your trusted home network, edit the port mapping in `compose.yaml` from `127.0.0.1:4173:4173` to `0.0.0.0:4173:4173`. Restrict access with your network/firewall settings. Do not expose the owner interface directly to the internet; follow the HTTPS/public-hosting guide if sharing externally.
6. Run `sudo docker compose up --build -d`. Docker selects ARM64 dependencies automatically. Do not add `platform: linux/amd64`.
7. Find the Pi's LAN address with `hostname -I`. On your PC/phone, open `http://YOUR_PI_ADDRESS:4173`. Read the setup key privately using `sudo docker compose logs` and finish owner setup.
8. Begin with the single demo channel. Check both video and audio through several programme boundaries. Monitor CPU temperature, load and buffering before adding simultaneous channels. `sudo docker stats` shows container resource use; check that the board is not throttling.
9. Set a reserved LAN address, keep the Pi running, and follow [Hosting](HOSTING.md) for your station address, media storage, automatic startup and optional public access. The Compose restart policy starts Tellybox again when Docker starts.

**The website currently uses the same encoded live feed as IPTV.** Watching in a browser does not move encoding off the Pi. One feed is shared by viewers of the same channel, but each concurrently watched channel needs its own encoder. An optional browser direct-play mode has been discussed; it is not implemented in this release. Remote providers may also restrict playback independently of hardware.

## Updates

Back up your station data and media before updating. Stop the old application, replace source files or pull the new repository revision, then rebuild with `docker compose up --build -d`. Preserve your configured media/data volumes and private environment settings. Do not use `docker compose down -v` for a normal update: that deletes named volumes.
