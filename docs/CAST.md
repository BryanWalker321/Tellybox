# Chromecast and Google TV

Tellybox includes an optional custom Google Cast receiver and browser remote. New self-hosted installations have casting switched off. This implementation has automated browser checks; real-device compatibility still needs testing.

## Owner setup

1. In [Google Cast Developer Console](https://cast.google.com/publish/), create a **Custom Receiver** using `https://YOUR-STATION/cast-receiver.html`.
2. For development, register the Cast software serial number of a test device. Follow [Google’s registration instructions](https://developers.google.com/cast/docs/registration). Published receivers require HTTPS.
3. In **Station control room → Station**, enable Chromecast & Google TV, enter the eight-character app ID and save service settings. The shared live broadcast must also be enabled.
4. Connect a Cast-compatible browser and TV to the same network. Use an address the TV can reach, rather than localhost. Your server needs enough capacity for its normal HLS broadcast.
5. Test guide navigation, channel changes, a full advert/programme transition, sound, stop/reconnect and CRT settings on the intended hardware before publishing the receiver.

Each installation registers its own receiver URL. The hosted Telly-box.uk app ID points at the hosted station and must not be reused to launch a self-hosted installation.

## Viewer controls

The Cast icon appears when casting is enabled/configured and Google reports an available device in a supported secure browser. The television receives the continuous shared channel feed, including adverts and programme boundaries. The sender offers CH+/CH−, Last, channel numbers/list, Guide, Watch, mute and Stop casting. Closing the sender leaves the receiver running. Selecting a channel in the website while connected changes the TV channel.

TV setup provides Normal, Stretched and Centred output plus a test circle for HDMI-to-analogue converters. The receiver stores this preference. Keyboard/remote arrows and OK are handled where the device exposes them; Google TV remotes differ and need testing. Standard next/previous media commands select channels.

iPhone/iPad web browsers do not initiate this Google Cast web experience. Fire TV, Roku and Apple TV are not Google Cast receivers by default. IPTV remains another route for supported equipment. Do not describe every smart TV’s screen-mirroring feature as Google Cast.

Turning casting off hides the sender control and receivers recheck the owner setting within a minute. A receiver app ID change requires reloading existing sender pages. Turning casting off does not remove programme media or alter scheduling.

## AirPlay and screen mirroring

Owners can separately enable AirPlay controls and screen-mirroring help. On supported Safari devices, AirPlay uses the native picker and shared HLS feed. Anyview/Miracast is started through the phone or computer's operating system; a website cannot start that connection itself. The source device remains responsible for playback during mirroring. Features and supported devices differ; hardware testing remains necessary.

Casting controls and IPTV help sit in the television's control panel. The branded Watch on TV guide stays within the station website.
