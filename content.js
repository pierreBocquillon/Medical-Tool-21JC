const main = async () => {
  // Récupération des cas types depuis le fichier JSON local
  const json = await fetch(chrome.runtime.getURL("cases.json")).then(res => res.json())

  // Crée le sélecteur de cas types + bouton de calcul de date
  const createSelect = () => {
    const container = document.createElement("div")
    container.id = "rapport-helper-select-container"
    container.style.cssText = "margin: 10px 0; display: flex; align-items: center; gap: 10px"

    const select = document.createElement("select")
    select.innerHTML = `<option value="">-- Sélectionner un cas type --</option>`
    Object.keys(json).forEach(cas => {
      const opt = document.createElement("option")
      opt.value = cas
      opt.textContent = cas
      select.appendChild(opt)
    })

    // Stylisation sombre du select
    Object.assign(select.style, {
      backgroundColor: "#1e1e1e", color: "#eee", border: "1px solid #555",
      padding: "6px 8px", borderRadius: "4px", fontSize: "14px"
    })

    const button = document.createElement("button")
    button.type = "button"
    button.textContent = "Calculer la date de contrôle"
    Object.assign(button.style, {
      backgroundColor: "#2a2a2a", color: "#eee", border: "1px solid #555",
      padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "14px"
    })

    button.addEventListener("mouseenter", () => button.style.backgroundColor = "#333")
    button.addEventListener("mouseleave", () => button.style.backgroundColor = "#2a2a2a")

    button.addEventListener("click", () => {
      const inputDate = document.querySelector('input[name="admission"]')
      const inputDuration = document.querySelector('input[name="disabilityDuration"]')
      const date = parseDateFR(inputDate?.value)
      const duration = inputDuration?.value
      if (!date || !duration || !duration.includes(":")) return
      const [h, m, s] = duration.split(":").map(Number)
      const controlDate = new Date(date.getTime() + ((h * 3600 + m * 60 + s) * 1000))
      setTextFieldValue('input[name="controlVisit"]', formatDateFR(controlDate))
    })

    // Lorsque l'on sélectionne un cas, on remplit automatiquement le formulaire
    select.addEventListener("change", () => {
      const data = json[select.value]
      if (!data) return

      const setValue = (selector, value) => setTextFieldValue(selector, value)

      setValue('input[name="type"]', data.type)
      setValue('input[name="zip"]', data.codePostal)
      setValue('input[name="disabilityDuration"]', data.dureeInvalidite)
      setValue('textarea[name="injuriesRemark"]', data.blessures)
      setValue('textarea[name="examinationsRemark"]', data.examens)
      setValue('textarea[name="treatmentsRemark"]', data.traitements)
      setValue('textarea[name="remark"]', data.remarques)

      const now = new Date()
      setValue('input[name="admission"]', formatDateFR(now))

      const [h, m, s] = data.dureeInvalidite.split(":").map(Number)
      const ctrlDate = new Date(now.getTime() + ((h * 3600 + m * 60 + s) * 1000))
      setValue('input[name="controlVisit"]', formatDateFR(ctrlDate))

      // Cases à cocher
      ;[1, 2, 3, 4].forEach(num => {
        const label = [...document.querySelectorAll("label")].find(l => l.textContent.includes(`(${num})`))
        const box = label?.querySelector('input[name="disabilities"]')
        const shouldBeChecked = (data.incapacites || []).includes(num)
        if (box && box.checked !== shouldBeChecked) box.click()
      })

      // Checkbox coma
      const comaLabel = [...document.querySelectorAll("label")].find(l => l.textContent.includes("Coma"))
      const comaBox = comaLabel?.querySelector('input[name="disability"]')
      const comaShouldBeChecked = !!data.coma
      if (comaBox && comaBox.checked !== comaShouldBeChecked) comaBox.click()
    })

    container.appendChild(select)
    container.appendChild(button)
    return container
  }

  // Injecte le select si le formulaire médical est détecté
  const injectSelectIfNeeded = () => {
    const title = [...document.querySelectorAll("h5")].find(el => el.textContent.includes("Nouveau rapport medical"))
    const alreadyInjected = document.querySelector("#rapport-helper-select-container")
    if (title && !alreadyInjected) {
      title.after(createSelect())
    }
  }

  // Ajoute les boutons "Modifier VM" et "Modifier DDS"
  const ajouterBoutonsDateAuto = () => {
    const vmInput = document.querySelector('input[name="medicalVisitDate"]')
    const ddsInput = document.querySelector('input[name="bloodDonationDate"]')
    if (!vmInput || !ddsInput || document.getElementById("modif-vm-btn")) return

    const injectButton = (label, id, targetInput) => {
      const btn = document.createElement("button")
      btn.id = id
      btn.type = "button"
      btn.textContent = label
      Object.assign(btn.style, {
        marginTop: "4px", backgroundColor: "#2a2a2a", color: "#eee",
        border: "1px solid #555", padding: "4px 10px", borderRadius: "4px",
        cursor: "pointer", fontSize: "12px", marginRight: "8px"
      })

      btn.addEventListener("click", () => {
        const dateStr = formatDateFR(new Date())
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(targetInput), 'value')?.set
        if (setter) setter.call(targetInput, dateStr)
        targetInput.dispatchEvent(new Event('input', { bubbles: true }))
        targetInput.dispatchEvent(new Event('change', { bubbles: true }))
      })

      const wrapper = document.createElement("div")
      wrapper.style.marginTop = "4px"
      wrapper.appendChild(btn)
      targetInput.parentElement.parentElement.appendChild(wrapper)
    }

    injectButton("Modifier VM", "modif-vm-btn", vmInput)
    injectButton("Modifier DDS", "modif-dds-btn", ddsInput)
  }

  // Exécution régulière pour vérifier l'état du DOM
  setInterval(injectSelectIfNeeded, 500)
  setInterval(ajouterBoutonsDateAuto, 500)
}

// Exécute le script principal
main()