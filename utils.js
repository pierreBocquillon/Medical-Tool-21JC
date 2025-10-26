// Formate une date JS en chaîne au format DD/MM/YYYY HH:mm
window.formatDateFR = (date) => {
  let pad = n => n.toString().padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Get Timezone offset in hours
window.getTimezoneOffsetFor = (timeZone, date = new Date()) => {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));

  // Même convention que getTimezoneOffset() :
  // nombre de minutes à AJOUTER à l'heure locale pour obtenir l'heure UTC
  return (utcDate - tzDate) / 60000;
}

// Calcule la distance de Levenshtein entre deux chaînes
window.levenshtein = (a, b) => {
    const matrix = []
    let i, j;

    // Si l'un des deux est vide
    if (!a.length) return b.length
    if (!b.length) return a.length

    // Initialisation
    for (i = 0; i <= b.length; i++) {
        matrix[i] = [i]
    }
    for (j = 0; j <= a.length; j++) {
        matrix[0][j] = j
    }

    // Remplissage
    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                )
            }
        }
    }

    return matrix[b.length][a.length]
}

// Vérifie si un mot est présent dans un texte avec une tolérance d'approximation
window.contientApprox = (texte, mot, tolerance = 2) => {
    const mots = texte.toLowerCase().split(/\W+/);
    return mots.some(m => levenshtein(m, mot.toLowerCase()) <= tolerance);
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