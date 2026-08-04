/**
 * The 33 partner marques, as they exist in the React project.
 *
 * ⚠ THE PRODUCTS PAGES' OWN COPIES ARE NOT USED. products/assets/logos/
 * shipped 1.webp…33.webp — unnamed WebP conversions of the same 33 marks
 * the site already carries as PNGs under public/logos/, filed by category
 * and numbered identically (assets/logos/1.webp is Profile Paint/1.png).
 * The duplicates were deleted; this table maps the numbering the products
 * markup uses onto the files that were already here.
 *
 * ⚠ THE ALT TEXT IS AN IMPROVEMENT ON THE ORIGINAL, deliberately. The
 * products marquee ships `alt="Partner logo"` on all 33 images — 33
 * identical, meaningless labels for a screen reader. About's
 * PartnersSection already carries the real name and discipline for every
 * one of the same 33 marks, transcribed from about.html, so those strings
 * are reused here rather than the placeholder. That is the one departure
 * from verbatim on these logos, and it is a strict accessibility gain
 * with no visual change.
 *
 * Order and grouping below follow the numbering, not the marquee rows.
 * The two rows are composed in PartnersMarqueeSection, which keeps the
 * exact sequence the original lists.
 */
export const PARTNER_LOGOS = {
  1: { src: '/logos/Profile%20Paint/1.png', alt: 'AkzoNobel — architectural powder coatings, Netherlands' },
  2: { src: '/logos/Profile%20Paint/2.png', alt: 'PPG — architectural coatings, United States' },
  3: { src: '/logos/Profile%20Paint/3.png', alt: 'Decoral System — sublimation finishes, Italy' },
  4: { src: '/logos/Profile%20Paint/4.png', alt: 'Menphis — powder coatings, Italy' },
  5: { src: '/logos/Hardware/5.png', alt: 'Roto — window and door hardware, Germany' },
  6: { src: '/logos/Hardware/6.png', alt: 'HOPPE — handles and levers, Germany' },
  7: { src: '/logos/Hardware/7.png', alt: 'Fapim — window hardware, Italy' },
  8: { src: '/logos/Hardware/8.png', alt: 'Gretsch-Unitas — window and door technology, Germany' },
  9: { src: '/logos/Hardware/9.png', alt: 'FSB — door and window fittings, Germany' },
  10: { src: '/logos/Hardware/10.png', alt: 'Sobinco — window and door hardware, Belgium' },
  11: { src: '/logos/Hardware/11.png', alt: 'Nekos — window automation actuators, Italy' },
  12: { src: '/logos/Hardware/12.png', alt: 'Smart Home — home automation systems, Germany' },
  13: { src: '/logos/Hardware/13.png', alt: 'Securistyle — friction hinges and hardware, United Kingdom' },
  14: { src: '/logos/Hardware/14.png', alt: 'GEZE — door and window control systems, Germany' },
  15: { src: '/logos/Hardware/15.png', alt: 'HAUTAU — sliding and parallel hardware, Germany' },
  16: { src: '/logos/Hardware/16.png', alt: 'Monticelli — window hardware, Italy' },
  17: { src: '/logos/Hardware/17.png', alt: 'Dr. Hahn — door hinges, Germany' },
  18: { src: '/logos/Hardware/18.png', alt: 'Renson — ventilation and sun protection, Belgium' },
  19: { src: '/logos/Hardware/19.png', alt: 'Centor — integrated screens and doors, Australia' },
  20: { src: '/logos/Hardware/20.png', alt: 'Brio — sliding and folding gear, Australia' },
  21: { src: '/logos/Glass/21.png', alt: 'Saint-Gobain — architectural glass, France' },
  22: { src: '/logos/Glass/22.png', alt: 'AGC — architectural glass, Japan' },
  23: { src: '/logos/Glass/23.png', alt: 'Pilkington — architectural glass, United Kingdom' },
  24: { src: '/logos/Glass/24.png', alt: 'XYG — architectural glass, China' },
  25: { src: '/logos/Silicon%20Rubber%20Misc/25.png', alt: 'Wacker — silicones and sealants, Germany' },
  26: { src: '/logos/Silicon%20Rubber%20Misc/26.png', alt: 'Technoform Glassinsulation — warm-edge spacers, Germany' },
  27: { src: '/logos/Silicon%20Rubber%20Misc/27.png', alt: 'Technoform Bautec — polyamide thermal barriers, Germany' },
  28: { src: '/logos/Silicon%20Rubber%20Misc/28.png', alt: 'Haida — sealing and gasket systems, China' },
  29: { src: '/logos/Silicon%20Rubber%20Misc/29.png', alt: 'Lijialong — rubber sealing profiles, China' },
  30: { src: '/logos/Equipment%20Software/30.png', alt: 'Emmegi — aluminium working machinery, Italy' },
  31: { src: '/logos/Equipment%20Software/31.png', alt: 'Fom Industrie — aluminium working machinery, Italy' },
  32: { src: '/logos/Equipment%20Software/32.png', alt: 'AME Pressta — cutting and crimping machinery, Germany' },
  33: { src: '/logos/Equipment%20Software/33.png', alt: 'Orgadata — fabrication software, Germany' },
}

/** Row one of the marquee, in the order products/sliding.html lists it. */
export const PARTNER_ROW_ONE = [1, 2, 3, 4, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33]

/** Row two, which runs the other way. */
export const PARTNER_ROW_TWO = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
