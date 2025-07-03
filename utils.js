// Formate une date JS en chaîne au format DD/MM/YYYY HH:mm
window.formatDateFR = (date) => {
  let pad = n => n.toString().padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Parse une chaîne de date au format DD/MM/YYYY HH:mm vers un objet Date JS
window.parseDateFR = (str) => {
  let [datePart, timePart] = str.split(' ')
  if (!datePart || !timePart) return null
  let [day, month, year] = datePart.split('/').map(Number)
  let [hour, minute] = timePart.split(':').map(Number)
  if ([day, month, year, hour, minute].some(isNaN)) return null
  return new Date(year, month - 1, day, hour, minute)
}

// Injecte une valeur dans un champ texte avec déclenchement d'événements
window.setTextFieldValue = (selector, value) => {
  let el = document.querySelector(selector)
  if (!el) return
  let setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new Event('blur', { bubbles: true }))
}

// Injecte une valeur dans un champ texte si vide
window.setTextFieldValueIfEmpty = (selector, value) => {
  let el = document.querySelector(selector)
  if (!el || el.value) return
  window.setTextFieldValue(selector, value)
}

// Injecte une valeur dans un champ texte si plus petite
window.setTextFieldValueIfMax = (selector, value) => {
  let el = document.querySelector(selector)
  if (!el) return

  let parsedElValue = el.value.replace(/\D/g, "")
  let parsedValue = value.replace(/\D/g, "")

  if (parsedElValue >= parsedValue) return
  window.setTextFieldValue(selector, value)
}