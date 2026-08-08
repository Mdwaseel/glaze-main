import LabExperience from './LabExperience'
import './labSection.css'

/**
 * LabSection — "The Performance Lab", hero.html lines 2731-2902.
 *
 * Five filmed tests. This file owns the data and the section element;
 * LabExperience renders and drives them. See its header for how the
 * scroll works and why it is a sticky track rather than a GSAP pin.
 *
 * ⚠ THE ORIGINAL 560vh MACHINE IS GONE, at every width. What shipped
 * before was a tall track pinning a full-height stage while an
 * instrument dial turned behind the films: five and a half screens of
 * scroll, one test per screen-and-a-bit, no way to reach a test out of
 * order, and — because the panels were absolutely stacked — nothing to
 * look at between them. It has been replaced by one held screen with a
 * control bar, and the same composition now serves phones and desktops
 * alike rather than two separate trees.
 *
 * That removed `labAnimation.js` (the dial, the gauge arc, the character
 * cascade, the iris-open reveal and the skew-on-velocity) and all but the
 * ground rules of `labSection.css`.
 *
 * ⚠ ONE <section> ELEMENT, OWNED HERE. Home renders its sections as
 * direct children of <body> (there is no <main> — see Home.jsx), and the
 * next one, PerformanceSection, pins with ScrollTrigger, which re-parents
 * #performance into a generated `pin-spacer` div. Anything that replaces
 * #lab as a whole node makes React insert the replacement *before
 * #performance in <body>*, where #performance no longer is, and the
 * commit throws NotFoundError. Nothing here re-renders the shell, and
 * LabExperience deliberately creates no pin of its own, so neither half
 * of that hazard exists any more.
 */

/** The five tests, transcribed from the original markup. */
const LAB_PANELS = [
  {
    num: '01',
    /* `short` is the label the control bar prints in a fifth of the
       page's width; `title` is the sentence-cased name used everywhere
       else, including the film's own caption. */
    short: 'Rain',
    title: 'Driving rain',
    /* ⚠ `copy`, `status`, `value`, `unit` and `metric` ARE NOT RENDERED.
       The intro paragraphs, the per-test description and the measured
       result were all cut from the composition on request. They are kept
       here because they are the section's actual test data and nothing is
       gained by deleting them — restoring any of them is a markup change
       in LabExperience, not a research exercise. */
    copy: 'Water is thrown at the closed sash for hours, at pressures well beyond a monsoon squall. Double gaskets and concealed drainage keep the inner face of the frame completely dry.',
    status: 'Sealed',
    value: '750',
    unit: ' Pa',
    metric: 'of driving rain held out, not a drop through',
    video: '/videos/Performance%20lab/Rain%20Test.mp4',
  },
  {
    num: '02',
    short: 'Wind',
    title: 'Gale-force wind',
    copy: 'The sash is flexed under gusting loads to make sure nothing racks, whistles or works loose. Reinforced profiles hold their line on exposed and high-rise sites.',
    status: 'Held firm',
    value: '2400',
    unit: ' Pa',
    metric: 'of gusting wind load resisted without deflection',
    video: '/videos/Performance%20lab/Wind%20Test.mp4',
  },
  {
    num: '03',
    short: 'Street noise',
    title: 'Street noise',
    copy: 'A calibrated speaker plays traffic on one side of the glass while microphones listen on the other. Laminated acoustic panes bring the street down to a murmur.',
    status: 'Quieted',
    value: '42',
    unit: ' dB',
    metric: 'of street noise removed at the glass',
    video: '/videos/Performance%20lab/Sound%20Test.mp4',
  },
  {
    num: '04',
    short: 'Heat',
    title: 'Heat and cold',
    copy: 'One face of the unit is heated while the other is chilled, and thermal cameras watch where energy tries to escape. The polyamide break keeps the indoor surface near room temperature.',
    status: 'Insulated',
    value: '1.1',
    unit: ' W/m²K',
    metric: 'whole-window U-value under thermal imaging',
    video: '/videos/Performance%20lab/thermal%20test.mp4',
  },
  {
    num: '05',
    short: 'Break-in',
    title: 'Break-in attempt',
    copy: 'Multi-point locks and laminated glass are worked over with the tools burglars actually carry. The sash stays shut long after the attempt has been given up.',
    status: 'Secured',
    value: '10',
    unit: ' min',
    metric: 'of tooled attack survived, sash still locked',
    video: '/videos/Performance%20lab/Security%20Test.mp4',
  },
]

export default function LabSection() {
  return (
    <section id="lab" className="lab labd" aria-labelledby="lab-title">
      <LabExperience tests={LAB_PANELS} />
    </section>
  )
}
