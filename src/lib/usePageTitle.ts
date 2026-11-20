import { useEffect } from 'react'

/** Keeps the browser tab readable now that each section is its own page. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}
