/// <reference types="vite/client" />
import type { NoetakerApi } from '../../shared/types'

declare global {
  interface Window { noetaker: NoetakerApi }
}
