const STORAGE_KEY = 'color-theme'
const DEFAULT_THEME = 'slate'

type ColorTheme = {
  id: string
  label: string
  preview: string // representative CSS color for the swatch
}

const COLOR_THEMES: ColorTheme[] = [
  { id: 'slate', label: 'Slate', preview: 'oklch(0.32 0.032 265.755)' },
  { id: 'ocean', label: 'Ocean', preview: 'oklch(0.55 0.18 240)' },
  { id: 'emerald', label: 'Emerald', preview: 'oklch(0.55 0.17 160)' },
  { id: 'sunset', label: 'Sunset', preview: 'oklch(0.65 0.19 50)' },
  { id: 'rose', label: 'Rose', preview: 'oklch(0.55 0.2 350)' },
]

function getColorTheme(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME
}

function setColorTheme(id: string) {
  localStorage.setItem(STORAGE_KEY, id)
  applyColorTheme(id)
}

function applyColorTheme(id: string) {
  const el = document.documentElement
  if (id === DEFAULT_THEME) {
    el.removeAttribute('data-theme')
  } else {
    el.setAttribute('data-theme', id)
  }
}

export { COLOR_THEMES, getColorTheme, setColorTheme, applyColorTheme }
export type { ColorTheme }
