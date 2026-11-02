import { createContext, useContext } from 'react'
import { en } from './en'
import { ko, type Messages } from './ko'

export type Language = 'ko' | 'en'
export const LANGUAGES: Language[] = ['ko', 'en']
export const DICTIONARIES: Record<Language, Messages> = { ko, en }
export const parseLanguage = (value: unknown): Language => (value === 'en' ? 'en' : 'ko')

// Korean is the default. Plain library code (validation errors, generated step names, durations)
// reads the active language from here; React components use `useT()`.
let active: Language = 'ko'
export const setLanguage = (language: Language) => { active = language }
export const getLanguage = () => active
export const t = (): Messages => DICTIONARIES[active]

export const I18nContext = createContext<Messages>(ko)
export const useT = () => useContext(I18nContext)
export type { Messages }
