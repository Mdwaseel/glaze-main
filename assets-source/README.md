# Source media — inputs, not outputs

Nothing in this directory is served to a browser. These are the original,
full-resolution clips that the **shipped** assets in `client/public/` were
encoded *from*.

They used to sit inside `client/public/`, which meant Vite copied all 191 MB
into `dist/`, Docker baked it into the web image, and every deploy shipped it
to the server — where no page ever requested a single byte of it. Moving them
here changes nothing a visitor sees and takes 191 MB out of the build.

| Here | Encoded into | Used by |
|---|---|---|
| `videos/product videos/<Category>/<Name>.mp4` (1928×1076) | `client/public/videos/variants/<system>/<variant>.mp4` (1600w, CRF 26) | The variant player on every system page |
| `videos/mobile-hero-section-video.mp4` (1080×1916) | `client/public/frames/hero-mobile/hero_###.webp` (120 frames) | The portrait hero sequence on phones |
| `videos/mobile-day-and-night-video.mp4` (1080×1916) | `client/public/frames/daynight-mobile/dn_###.webp` (120 frames) | The portrait day/night scrub on phones |
| `videos/layer by layer precision.mp4` | `client/public/frames/layers/layer_###.webp` (145 frames) | The scroll-scrubbed build-up on the homepage |
| `videos/Loader.mp4` (1440²) | *nothing* — superseded | The loader plays `public/videos/loader/mark.webm`, 645 KB |
| `videos/Fixed Window.png` (3.7 MB) | *nothing* — unreferenced | — |

The exact ffmpeg commands live next to the code that consumes each sequence,
in the file-header comments of `heroSequence.js`, `dayNightSequence.js`,
`performanceSequence.js` and `data/variants.js`. They are written against the
paths above.

## Keep or drop?

These are committed, so the originals are versioned and a frame sequence can be
regenerated at a different size or frame count without hunting for the footage
again. That costs ~191 MB in the repository, and git keeps every version of a
binary forever.

If that becomes a problem, in order of preference:

1. Move this directory to [Git LFS](https://git-lfs.com) — do it *before* the
   files start changing, not after.
2. Add `assets-source/` to `.gitignore` and keep the originals in your own
   backup instead. The site builds and deploys identically without them; only
   regeneration needs them.

What you should **not** do is move them back into `client/public/`. Everything
in there is published, whether or not anything links to it.
