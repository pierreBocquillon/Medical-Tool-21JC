
(async () => {
  const secretCode = "21JC"
  const injuries = await fetch(chrome.runtime.getURL("data/injuries.json")).then(res => res.json())

  /** Crée uniquement le menu déroulant des cas types */
  function createSelect() {
    const select = document.createElement("select")
    Object.keys(injuries).forEach(cas => {
      const opt = document.createElement("option")
      opt.value = cas
      opt.textContent = cas
      select.appendChild(opt)
    })

    Object.assign(select.style, {
      backgroundColor: "#1e1e1e", color: "#eee", border: "1px solid #555",
      padding: "6px 8px", borderRadius: "4px", fontSize: "16px", width: "100%",
    })

    select.id = "rapport-helper-select"
    select.addEventListener("change", () => handleCaseSelection(select.value))
    return select
  }

  /** Crée le message d’info */
  function createInfoMessage() {
    const p = document.createElement("p")
    p.textContent = "INFO : Pour le bon fonctionnement de l'outil, il est preferable d'ajouter en priorité les blessures les plus graves."
    p.style.cssText = "color: teal; font-size: 14px; margin: 0; text-align: center; padding: 0; margin: 0;"
    p.id = "rapport-helper-info"
    return p
  }

  /** Crée le message d’alerte */
  function createAlert() {
    const p = document.createElement("p")
    p.textContent = "ATTENTION : Ces cas ne sont que des exemples courants et doivent être ajustés en fonction de la situation."
    p.style.cssText = "color: Coral; font-size: 14px; margin: 0; text-align: center; padding: 0; margin: 0;"
    p.id = "rapport-helper-alert"
    return p
  }

  /** Crée le bouton de recalcul de date */
  function createDateCalculatorButton() {
    const button = document.createElement("button")
    button.type = "button"
    button.textContent = "🔄️"
    button.id = "rapport-helper-calc-btn"

    Object.assign(button.style, {
      backgroundColor: "#2a2a2a", color: "#eee", border: "1px solid #555",
      padding: "0", borderRadius: "4px", cursor: "pointer", fontSize: "26px"
    })

    button.addEventListener("mouseenter", () => button.style.backgroundColor = "#333")
    button.addEventListener("mouseleave", () => button.style.backgroundColor = "#2a2a2a")

    button.addEventListener("click", () => {
      const inputDate = document.querySelector('input[name="admission"]')
      const inputDuration = document.querySelector('input[name="disabilityDuration"]')
      const date = window.parseDateFR(inputDate?.value)
      const duration = inputDuration?.value
      if (!date || !duration || !duration.includes(":")) return

      const [h, m, s] = duration.split(":").map(Number)
      const controlDate = new Date(date.getTime() + ((h * 3600 + m * 60 + s) * 1000))
      window.setTextFieldValue('input[name="controlVisit"]', window.formatDateFR(controlDate))
    })

    return button
  }

  /** Gère le remplissage du formulaire à partir d’un cas type */
  function handleCaseSelection(key) {
    const data = injuries[key]
    if (!data) return

    const setValue = (selector, value) => window.setTextFieldValue(selector, value)
    const setValueIfEmpty = (selector, value) => window.setTextFieldValueIfEmpty(selector, value)
    const setValueIfMax = (selector, value) => window.setTextFieldValueIfMax(selector, value)

    setValue('input[name="type"]', data.type)
    setValueIfEmpty('input[name="zip"]', data.codePostal)
    setValueIfMax('input[name="disabilityDuration"]', data.dureeInvalidite)

    addBlessures(data.blessures)
    addExamens(data.examens)
    addTraitements(data.traitements)
    addRemarques(data.remarques)

    const now = new Date()
    setValue('input[name="admission"]', window.formatDateFR(now))

    const [h, m, s] = data.dureeInvalidite.split(":").map(Number)
    const ctrlDate = new Date(now.getTime() + ((h * 3600 + m * 60 + s) * 1000))
    setValue('input[name="controlVisit"]', window.formatDateFR(ctrlDate))

    ;[1, 2, 3, 4].forEach(num => {
      const label = [...document.querySelectorAll("label")].find(l => l.textContent.includes(`(${num})`))
      const box = label?.querySelector('input[name="disabilities"]')
      if (box && !box.checked && box.checked !== (data.incapacites || []).includes(num)) box.click()
    })

    const comaLabel = [...document.querySelectorAll("label")].find(l => l.textContent.includes("Coma"))
    const comaBox = comaLabel?.querySelector('input[name="disability"]')
    if (comaBox && !comaBox.checked && comaBox.checked !== !!data.coma) comaBox.click()

    setTimeout(() => {
      const select = document.querySelector("#rapport-helper-select")
      if (select) {
        select.value = Object.keys(injuries)[0] || "-- Sélectionner une blessure --"
      }
    }, 300)
  }

  /** Ajoute les blessures au formulaire */
  function addBlessures(blessures) {
    let field = document.querySelector('textarea[name="injuriesRemark"]')
    let parsedValue = field.value.trim().split("+").map(s => s.trim()).filter(s => s)

    let newValue = parsedValue.concat(blessures)
    newValue = [...new Set(newValue)]

    window.setTextFieldValue('textarea[name="injuriesRemark"]', newValue.join(" + "))
  }

  /** Ajoute les examens au formulaire */
  function addExamens(examens) {
    let field = document.querySelector('textarea[name="examinationsRemark"]')
    let parsedValue = field.value.trim().split("//").map(s => s.trim()).filter(s => s)
    
    parsedValue = parsedValue.map(s => {
      const parts = s.split(":")
      if (parts.length > 1) {
        const key = parts[0].trim()
        const values = parts.slice(1).join(":").trim().split("+").map(v => v.trim())
        return { [key]: values }
      }else{
        const values = s.split("+").map(v => v.trim())
        if (values.length >= 1) {
          return { "Autres": values }
        }
      }
    })
    
    parsedValue = parsedValue.reduce((acc, obj) => {
      for (let key in obj) {
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key] = acc[key].concat(obj[key])
      }
      return acc
    }, {})

    let newValue = parsedValue
    for (let key in examens) {
      if (!newValue[key]) {
        newValue[key] = []
      }
      newValue[key] = newValue[key].concat(examens[key])
      newValue[key] = [...new Set(newValue[key])]
      if (newValue[key].length === 0) {
        delete newValue[key]
      }
    }

    const order = ["Constantes", "Auscultation", "Radio", "Echo", "IRM", "Scanner", "Ethylometre", "Test", "Autres"]
    newValue = Object.keys(newValue).sort((a, b) => {
      return order.indexOf(a) - order.indexOf(b)
    }).reduce((acc, key) => {
      acc[key] = newValue[key]
      return acc
    }, {})

    newValue = Object.entries(newValue).map(([key, values]) => {
      return `${key}: ${values.join(" + ")}`
    }).join(" // ").replace("RAS + ","").replace("+ RAS","").replace("Autres: ", "")

    window.setTextFieldValue('textarea[name="examinationsRemark"]', newValue)
  }

  /** Ajoute les traitements au formulaire */
  function addTraitements(traitements) {
    let field = document.querySelector('textarea[name="treatmentsRemark"]')
    let parsedValue = field.value.trim().split("//").map(s => s.trim()).filter(s => s)
    
    parsedValue = parsedValue.map(s => {
      const parts = s.split(":")
      if (parts.length > 1) {
        const key = parts[0].trim()
        const values = parts.slice(1).join(":").trim().split("+").map(v => v.trim())
        return { [key]: values }
      }else{
        const values = s.split("+").map(v => v.trim())
        if (values.length >= 1) {
          return { "Autres": values }
        }
      }
    })
    
    let counter = 0
    for(let obj of parsedValue) {
      if (obj.Autres) {
        if (counter === 0) {
          obj.Manipulations = obj.Autres
          delete obj.Autres
          counter++
        }else if (counter === 1) {
          obj.Medicaments = obj.Autres
          delete obj.Autres
          counter++
        }
      }
    }

    let hasChirAG = parsedValue.some(obj => obj["Chir AG"] != undefined && obj["Chir AG"].length > 0)
    if (hasChirAG) {
      parsedValue = parsedValue.map(obj => {
        if (obj["Chir AL"]) {
          obj["Chir AG"] = obj["Chir AL"]
          delete obj["Chir AL"]
        }
        return obj
      })
    }
    
    parsedValue = parsedValue.reduce((acc, obj) => {
      for (let key in obj) {
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key] = acc[key].concat(obj[key])
      }
      return acc
    }, {})

    let newValue = parsedValue
    for (let key in traitements) {
      if (!newValue[key]) {
        newValue[key] = []
      }
      newValue[key] = newValue[key].concat(traitements[key])
      newValue[key] = [...new Set(newValue[key])]
      if (newValue[key].length === 0) {
        delete newValue[key]
      }
    }

    if (newValue["Chir AL"] && newValue["Chir AL"].length > 0 && newValue["Chir AG"] && newValue["Chir AG"].length > 0) {
      newValue["Chir AG"] = newValue["Chir AG"].concat(newValue["Chir AL"])
      delete newValue["Chir AL"]
    }

    for (let key in newValue) {
      newValue[key] = [...new Set(newValue[key])]
    }

    const order = ["Chir AG", "Chir AL", "Manipulations", "Medicaments", "Autres"]
    newValue = Object.keys(newValue).sort((a, b) => {
      return order.indexOf(a) - order.indexOf(b)
    }).reduce((acc, key) => {
      acc[key] = newValue[key]
      return acc
    }, {})


    newValue = Object.entries(newValue).map(([key, values]) => {
      return `${key}: ${values.join(" + ")}`
    }).join(" // ").replace("Manipulations: ", "").replace("Medicaments: ", "").replace("Autres: ", "")

    window.setTextFieldValue('textarea[name="treatmentsRemark"]', newValue)
  }

  /** Ajoute les remarques au formulaire */
  function addRemarques(remarques) {
    let field = document.querySelector('textarea[name="remark"]')
    let parsedValue = field.value.trim()

    parsedValue = parsedValue.replace("VISITE MEDICALE // TEST EFFORT [OK] // [APPROUVÉ AU SERVICE]", "[[VMSP]]")
    parsedValue = parsedValue.replace("VISITE MEDICALE // [APPROUVÉ AU SERVICE]", "[[VMC]]")

    parsedValue = parsedValue.split("//").map(s => s.trim()).filter(s => s)

    parsedValue = parsedValue.map(s => {
      const parts = s.split(":")
      if (parts.length > 1) {
        const key = parts[0].trim()
        const values = parts.slice(1).join(":").trim().split("+").map(v => v.trim())
        return { [key]: values }
      }else{
        const values = s.split("+").map(v => v.trim())
        if (values.length >= 1) {
          return { "Autres": values }
        }
      }
    })
    
    parsedValue = parsedValue.reduce((acc, obj) => {
      for (let key in obj) {
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key] = acc[key].concat(obj[key])
      }
      return acc
    }, {})

    let newValue = parsedValue
    for (let key in remarques) {
      if (!newValue[key]) {
        newValue[key] = []
      }
      remarques[key] = remarques[key].map(v => {
        return v.replace("VISITE MEDICALE // TEST EFFORT [OK] // [APPROUVÉ AU SERVICE]", "[[VMSP]]")
          .replace("VISITE MEDICALE // [APPROUVÉ AU SERVICE]", "[[VMC]]")
          .trim()
      })

      newValue[key] = newValue[key].concat(remarques[key])
      newValue[key] = [...new Set(newValue[key])]
      if (newValue[key].length === 0) {
        delete newValue[key]
      }
    }

    const order = ["Pret", "Facturation", "Autres"]
    newValue = Object.keys(newValue).sort((a, b) => {
      return order.indexOf(a) - order.indexOf(b)
    }).reduce((acc, key) => {
      acc[key] = newValue[key]
      return acc
    }, {})

    newValue = Object.entries(newValue).map(([key, values]) => {
      return `${key}: ${values.join(" + ")}`
    }).join(" // ").replace("Autres: ", "")

    newValue = newValue.replace("[[VMSP]]", "VISITE MEDICALE // TEST EFFORT [OK] // [APPROUVÉ AU SERVICE]")
    newValue = newValue.replace("[[VMC]]", "VISITE MEDICALE // [APPROUVÉ AU SERVICE]")

    window.setTextFieldValue('textarea[name="remark"]', newValue)
  }  

  /** Injection : menu déroulant */
  function injectSelect() {
    const title = [...document.querySelectorAll("h5")].find(el => el.textContent.includes("Nouveau rapport medical") || el.textContent.includes("Modifier le rapport médical"))
    if (!title || document.querySelector("#rapport-helper-select")) return

    const container = document.createElement("div")
    container.id = "rapport-helper-select-container"
    container.style.cssText = "margin: 10px 0; display: flex; flex-direction: column; align-items: center; gap: 10px"

    container.appendChild(createSelect())
    title.after(container)
  }

  /** Injection : message d’information et d’alerte */
  function injectAlert() {
    if (document.querySelector("#rapport-helper-alert")) return
    if (document.querySelector("#rapport-helper-info")) return

    let container = document.createElement("div")
    container.id = "rapport-helper-alert-container"

    const info = createInfoMessage()
    const alert = createAlert()

    container.appendChild(info)
    container.appendChild(alert)

    const selectContainer = document.querySelector("#rapport-helper-select-container")

    if (selectContainer) selectContainer.appendChild(container)
  }

  /** Injection : bouton de calcul */
  function injectDateCalculatorButton() {
    if (document.querySelector("#rapport-helper-calc-btn")) return
    if (document.querySelector('input[name="controlVisit"]')) {
      let inputWrapper = document.querySelector('input[name="controlVisit"]').parentElement.parentElement.parentElement
      if (inputWrapper) inputWrapper.appendChild(createDateCalculatorButton())
    }
  }

  /** Injection de l’icône de l’extension */
  function injectIcon() {
    const target = document.querySelector("#rapport-helper-icon-container")
    if (!window.location.href.includes("https://intra.21jumpclick.fr/medical/files")) {
      if (target) target.remove()
      return
    }
    if (target) return

    const iconContainer = document.createElement("div")
    iconContainer.id = "rapport-helper-icon-container"
    iconContainer.style.cssText = "position: absolute; top: 10px; right: 10px; z-index: 9999; display: flex; flex-direction: column; align-items: center;"

    const icon = document.createElement("img")
    icon.src = chrome.runtime.getURL("icons/128.png")
    icon.style.cssText = "width: 48px; height: 48px; z-index: 1; border-radius: 16px;"

    const version = chrome.runtime.getManifest().version
    const title = document.createElement("p")
    title.innerHTML = `Medical Tool 21JC </br> v${version}`
    if(localStorage.getItem("user") != atob(secretCode)) {
      title.innerHTML += ` - Lite`
      title.innerHTML += `<br> <a id="unlock-btn" style="color: #955C36; text-decoration: underline; cursor: pointer;">Debloquer</a>`
    }
    title.style.cssText = "color: #5C9336; font-size: 14px; margin: 0; text-align: center;"

    iconContainer.appendChild(icon)
    iconContainer.appendChild(title)
    document.body.appendChild(iconContainer)

    const unlockBtn = document.getElementById("unlock-btn")
    if (unlockBtn) {
      unlockBtn.addEventListener("click", () => {
        const user = prompt("Entrez le code de déblocage :")
        localStorage.setItem("user", atob(user))
        if (user === secretCode) {
          alert("Toutes les fonctionnalités ont été débloquées !")
          location.reload()
        } else {
          alert("Code incorrect. Essayez à nouveau.")
        }
      })
    }
  }

  /** Injection : bouton VM */
  function injectVMButton() {
    if (document.getElementById("modif-vm-btn")) return

    const input = document.querySelector('input[name="medicalVisitDate"]')
    if (!input) return
    injectDateButton("⚕️ VM Maintenant", "modif-vm-btn", input)
  }

  /** Injection : bouton DDS */
  function injectDDSButton() {
    if (document.getElementById("modif-dds-btn")) return

    const input = document.querySelector('input[name="bloodDonationDate"]')
    if (!input) return
    injectDateButton("🩸 DDS Maintenant", "modif-dds-btn", input)
  }

  /** Utilitaire de création de bouton de date immédiate */
  function injectDateButton(label, id, input) {
    const btn = document.createElement("button")
    btn.id = id
    btn.type = "button"
    btn.textContent = label
    btn.style.cssText = "margin-top: 4px; background-color: #2a2a2a; color: #eee; border: 1px solid #555; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%;"

    btn.addEventListener("click", () => {
      const dateStr = window.formatDateFR(new Date())
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set
      if (setter) setter.call(input, dateStr)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const wrapper = document.createElement("div")
    wrapper.style.marginTop = "4px"
    wrapper.appendChild(btn)
    input.parentElement.parentElement.appendChild(wrapper)
  }

  /** Boucles d’injection toutes les 500 ms */
  setInterval(() => {
    injectIcon()
    if(localStorage.getItem("user") == atob(secretCode)) {
      injectSelect()
      injectAlert()
    }
    injectDateCalculatorButton()
    injectVMButton()
    injectDDSButton()
  }, 500)
})()
