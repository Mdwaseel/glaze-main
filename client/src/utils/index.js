/**
 * Scroll to an element by ID with smooth behavior.
 * @param {string} id - The element ID to scroll to.
 */
export const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
};

/**
 * Clamp a number between min and max.
 */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Linear interpolation between two values.
 */
export const lerp = (start, end, t) => start + (end - start) * t;
