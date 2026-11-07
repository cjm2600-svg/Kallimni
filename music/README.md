# Adding nasheeds to Kallimni

The player ships with an **empty playlist on purpose**: no recording with a verified license has been bundled yet, and Kallimni must never include downloaded or ripped copyrighted audio.

## What you may add

- **Your own recordings** (you, family, friends singing — with their OK).
- **Public domain / CC0** recordings.
- **Creative Commons** recordings (CC BY, CC BY-SA). Keep the attribution in `playlist.js`.
- Recordings where the artist or label has given you **written permission**.

Vocals-only (no instruments) recordings are preferred. Many traditional nasheeds such as *Tala' al-Badru ʿAlayna* are centuries old, so the *words and melody* are public domain — but each **recording** has its own copyright. Check the recording's license, not just the song.

Good places to look (always confirm the license on the file page itself): Wikimedia Commons (filter by license), Freesound (CC0/CC BY), Internet Archive items that state a CC or public-domain license, or artists who publish free-to-use releases.

## How to add a track

1. Convert to a small file — mono MP3, 64–96 kbps keeps the Creation light:
   `ffmpeg -i input.wav -ac 1 -b:a 80k music/my-track.mp3`
2. Put the file in this `music/` folder.
3. Add an entry in `music/playlist.js`:

```js
{
  title: "Tala' al-Badru ʿAlayna",
  artist: "Performer name",
  src: "music/my-track.mp3",
  license: "CC BY 4.0",
  source: "https://where-the-license-is-stated",   // or permission: "Written OK from …, 2026-11-07"
  vocalsOnly: true
},
```

Entries missing `title`, `src`, `license`, or `source`/`permission` are ignored by the player.
