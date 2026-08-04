# Assembly layer renders

Drop final 3D layer exports here and reference them root-absolute from
`LAYERS` in `src/components/sections/about/AssemblySection/AssemblySection.jsx`:

    src: '/images/about/assembly/roof.webp'

Requirements
- Transparent background (PNG or WebP).
- Pre-render each layer at the model's resting angle: rotateY(-14deg)
  rotateX(8deg). Baking in a DIFFERENT perspective and then applying the
  live transform on top is what makes composited layers look wrong.
- Export each layer at the aspect ratio of its panel (the `geo` w/h in
  the LAYERS array), so `object-fit: cover` has nothing to crop.
- 2x the panel's CSS size is enough; the scene caps at 960px wide.
