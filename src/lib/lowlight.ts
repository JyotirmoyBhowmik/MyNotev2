import { createLowlight, common } from 'lowlight'

export const lowlight = createLowlight(common)

// Add specific languages if needed
import js from 'highlight.js/lib/languages/javascript'
import ts from 'highlight.js/lib/languages/typescript'
import css from 'highlight.js/lib/languages/css'

lowlight.register('javascript', js)
lowlight.register('typescript', ts)
lowlight.register('css', css)
