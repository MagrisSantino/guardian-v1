'use client'
import { createContext, useContext, useState } from 'react'
import { LoadScript } from '@react-google-maps/api'

const LIBRARIES: ['places'] = ['places']
const MapsCtx = createContext(false)

export function useGoogleMapsLoaded() {
  return useContext(MapsCtx)
}

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
      libraries={LIBRARIES}
      onLoad={() => setLoaded(true)}
    >
      <MapsCtx.Provider value={loaded}>{children}</MapsCtx.Provider>
    </LoadScript>
  )
}
