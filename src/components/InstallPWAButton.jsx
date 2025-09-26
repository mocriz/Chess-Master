import React, { useEffect, useState } from 'react'

let deferred = null

export default function InstallPWAButton() {
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      deferred = e
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!canInstall) return null

  return (
    <button
      onClick={async () => {
        if (!deferred) return
        deferred.prompt()
        const { outcome } = await deferred.userChoice
        if (outcome !== 'dismissed') setCanInstall(false)
        deferred = null
      }}
      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      Install
    </button>
  )
}
