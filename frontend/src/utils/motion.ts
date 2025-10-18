import type { Variants } from 'framer-motion'

// Default animation duration and easing
export const DEFAULT_DURATION = 0.4
export const DEFAULT_EASING = "easeOut" as const

// Fade in animations
export const fadeIn: Variants = {
  hidden: { 
    opacity: 0,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  },
  visible: { 
    opacity: 1,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  }
}

// Slide up animations
export const slideUp: Variants = {
  hidden: { 
    opacity: 0,
    y: 20,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  }
}

// Slide down animations
export const slideDown: Variants = {
  hidden: { 
    opacity: 0,
    y: -20,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  }
}

// Slide left animations
export const slideLeft: Variants = {
  hidden: { 
    opacity: 0,
    x: 20,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  },
  visible: { 
    opacity: 1,
    x: 0,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  }
}

// Slide right animations
export const slideRight: Variants = {
  hidden: { 
    opacity: 0,
    x: -20,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  },
  visible: { 
    opacity: 1,
    x: 0,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  }
}

// Scale animations
export const scale: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.95,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  }
}

// Stagger animations for lists
export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

// Hero section animations
export const heroVariants: Variants = {
  hidden: { 
    opacity: 0,
    y: 30,
    transition: { duration: 0.6, ease: DEFAULT_EASING }
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: DEFAULT_EASING }
  }
}

// Card animations
export const cardVariants: Variants = {
  hidden: { 
    opacity: 0,
    y: 20,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: { duration: DEFAULT_DURATION, ease: DEFAULT_EASING }
  }
}

// Button hover animations
export const buttonHover = {
  scale: 1.05,
  transition: { duration: 0.2, ease: DEFAULT_EASING }
}

export const buttonTap = {
  scale: 0.95,
  transition: { duration: 0.1, ease: DEFAULT_EASING }
}
