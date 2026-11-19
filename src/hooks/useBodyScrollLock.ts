import { useEffect } from 'react'

let lockCount = 0
let lockedScrollY = 0
let bodyStyles: Partial<CSSStyleDeclaration> | null = null
let htmlStyles: Partial<CSSStyleDeclaration> | null = null

function acquireScrollLock() {
  if (lockCount === 0) {
    const body = document.body
    const html = document.documentElement
    lockedScrollY = window.scrollY
    bodyStyles = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, overflow: body.style.overflow }
    htmlStyles = { overflow: html.style.overflow, overscrollBehavior: html.style.overscrollBehavior }
    body.style.position = 'fixed'
    body.style.top = `-${lockedScrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
  }
  lockCount += 1

  return () => {
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount !== 0 || !bodyStyles || !htmlStyles) return
    const body = document.body
    const html = document.documentElement
    Object.assign(body.style, bodyStyles)
    Object.assign(html.style, htmlStyles)
    bodyStyles = null
    htmlStyles = null
    window.scrollTo(0, lockedScrollY)
  }
}

export function useBodyScrollLock(active: boolean, mediaQuery?: string) {
  useEffect(() => {
    if (!active) return
    if (!mediaQuery) return acquireScrollLock()

    const media = window.matchMedia(mediaQuery)
    let release: (() => void) | null = null
    const sync = () => {
      if (media.matches && !release) release = acquireScrollLock()
      else if (!media.matches && release) {
        release()
        release = null
      }
    }
    sync()
    media.addEventListener('change', sync)
    return () => {
      media.removeEventListener('change', sync)
      release?.()
    }
  }, [active, mediaQuery])
}
