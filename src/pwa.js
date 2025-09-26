// src/pwa.js
import { registerSW } from 'virtual:pwa-register'

export function initPWA() {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // (opsional) tampilkan toast update tersedia
      console.log('PWA: update tersedia. Reload untuk versi terbaru.')
    },
    onOfflineReady() {
      console.log('PWA: siap offline ✔️')
    },
  })
}
