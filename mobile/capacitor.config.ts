import type { CapacitorConfig } from '@capacitor/cli'

/**
 * SamFin Android — WebView ładuje produkcyjny frontend z serwera.
 *
 * Zmiany w React (frontend/) wymagają deployu web (`make deploy`).
 * Zmiany natywne (AndroidManifest, pluginy) wymagają przebudowy APK w Android Studio.
 *
 * Dev (opcjonalnie): ustaw server.url na http://<twoje-LAN-IP>:5173
 * i cleartext: true — patrz mobile/README.md.
 */
const config: CapacitorConfig = {
  appId: 'pl.samsoft.samfin',
  appName: 'SamFin',
  // Placeholder dla `cap sync` — w runtime WebView ładuje server.url poniżej.
  webDir: 'www',
  server: {
    url: 'https://fin.samsoft.pl/app/',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: ['fin.samsoft.pl'],
  },
  android: {
    allowMixedContent: false,
    adjustMarginsForEdgeToEdge: 'auto',
  },
}

export default config
