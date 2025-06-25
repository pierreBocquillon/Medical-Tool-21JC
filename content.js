(async () => {
  // Récupération des cas types depuis le fichier JSON local
  let json = await fetch(chrome.runtime.getURL("cases.json")).then(res => res.json())

  // Crée le sélecteur de cas types + bouton de calcul de date
  let createSelect = () => {
    let container = document.createElement("div")
    container.id = "rapport-helper-select-container"
    container.style.cssText = "margin: 10px 0; display: flex; flex-direction: column; align-items: center; gap: 10px"

    let select = document.createElement("select")
    Object.keys(json).forEach(cas => {
      let opt = document.createElement("option")
      opt.value = cas
      opt.textContent = cas
      select.appendChild(opt)
    })

    // Stylisation sombre du select
    Object.assign(select.style, {
      backgroundColor: "#1e1e1e", color: "#eee", border: "1px solid #555",
      padding: "6px 8px", borderRadius: "4px", fontSize: "16px", width: "100%",
    })

    let button = document.createElement("button")
    button.type = "button"
    button.textContent = "🔄️"
    Object.assign(button.style, {
      backgroundColor: "#2a2a2a", color: "#eee", border: "1px solid #555",
      padding: "0", borderRadius: "4px", cursor: "pointer", fontSize: "26px"
    })

    button.addEventListener("mouseenter", () => button.style.backgroundColor = "#333")
    button.addEventListener("mouseleave", () => button.style.backgroundColor = "#2a2a2a")

    button.addEventListener("click", () => {
      let inputDate = document.querySelector('input[name="admission"]')
      let inputDuration = document.querySelector('input[name="disabilityDuration"]')
      let date = window.parseDateFR(inputDate?.value)
      let duration = inputDuration?.value
      if (!date || !duration || !duration.includes(":")) return
      let [h, m, s] = duration.split(":").map(Number)
      let controlDate = new Date(date.getTime() + ((h * 3600 + m * 60 + s) * 1000))
      window.setTextFieldValue('input[name="controlVisit"]', window.formatDateFR(controlDate))
    })

    // Lorsque l'on sélectionne un cas, on remplit automatiquement le formulaire
    select.addEventListener("change", () => {
      let data = json[select.value]
      if (!data) return

      let setValue = (selector, value) => window.setTextFieldValue(selector, value)

      setValue('input[name="type"]', data.type)
      setValue('input[name="zip"]', data.codePostal)
      setValue('input[name="disabilityDuration"]', data.dureeInvalidite)
      setValue('textarea[name="injuriesRemark"]', data.blessures)
      setValue('textarea[name="examinationsRemark"]', data.examens)
      setValue('textarea[name="treatmentsRemark"]', data.traitements)
      setValue('textarea[name="remark"]', data.remarques)

      let now = new Date()
      setValue('input[name="admission"]', window.formatDateFR(now))

      let [h, m, s] = data.dureeInvalidite.split(":").map(Number)
      let ctrlDate = new Date(now.getTime() + ((h * 3600 + m * 60 + s) * 1000))
      setValue('input[name="controlVisit"]', window.formatDateFR(ctrlDate))

      // Cases à cocher
      ;[1, 2, 3, 4].forEach(num => {
        let label = [...document.querySelectorAll("label")].find(l => l.textContent.includes(`(${num})`))
        let box = label?.querySelector('input[name="disabilities"]')
        let shouldBeChecked = (data.incapacites || []).includes(num)
        if (box && box.checked !== shouldBeChecked) box.click()
      })

      // Checkbox coma
      let comaLabel = [...document.querySelectorAll("label")].find(l => l.textContent.includes("Coma"))
      let comaBox = comaLabel?.querySelector('input[name="disability"]')
      let comaShouldBeChecked = !!data.coma
      if (comaBox && comaBox.checked !== comaShouldBeChecked) comaBox.click()
    })

    let alertMessage = document.createElement("p")
    alertMessage.textContent = "ATTENTION : Ces cas ne sont que des exemples courants et doivent etre ajustés en fonction de la situation."
    alertMessage.style.cssText = "color: Coral; font-size: 14px; margin: 0; text-align: center;"

    container.appendChild(select)
    container.appendChild(alertMessage)
    document.querySelector('input[name="controlVisit"]').parentElement.parentElement.parentElement.appendChild(button)
    return container
  }

  // Injecte le select si le formulaire médical est détecté
  let injectSelectIfNeeded = () => {
    let title = [...document.querySelectorAll("h5")].find(el => el.textContent.includes("Nouveau rapport medical"))
    let alreadyInjected = document.querySelector("#rapport-helper-select-container")
    if (title && !alreadyInjected) {
      title.after(createSelect())
    }
  }

  // Injecte l'icone de l'extension
  let injectIcon = () => {
    if(!window.location.href.includes("https://intra.21jumpclick.fr/medical/files") ) {
      document.querySelector("#rapport-helper-icon-container")?.remove()
      return
    }
    if (document.querySelector("#rapport-helper-icon-container")) return
    
    let iconContainer = document.createElement("div")
    iconContainer.id = "rapport-helper-icon-container"
    iconContainer.style.cssText = "position: absolute; top: 10px; right: 10px; z-index: 9999; display: flex; flex-direction: column; align-items: center;"
    
    let icon = document.createElement("img")
    icon.src = "data:image/png;base64,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"
    icon.style.cssText = "width: 32px; height: 32px; z-index: 1; border-radius: 100%;"

    let version = chrome.runtime.getManifest().version
    
    let title = document.createElement("p")
    title.innerHTML = "Medical Tool 21JC </br> v"+version
    title.style.cssText = "color: #5C9336; font-size: 14px; margin: 0; text-align: center;"

    iconContainer.appendChild(icon)
    iconContainer.appendChild(title)

    document.body.appendChild(iconContainer)
  }

  // Ajoute les boutons VM et DDS
  let ajouterBoutonsDateAuto = () => {
    let vmInput = document.querySelector('input[name="medicalVisitDate"]')
    let ddsInput = document.querySelector('input[name="bloodDonationDate"]')
    if (!vmInput || !ddsInput || document.getElementById("modif-vm-btn")) return

    let injectDateButton = (label, id, targetInput) => {
      let btn = document.createElement("button")
      btn.id = id
      btn.type = "button"
      btn.textContent = label
      Object.assign(btn.style, {
        marginTop: "4px", backgroundColor: "#2a2a2a", color: "#eee",
        border: "1px solid #555", padding: "4px 10px", borderRadius: "4px",
        cursor: "pointer", fontSize: "16px", width: "100%",
      })

      btn.addEventListener("click", () => {
        let dateStr = window.formatDateFR(new Date())
        let setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(targetInput), 'value')?.set
        if (setter) setter.call(targetInput, dateStr)
        targetInput.dispatchEvent(new Event('input', { bubbles: true }))
        targetInput.dispatchEvent(new Event('change', { bubbles: true }))
      })

      let wrapper = document.createElement("div")
      wrapper.style.marginTop = "4px"
      wrapper.appendChild(btn)
      targetInput.parentElement.parentElement.appendChild(wrapper)
    }

    injectDateButton("⚕️ VM Maintenant", "modif-vm-btn", vmInput)
    injectDateButton("🩸 DDS Maintenant", "modif-dds-btn", ddsInput)
  }

  // Exécution régulière pour vérifier l'état du DOM
  setInterval(injectIcon, 500)
  setInterval(injectSelectIfNeeded, 500)
  setInterval(ajouterBoutonsDateAuto, 500)
})()