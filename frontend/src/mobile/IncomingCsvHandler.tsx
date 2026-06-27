import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { consumeIncomingCsv } from './consumeIncomingCsv'

/** Po zalogowaniu / powrocie do apki: plik CSV z intentu → ekran importu. */
export default function IncomingCsvHandler() {
  const navigate = useNavigate()

  const tryConsume = useCallback(() => {
    void consumeIncomingCsv().then((incoming) => {
      if (!incoming) {
        return
      }
      navigate('/import/nowy', {
        replace: true,
        state: { incomingCsv: incoming },
      })
    })
  }, [navigate])

  useEffect(() => {
    tryConsume()

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        tryConsume()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [tryConsume])

  return null
}
