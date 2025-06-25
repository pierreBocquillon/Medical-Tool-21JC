
// Formate une date JS en chaîne au format DD/MM/YYYY HH:mm
const formatDateFR = (date) => {
  const pad = n => n.toString().padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Parse une chaîne de date au format DD/MM/YYYY HH:mm vers un objet Date JS
const parseDateFR = (str) => {
  const [datePart, timePart] = str.split(' ')
  if (!datePart || !timePart) return null
  const [day, month, year] = datePart.split('/').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  if ([day, month, year, hour, minute].some(isNaN)) return null
  return new Date(year, month - 1, day, hour, minute)
}

// Injecte une valeur dans un champ texte avec déclenchement d'événements
const setTextFieldValue = (selector, value) => {
  const el = document.querySelector(selector)
  if (!el) return
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new Event('blur', { bubbles: true }))
}