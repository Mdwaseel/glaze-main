import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '@/hooks'
import { buildTestimonialsAnimation } from './testimonialsAnimation'
import './testimonialsSection.css'

/**
 * TestimonialsSection — port of hero.html lines 3931-4088
 * ("Client Voices"): three slow marquee columns.
 *
 * The scroll is pure CSS; the controller in testimonialsAnimation.js
 * clones each column's set so the loop lands seamlessly, and parks the
 * animation while the section is offscreen.
 */

/** Nine quotes, three per column, transcribed from the original markup. */
const TESTIMONIAL_COLUMNS = [
  [
    {
      quote: 'Our living room faces the main road. With the doors closed you hear almost nothing, and we have stopped wiping dust off the sills every morning.',
      initials: 'PR', name: 'Priya Raghavan', role: 'Homeowner, Bengaluru',
    },
    {
      quote: 'The frames are slim enough that the glass reads as an opening in the wall. What we drew is what got built, which is rarer than it should be.',
      initials: 'AN', name: 'Arjun Nair', role: 'Principal Architect',
    },
    {
      quote: 'The hardware feels like it belongs on good furniture. Clients notice the weight of the handle before they notice anything else in the room.',
      initials: 'MS', name: 'Meera Shah', role: 'Interior Designer',
    },
  ],
  [
    {
      quote: 'The lift and slide panel is over four metres wide and my daughter can move it with one hand. That still surprises people.',
      initials: 'VB', name: 'Vikram Bedi', role: 'Homeowner, Gurgaon',
    },
    {
      quote: 'We have been through two monsoons now and the sea air has not marked the frames. Nothing has leaked or stuck.',
      initials: 'NI', name: 'Nandita Iyer', role: 'Homeowner, Alibaug',
    },
    {
      quote: 'The survey team measured every opening twice and the frames arrived exactly right. Installation finished a day ahead of the schedule they gave us.',
      initials: 'RD', name: 'Rahul Deshpande', role: 'Project Manager',
    },
  ],
  [
    {
      quote: 'They sat with us on the detail drawings early, before anything was priced. It saved the client money and saved us two rounds of revisions.',
      initials: 'SQ', name: 'Sana Qureshi', role: 'Architect',
    },
    {
      quote: 'The bi-fold opens the whole back of the house onto the terrace. Through winter we mostly live with it open.',
      initials: 'KM', name: 'Karan Malhotra', role: 'Homeowner, New Delhi',
    },
    {
      quote: 'Three years after handover they still pick up the phone, and the person who sold us the windows is the same one who handles the service calls.',
      initials: 'DM', name: 'Devika Menon', role: 'Developer',
    },
  ],
]

export default function TestimonialsSection() {
  const sectionRef = useRef(null)
  const reduceMotion = useReducedMotion()

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return
      return buildTestimonialsAnimation(section, reduceMotion)
    },
    { scope: sectionRef }
  )

  return (
    <section id="testimonials" className="tsm" aria-labelledby="tsm-title" ref={sectionRef}>
      <header className="tsm__head">
        <h2 id="tsm-title" className="tsm__title">In their <em>own words.</em></h2>
        <p className="tsm__intro">
          Most of our work comes to us through past clients. This is what a
          few of them have to say.
        </p>
      </header>

      <div className="tsm__cols">

        {TESTIMONIAL_COLUMNS.map((column, i) => (
          <div className={`tsm__col tsm__col--${i + 1}`} key={i}>
            <div className="tsm__track">
              <div className="tsm__set">
                {column.map((card) => (
                  <figure className="tsm__card" key={card.name}>
                    <blockquote className="tsm__quote">
                      {card.quote}
                    </blockquote>
                    <figcaption className="tsm__who">
                      <span className="tsm__ava" aria-hidden="true">{card.initials}</span>
                      <span>
                        <span className="tsm__name">{card.name}</span><br />
                        <span className="tsm__role">{card.role}</span>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        ))}

      </div>
    </section>
  )
}
