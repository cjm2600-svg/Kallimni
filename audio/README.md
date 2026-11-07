# Native-speaker recordings (optional)

Kallimni prefers a real Egyptian speaker over any text-to-speech voice. To add one:

1. Record the phrase (a phone voice memo is fine), trim silence, export mono MP3 ~64 kbps:
   `ffmpeg -i raw.m4a -ac 1 -b:a 64k audio/l1p1.mp3`
2. In `js/lessons.js`, add `audio: "audio/l1p1.mp3"` to that phrase.

When a phrase has `audio`, it plays that file (and the background music still ducks around it). Phrases without it fall back to the device's Arabic voice.
