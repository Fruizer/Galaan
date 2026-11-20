import { useState, type ReactNode } from 'react'

interface AvatarContentProps {
  src?: string
  fallback: ReactNode
}

export function AvatarContent({ src, fallback }: AvatarContentProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  return <>
    <span className="avatar-fallback">{fallback}</span>
    {src && src !== failedSrc && <img className="avatar-photo" src={src} alt="" onError={() => { setFailedSrc(src); window.dispatchEvent(new Event('galaan:avatar-error')) }} />}
  </>
}
