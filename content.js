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
    icon.src = chrome.runtime.getURL("icons/128.png")
    icon.style.cssText = "width: 48px; height: 48px; z-index: 1; border-radius: 16px;"

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