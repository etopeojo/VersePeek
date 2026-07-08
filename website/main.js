const navToggle = document.querySelector('.nav-toggle')
const siteNav = document.querySelector('#site-nav')

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('open')
    navToggle.setAttribute('aria-expanded', String(open))
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
  })

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('open')
      navToggle.setAttribute('aria-expanded', 'false')
      navToggle.setAttribute('aria-label', 'Open menu')
    })
  })
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
  )

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
} else {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'))
}
