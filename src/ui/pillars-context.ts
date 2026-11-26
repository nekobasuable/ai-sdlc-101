import { createContext, useContext } from 'react'
import { DEFAULT_PILLARS, type Pillar } from '../domain/pillars'

// 人生の柱を、画面のどこからでも引けるようにする(plan/022)。App が設定から渡す
export const PillarsContext = createContext<readonly Pillar[]>(DEFAULT_PILLARS)

export function usePillars(): readonly Pillar[] {
  return useContext(PillarsContext)
}
