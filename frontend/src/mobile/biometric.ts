import { isNativeApp } from './platform'

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNativeApp()) {
    return false
  }

  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
    const result = await NativeBiometric.isAvailable()
    return result.isAvailable
  } catch {
    return false
  }
}

export async function promptBiometricUnlock(): Promise<boolean> {
  if (!isNativeApp()) {
    return false
  }

  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
    await NativeBiometric.verifyIdentity({
      reason: 'Odblokuj SamFin',
      title: 'SamFin',
      subtitle: 'Uwierzytelnij się, aby kontynuować',
      description: '',
    })
    return true
  } catch {
    return false
  }
}
