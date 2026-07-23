import { useEffect, useState } from 'react'

/** Subscribe to a CSS media query; SSR-safe (false until mounted). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Tailwind `md` breakpoint and below — phone / small tablet portrait. */
export function useIsMobileViewport(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
