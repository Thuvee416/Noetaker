import { app } from 'electron'
import { matchLocale } from '../shared/i18n'

/** The computer's language, among Noe Taker's. NOETAKER_SYSTEM_LANGUAGES stands in for the computer's list (tests) */
export const systemLocale = () => matchLocale(process.env.NOETAKER_SYSTEM_LANGUAGES?.split(',') ?? app.getPreferredSystemLanguages())
