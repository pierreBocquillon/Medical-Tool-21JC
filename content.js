
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
      const deltaTime = (new Date().getTimezoneOffset()/60)-(window.getTimezoneOffsetFor('Europe/Paris')/60)
      const controlDate = new Date(date.getTime() + (((h+deltaTime) * 3600 + m * 60 + s) * 1000))
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

    const deltaTime = (new Date().getTimezoneOffset()/60)-(window.getTimezoneOffsetFor('Europe/Paris')/60)

    const now = new Date(new Date().getTime() + (deltaTime * 3600 * 1000))
    setValue('input[name="admission"]', window.formatDateFR(now))

    const [h, m, s] = data.dureeInvalidite.split(":").map(Number)

    const ctrlDate = new Date(now.getTime() + (((h+deltaTime) * 3600 + m * 60 + s) * 1000))
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

  function addExamensString(examens) {
    window.setTextFieldValue('textarea[name="examinationsRemark"]', examens)
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

  function addTraitementsString(traitements) {
    window.setTextFieldValue('textarea[name="treatmentsRemark"]', traitements)
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

  function addRemarquesString(remarks) {
    window.setTextFieldValue('textarea[name="remark"]', remarks)
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

  /** Charge les examens de la visite de contrôle */
  function loadVCExams() {
    const title = [...document.querySelectorAll("h5")].find(el => el.textContent.includes("Nouveau rapport medical") || el.textContent.includes("Modifier le rapport médical"))
    if (!title || document.querySelector("#rapport-helper-select")) return

    const setValue = (selector, value) => window.setTextFieldValue(selector, value)
    const setValueIfEmpty = (selector, value) => window.setTextFieldValueIfEmpty(selector, value)

    if (!(localStorage.getItem("VC_needed") == 'true')) return

    setValue('input[name="type"]', 'Note interne')
    setValueIfEmpty('input[name="zip"]', '8040')

    addBlessures("VC")
    
    addExamensString(localStorage.getItem("VC_Exams"))
    addTraitementsString(localStorage.getItem("VC_Treatments"))

    if(localStorage.getItem("VC_Remarks") && localStorage.getItem("VC_Remarks").trim().length > 0) {
      addRemarquesString(localStorage.getItem("VC_Remarks") + " + FDS")
    }else {
      addRemarquesString("FDS")
    }

    const deltaTime = (new Date().getTimezoneOffset()/60)-(window.getTimezoneOffsetFor('Europe/Paris')/60)
    const now = new Date(new Date().getTime() + (deltaTime * 3600 * 1000))
    setValue('input[name="admission"]', window.formatDateFR(now))

    localStorage.setItem("VC_needed", false)
    localStorage.setItem("VC_Exams", "")
    localStorage.setItem("VC_Treatments", "")
    localStorage.setItem("VC_Remarks", "")
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
    title.innerHTML = `Medical Tool 21JC</br> v${version}`
    title.style.cssText = "color: #5C9336; font-size: 14px; margin: 0; text-align: center;"

    // title.addEventListener("click", () => {
    // //open an alert asking for the delta time
    //   const userInput = prompt("Entrez le code secret pour accéder aux informations de version :")
    // })

    iconContainer.appendChild(icon)
    iconContainer.appendChild(title)
    document.body.appendChild(iconContainer)
  }

  /** Injection : bouton groupe sanguin */
  function injectBloodTypeButton() {
    if (document.getElementById("modif-blood-btn")) return

    const bloodTypeInput = document.querySelector('input[name="bloodgroup"]')
    if (!bloodTypeInput) return

    const remarquesInput = document.querySelector('textarea[name="remark"]')
    if (!remarquesInput) return

    const input = document.querySelector('input[name="smoking"]')
    if (!input) return

    const btn = document.createElement("button")
    btn.id = "modif-blood-btn"
    btn.type = "button"
    btn.textContent = "🩸 Groupe sanguin aléatoire"
    btn.style.cssText = "margin-top: 4px; background-color: #2a2a2a; color: #eee; border: 1px solid #555; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%;"

    btn.addEventListener("click", () => {
      let bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
      const randomBloodType = bloodTypes[Math.floor(Math.random() * bloodTypes.length)]

      const bloodSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(bloodTypeInput), 'value')?.set
      if (bloodSetter) bloodSetter.call(bloodTypeInput, randomBloodType)
      bloodTypeInput.dispatchEvent(new Event('input', { bubbles: true }))
      bloodTypeInput.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const wrapper = document.createElement("div")
    wrapper.style.marginTop = "4px"
    wrapper.appendChild(btn)
    input.parentElement.parentElement.parentElement.appendChild(wrapper)
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
  /** Injection : bouton VC */
  function injectVCButton() {
    const divList = document.querySelectorAll('div[role="menu"]')
    if (divList.length == 0) return

    for(const div of divList) {
      if (div.querySelector("#modif-vc-btn")) continue
      if (["VC","VM"].includes(div.parentElement.parentElement.querySelector('div[data-field="injuriesRemark"]').querySelector('div[role="presentation"]').innerText.trim().toUpperCase())) continue

      const btn = document.createElement("button")
      btn.id = "modif-vc-btn"
      btn.type = "button"
      btn.textContent = "🔬 VC"
      btn.style.cssText = "margin-top: 4px; background-color: #2a2a2a; color: #eee; border: 1px solid #555; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%;"

      btn.addEventListener("click", () => {
        let examList = ["Constantes", "Auscultation", "Radio", "Echo", "IRM", "Scanner", "Ethylometre", "Test salivaire"]
        let treatmentList = ["pansements","bandages","attelle rigide", "attelle souple", "minerve","collier cervical","corset","strips"]
        let remarkList = ["fauteuil", "canne"]

        let exams = div.parentElement.parentElement.querySelector('div[data-field="examinationsRemark"]').querySelector('div[role="presentation"]').innerText.trim().toLowerCase()
        let treatments = div.parentElement.parentElement.querySelector('div[data-field="treatmentsRemark"]').querySelector('div[role="presentation"]').innerText.trim().toLowerCase()
        let remarks = div.parentElement.parentElement.querySelector('div[data-field="remark"]').querySelector('div[role="presentation"]').innerText.trim().toLowerCase()

        // let parsedExams = exams.split("//").filter(s => s.includes(":")).map(s => s.trim().split(":")[0].trim()).map(s => s + " : RAS").filter(s => s)
        // let examString = parsedExams.join(" // ")

        let examData = []
        let treatmentData = []
        let remarkData = []

        for(let examElement of examList){
          if(exams.includes(examElement.toLowerCase()) ||  window.contientApprox(exams, examElement.toLowerCase(), 1)) {
            examData.push(`${examElement} : RAS`)
          }
        }

        for(let treatmentElement of treatmentList){
          if(treatments.includes(treatmentElement.toLowerCase()) ||  window.contientApprox(treatments, treatmentElement.toLowerCase(), 1)) {
            treatmentData.push(`${treatmentElement}`)
          }
        }

        for(let remarkElement of remarkList){
          if(remarks.includes(remarkElement.toLowerCase()) ||  window.contientApprox(remarks, remarkElement.toLowerCase(), 1)) {
            remarkData.push(`${remarkElement}`)
          }
        }

        if (examData.length > 0) {
          localStorage.setItem("VC_Exams", examData.join(" // "))
        }

        if (treatmentData.length > 0) {
          localStorage.setItem("VC_Treatments", "Retrait " + treatmentData.join(" + "))
        }

        if (remarkData.length > 0) {
          localStorage.setItem("VC_Remarks", "Récupération " + remarkData.join(" + "))
        }

        localStorage.setItem("VC_needed", true)

        let newEntryButton = document.querySelector('div[class="MuiDataGrid-toolbarContainer css-1yqais2"]').querySelectorAll('button[type="button"]')[4]
        if (newEntryButton) {
          newEntryButton.click()
        }
      })

      const wrapper = document.createElement("div")
      wrapper.style.marginTop = "4px"
      wrapper.appendChild(btn)
      div.appendChild(wrapper)
      break
    }
  }

  /** Utilitaire de création de bouton de date immédiate */
  function injectDateButton(label, id, input) {
    const btn = document.createElement("button")
    btn.id = id
    btn.type = "button"
    btn.textContent = label
    btn.style.cssText = "margin-top: 4px; background-color: #2a2a2a; color: #eee; border: 1px solid #555; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%;"

    btn.addEventListener("click", () => {
      const deltaTime = (new Date().getTimezoneOffset()/60)-(window.getTimezoneOffsetFor('Europe/Paris')/60)
      const now = new Date(new Date().getTime() + (deltaTime * 3600 * 1000))
      const dateStr = window.formatDateFR(now)
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

  function createCustomMenuItem(icon, title, link) {
    const menuItem = document.createElement("div")
    menuItem.className = "lsesToolItem"
    menuItem.innerHTML = `
      <a color="inherit" class="link_nav css-16qv2i2" href="${link}" target="_blank">
        <div class="MuiBox-root css-1ty8yy2">
          <div class="MuiButtonBase-root MuiListItemButton-root MuiListItemButton-gutters MuiListItemButton-root MuiListItemButton-gutters  css-12rz11a" tabindex="0" role="button" aria-label="Rapports Medicaux" style="height: 50px;">
            <div class="MuiListItemIcon-root css-5n5rd1">
              ${icon}
            </div>
            <div class="MuiListItemText-root css-1tsvksn">
              <p class="MuiTypography-root MuiTypography-body1 css-18r5fht" style="white-space: normal;">
                ${title}
              </p>
            </div>
            <span class="MuiTouchRipple-root css-w0pj6f"></span>
          </div>
        </div>
      </a>
    `
    return menuItem
  }

  /** Injection des items de menu */
  function injectMenuItems() {
    const targets = document.querySelectorAll('.lsesToolItem')
    if (!window.location.href.includes("https://intra.21jumpclick.fr")) {
      targets.forEach(target => target.remove())
      return
    }
    if (targets.length > 0) return
    

    let items = [
      {
        icon: `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="truck-medical" class="svg-inline--fa fa-truck-medical " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" color="#fff"><path fill="currentColor" d="M0 48C0 21.5 21.5 0 48 0H368c26.5 0 48 21.5 48 48V96h50.7c17 0 33.3 6.7 45.3 18.7L589.3 192c12 12 18.7 28.3 18.7 45.3V256v32 64c17.7 0 32 14.3 32 32s-14.3 32-32 32H576c0 53-43 96-96 96s-96-43-96-96H256c0 53-43 96-96 96s-96-43-96-96H48c-26.5 0-48-21.5-48-48V48zM416 256H544V237.3L466.7 160H416v96zM160 464a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm368-48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM176 80v48l-48 0c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h48v48c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V192h48c8.8 0 16-7.2 16-16V144c0-8.8-7.2-16-16-16H240V80c0-8.8-7.2-16-16-16H192c-8.8 0-16 7.2-16 16z"></path></svg>`,
        title: "Dispatch",
        link: "https://docs.google.com/spreadsheets/d/1Vho76MbebIo4d1RgpVL0wGFqbMjeK1e3HcirZV_C7Uk/edit?gid=180456797#gid=180456797"
      },
      // {
      //   icon: `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="book-medical" class="svg-inline--fa fa-book-medical " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" color="#fff"><path fill="currentColor" d="M0 96C0 43 43 0 96 0H384h32c17.7 0 32 14.3 32 32V352c0 17.7-14.3 32-32 32v64c17.7 0 32 14.3 32 32s-14.3 32-32 32H384 96c-53 0-96-43-96-96V96zM64 416c0 17.7 14.3 32 32 32H352V384H96c-17.7 0-32 14.3-32 32zM208 112v48H160c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h48v48c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V224h48c8.8 0 16-7.2 16-16V176c0-8.8-7.2-16-16-16H272V112c0-8.8-7.2-16-16-16H224c-8.8 0-16 7.2-16 16z"></path></svg>`,
      //   title: "Stock",
      //   link: "https://lses-inventory.web.app/"
      // }
    ]

    let childElement = document.querySelector("[href='/medical/files']")
    if (!childElement) return
    let parentElement = childElement.parentElement.parentElement
    if (!parentElement) return

    items.forEach(item => {
      if (!document.querySelector(`.lsesToolItem a[href='${item.link}']`)) {
        const menuItem = createCustomMenuItem(item.icon, item.title, item.link)
        parentElement.appendChild(menuItem)
      }
    })
  }



  /** Boucles d’injection toutes les 500 ms */
  setInterval(() => {
    injectIcon()

    injectMenuItems()

    loadVCExams()
    injectSelect()
    injectAlert()
    injectDateCalculatorButton()

    injectBloodTypeButton()
    injectVMButton()
    injectDDSButton()

    injectVCButton()
  }, 500)
})()


