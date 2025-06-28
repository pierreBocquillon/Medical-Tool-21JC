(async () => {
  const casTypes = await fetch(chrome.runtime.getURL("cases.json")).then(res => res.json())

  /** Crée uniquement le menu déroulant des cas types */
  function createSelect() {
    const select = document.createElement("select")
    Object.keys(casTypes).forEach(cas => {
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

  /** Crée le message d’alerte */
  function createAlert() {
    const p = document.createElement("p")
    p.textContent = "ATTENTION : Ces cas ne sont que des exemples courants et doivent être ajustés."
    p.style.cssText = "color: Coral; font-size: 14px; margin: 0; text-align: center;"
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
    const data = casTypes[key]
    if (!data) return

    const setValue = (selector, value) => window.setTextFieldValue(selector, value)
    setValue('input[name="type"]', data.type)
    setValue('input[name="zip"]', data.codePostal)
    setValue('input[name="disabilityDuration"]', data.dureeInvalidite)
    setValue('textarea[name="injuriesRemark"]', data.blessures)
    setValue('textarea[name="examinationsRemark"]', data.examens)
    setValue('textarea[name="treatmentsRemark"]', data.traitements)
    setValue('textarea[name="remark"]', data.remarques)

    const now = new Date()
    setValue('input[name="admission"]', window.formatDateFR(now))

    const [h, m, s] = data.dureeInvalidite.split(":").map(Number)
    const ctrlDate = new Date(now.getTime() + ((h * 3600 + m * 60 + s) * 1000))
    setValue('input[name="controlVisit"]', window.formatDateFR(ctrlDate))

    ;[1, 2, 3, 4].forEach(num => {
      const label = [...document.querySelectorAll("label")].find(l => l.textContent.includes(`(${num})`))
      const box = label?.querySelector('input[name="disabilities"]')
      if (box && box.checked !== (data.incapacites || []).includes(num)) box.click()
    })

    const comaLabel = [...document.querySelectorAll("label")].find(l => l.textContent.includes("Coma"))
    const comaBox = comaLabel?.querySelector('input[name="disability"]')
    if (comaBox && comaBox.checked !== !!data.coma) comaBox.click()
  }

  /** Injection : menu déroulant */
  function injectSelect() {
    const title = [...document.querySelectorAll("h5")].find(el => el.textContent.includes("Nouveau rapport medical"))
    if (!title || document.querySelector("#rapport-helper-select")) return

    const container = document.createElement("div")
    container.id = "rapport-helper-select-container"
    container.style.cssText = "margin: 10px 0; display: flex; flex-direction: column; align-items: center; gap: 10px"

    container.appendChild(createSelect())
    title.after(container)
  }

  /** Injection : message d’alerte */
  function injectAlert() {
    if (document.querySelector("#rapport-helper-alert")) return

    const alert = createAlert()
    const selectContainer = document.querySelector("#rapport-helper-select-container")
    if (selectContainer) selectContainer.appendChild(alert)
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
    title.style.cssText = "color: #5C9336; font-size: 14px; margin: 0; text-align: center;"

    iconContainer.appendChild(icon)
    iconContainer.appendChild(title)
    document.body.appendChild(iconContainer)
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
    injectSelect()
    injectAlert()
    injectDateCalculatorButton()
    injectVMButton()
    injectDDSButton()
  }, 500)
})()
