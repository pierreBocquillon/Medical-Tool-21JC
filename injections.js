window.RH = window.RH || {}

window.RH.handleCaseSelection = function (key) {
	const data = window.RH.injuries[key]
	if (!data) return

	window.setTextFieldValue('input[name="type"]', data.type)

	let zip = data.codePostal
	if (zip === "hospital_zip") zip = localStorage.getItem("user_hospital_zip") || "8040"
	window.setTextFieldValueIfEmpty('input[name="zip"]', zip)
	window.setTextFieldValueIfMax('input[name="disabilityDuration"]', data.dureeInvalidite)

	window.RH.addBlessures(data.blessures)
	window.RH.addExamens(data.examens)
	window.RH.addTraitements(data.traitements)
	window.RH.addRemarques(data.remarques)

	const deltaTime = new Date().getTimezoneOffset() / 60 - window.getTimezoneOffsetFor("Europe/Paris") / 60
	const now = new Date(new Date().getTime() + deltaTime * 3600 * 1000)
	window.setTextFieldValue('input[name="admission"]', window.formatDateTimeFR(now))

	const [h, m, s] = data.dureeInvalidite.split(":").map(Number)
	const ctrlDate = new Date(now.getTime() + ((h + deltaTime) * 3600 + m * 60 + s) * 1000)
	window.setTextFieldValue('input[name="controlVisit"]', window.formatDateTimeFR(ctrlDate))

	;[1, 2, 3, 4].forEach((num) => {
		const label = [...document.querySelectorAll("label")].find((l) => l.textContent.includes(`(${num})`))
		const box = label?.querySelector('input[name="disabilities"]')
		if (box && !box.checked && box.checked !== (data.incapacites || []).includes(num)) box.click()
	})

	const comaLabel = [...document.querySelectorAll("label")].find((l) => l.textContent.includes("Coma"))
	const comaBox = comaLabel?.querySelector('input[name="disability"]')
	if (comaBox && !comaBox.checked && comaBox.checked !== !!data.coma) comaBox.click()

	setTimeout(() => {
		const select = document.querySelector("#rapport-helper-select")
		if (select) select.value = Object.keys(window.RH.injuries)[0] || "-- Sélectionner une blessure --"
	}, 300)
}

window.RH.loadVCExams = function () {
	const title = [...document.querySelectorAll("h5")].find((el) => el.textContent.includes("Nouveau rapport medical") || el.textContent.includes("Modifier le rapport médical"))
	if (!title || document.querySelector("#rapport-helper-select")) return
	if (localStorage.getItem("VC_needed") !== "true") return

	window.setTextFieldValue('input[name="type"]', "Note interne")
	window.setTextFieldValueIfEmpty('input[name="zip"]', localStorage.getItem("user_hospital_zip") || "8040")

	window.RH.addBlessures("VC")
	window.setTextFieldValue('textarea[name="examinationsRemark"]', localStorage.getItem("VC_Exams"))
	window.setTextFieldValue('textarea[name="treatmentsRemark"]', localStorage.getItem("VC_Treatments"))

	const remarks = (localStorage.getItem("VC_Remarks") || "").trim()
	window.setTextFieldValue('textarea[name="remark"]', remarks.length > 0 ? remarks + " + FDS" : "FDS")

	const deltaTime = new Date().getTimezoneOffset() / 60 - window.getTimezoneOffsetFor("Europe/Paris") / 60
	const now = new Date(new Date().getTime() + deltaTime * 3600 * 1000)
	window.setTextFieldValue('input[name="admission"]', window.formatDateTimeFR(now))

	localStorage.setItem("VC_needed", false)
	localStorage.setItem("VC_Exams", "")
	localStorage.setItem("VC_Treatments", "")
	localStorage.setItem("VC_Remarks", "")
}

window.RH.injectSelect = function () {
	const title = [...document.querySelectorAll("h5")].find((el) => el.textContent.includes("Nouveau rapport medical") || el.textContent.includes("Modifier le rapport médical"))
	if (!title || document.querySelector("#rapport-helper-select")) return
	const container = window.RH.createElement("div", {
		id: "rapport-helper-select-container",
		style: { margin: "10px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
	})
	container.appendChild(window.RH.createSelect())
	title.after(container)
}

window.RH.injectAlert = function () {
	if (document.querySelector("#rapport-helper-alert")) return
	const container = document.querySelector("#rapport-helper-select-container")
	if (container) container.appendChild(window.RH.createInfoPanel())
}

window.RH.injectDateCalculatorButton = function () {
	if (document.querySelector("#rapport-helper-calc-btn")) return
	const inputFn = document.querySelector('input[name="controlVisit"]')
	if (inputFn) inputFn.parentElement.parentElement.parentElement?.appendChild(window.RH.createDateCalculatorButton())
}

window.RH.injectIcon = function () {
	if (!window.location.href.includes("https://intra.21jumpclick.fr")) {
		document.querySelector("#rapport-helper-icon-container")?.remove()
		return
	}
	if (document.querySelector("#rapport-helper-icon-container")) return

	const container = window.RH.createElement("div", {
		id: "rapport-helper-icon-container",
		style: { overflow: "hidden", height: "60px", width: "500px", position: "fixed", top: "10px", right: "-450px", zIndex: "9999", display: "flex", flexDirection: "row", alignItems: "center", padding: "5px", backgroundColor: "rgba(44, 44, 44, .9)", borderRadius: "30px", transition: "all 0.2s ease-in-out", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)" },
	})
	sessionStorage.setItem("rapport_helper_menu_open", "false")

	const leftRow = window.RH.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center" } })
	const rightRow = window.RH.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center" } })

	const openBtn = window.RH.createElement("span", {
		text: "<",
		style: { cursor: "pointer", fontSize: "24px", fontWeight: "thin", marginRight: "20px", backgroundColor: "#444", borderRadius: "50%", width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" },
		events: {
			click: () => {
				const isOpen = sessionStorage.getItem("rapport_helper_menu_open") === "true"
				if (isOpen) {
					container.style.right = "-450px"
					sessionStorage.setItem("rapport_helper_menu_open", "false")
					openBtn.innerText = "<"
					setTimeout(() => (container.style.height = "60px"), 150)
				} else {
					container.style.height = "460px"
					setTimeout(() => {
						container.style.right = "-150px"
						sessionStorage.setItem("rapport_helper_menu_open", "true")
						openBtn.innerText = ">"
					}, 150)
				}
			},
		},
	})

	const createConfigBtn = (text, titleAttr, action) =>
		window.RH.createElement("div", {
			text,
			attributes: { title: titleAttr },
			style: { cursor: "pointer", fontSize: "16px", marginLeft: "6px", color: "white", backgroundColor: "#444", padding: "5px", margin: "5px 0", borderRadius: "4px", width: "250px", textAlign: "center" },
			events: { click: action },
		})

	const title = window.RH.createElement("p", {
		html: `Medical Tool 21JC</br> v${chrome.runtime.getManifest().version} `,
		style: { color: "#5C9336", fontSize: "16px", margin: "0", textAlign: "center" },
	})

	title.appendChild(createConfigBtn("🛠️ Zip par défaut", "Configurer le code zip", () => {
		const zip = prompt("Entrez le code zip de votre hopital :")
		if (zip !== null) { localStorage.setItem("user_hospital_zip", zip.trim()); alert(`Code zip enregistré : ${zip.trim()}`) }
	}))
	title.appendChild(createConfigBtn("📝 Configurer la liste", "Modifier le JSON des blessures", () => window.RH.openInjuriesEditor()))
	title.appendChild(createConfigBtn("🩵 Menu LSES", "Activer menu LSES", () => {
		if (confirm("Activer le menu LSES ?")) { localStorage.setItem("user_hospital_name", "LSES"); window.location.reload() }
	}))
	title.appendChild(createConfigBtn("💚 Menu BCES", "Activer menu BCES", () => {
		if (confirm("Activer le menu BCES ?")) { localStorage.setItem("user_hospital_name", "BCES"); window.location.reload() }
	}))
	title.appendChild(createConfigBtn("❌ Menu par defaut", "Menu par défaut", () => {
		if (confirm("Revenir au menu par défaut ?")) { localStorage.setItem("user_hospital_name", "DEFAULT"); window.location.reload() }
	}))

	leftRow.appendChild(openBtn)
	rightRow.appendChild(window.RH.createElement("img", { attributes: { src: chrome.runtime.getURL("icons/logo.png") }, style: { width: "200px", height: "200px", zIndex: "1", borderRadius: "16px", marginTop: "10px" } }))
	rightRow.appendChild(title)
	container.appendChild(leftRow)
	container.appendChild(rightRow)
	document.body.appendChild(container)
}

window.RH.injectBloodTypeButton = function () {
	if (document.getElementById("modif-blood-btn")) return
	const bloodInput = document.querySelector('input[name="bloodgroup"]')
	const wrapper = bloodInput?.parentElement?.parentElement?.parentElement
	if (!wrapper) return

	const btn = window.RH.createElement("button", {
		text: "🩸 Groupe sanguin aléatoire",
		id: "modif-blood-btn",
		attributes: { type: "button" },
		style: { marginTop: "4px", backgroundColor: "#2a2a2a", color: "#eee", border: "1px solid #555", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "16px", width: "100%" },
		events: {
			click: () => {
				const types = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
				const rand = types[Math.floor(Math.random() * types.length)]
				const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(bloodInput), "value")?.set
				if (setter) setter.call(bloodInput, rand)
				bloodInput.dispatchEvent(new Event("input", { bubbles: true }))
				bloodInput.dispatchEvent(new Event("change", { bubbles: true }))
			},
		},
	})

	const target = document.querySelector('input[name="smoking"]')?.parentElement?.parentElement?.parentElement
	if (target) {
		const div = window.RH.createElement("div", { style: { marginTop: "4px" } })
		div.appendChild(btn)
		target.appendChild(div)
	}
}

window.RH.injectSimpleButton = function (id, label, inputSelector, isTime = false) {
	if (document.getElementById(id)) return
	const input = document.querySelector(inputSelector)
	if (!input) return

	const btn = window.RH.createElement("button", {
		text: label,
		id: id,
		style: { marginTop: "4px", backgroundColor: "#2a2a2a", color: "#eee", border: "1px solid #555", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "16px", width: "100%" },
		events: {
			click: () => {
				const deltaTime = new Date().getTimezoneOffset() / 60 - window.getTimezoneOffsetFor("Europe/Paris") / 60
				const now = new Date(new Date().getTime() + deltaTime * 3600 * 1000)
				const val = isTime ? window.formatDateTimeFR(now) : window.formatDateFR(now)
				const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set
				if (setter) setter.call(input, val)
				input.dispatchEvent(new Event("input", { bubbles: true }))
				input.dispatchEvent(new Event("change", { bubbles: true }))
			},
		},
	})

	const div = window.RH.createElement("div", { style: { marginTop: "4px" } })
	div.appendChild(btn)
	input.parentElement.parentElement.appendChild(div)
}

window.RH.highlightErrorText = function () {
	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false)
	const nodes = []
	while (walker.nextNode()) {
		const node = walker.currentNode
		if (node.parentNode.dataset?.errorHighlight) continue
		if (node.nodeValue.toLowerCase().includes("infos pas ok")) nodes.push(node)
	}
	nodes.forEach((node) => {
		const span = document.createElement("span")
		span.dataset.errorHighlight = "true"
		node.nodeValue.split(/(infos pas ok)/gi).forEach((part) => {
			if (part.toLowerCase() === "infos pas ok") {
				const b = document.createElement("b")
				b.textContent = part
				b.style.color = "red"
				b.style.whiteSpace = "nowrap"
				span.appendChild(b)
			} else if (part) {
				span.appendChild(document.createTextNode(part))
			}
		})
		node.replaceWith(span)
	})
}

window.RH.injectVCButton = function () {
	const divList = document.querySelectorAll('div[role="menu"]')
	if (divList.length === 0) return

	for (const div of divList) {
		if (div.querySelector(".modif-vc-btn")) continue
		const region = div.parentElement.parentElement
		const injuryTitle = region.querySelector('div[data-field="injuriesRemark"] div[role="presentation"]')?.innerText.trim().toUpperCase()
		if (["VC", "VM"].includes(injuryTitle)) continue

		const btn = window.RH.createElement("button", {
			text: "🔬 VC",
			className: "modif-vc-btn",
			attributes: { type: "button" },
			style: { marginTop: "4px", backgroundColor: "#2a2a2a", color: "#eee", border: "1px solid #555", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "16px", width: "100%" },
			events: {
				click: () => {
					const getTxt = (field) => region.querySelector(`div[data-field="${field}"] div[role="presentation"]`)?.innerText.trim().toLowerCase() || ""
					const exams = getTxt("examinationsRemark")
					const treatments = getTxt("treatmentsRemark")
					const remarks = getTxt("remark")

					const examList = ["constantes", "auscultation", "radio", "echo", "irm", "scanner", "ethylometre", "test salivaire"]
					const treatList = ["pansements", "bandages", "attelle rigide", "attelle souple", "minerve", "collier cervical", "corset", "strips"]
					const remList = ["fauteuil", "canne"]

					const matches = (source, target) => source.includes(target) || window.contientApprox(source, target, 1)

					const exData = examList.filter((e) => matches(exams, e)).map((e) => `${e.charAt(0).toUpperCase() + e.slice(1)} : RAS`)
					const trData = treatList.filter((t) => matches(treatments, t))
					const reData = remList.filter((r) => matches(remarks, r))

					if (exData.length) localStorage.setItem("VC_Exams", exData.join(" // "))
					if (trData.length) localStorage.setItem("VC_Treatments", "Retrait " + trData.join(" + "))
					if (reData.length) localStorage.setItem("VC_Remarks", "Récupération " + reData.join(" + "))

					localStorage.setItem("VC_needed", true)

					const toolbar = document.querySelector('div[class*="MuiDataGrid-toolbarContainer"]')
					const btns = toolbar?.querySelectorAll('button[type="button"]')
					if (btns && btns[4]) btns[4].click()
				},
			},
		})

		const wrapper = window.RH.createElement("div", { style: { marginTop: "4px" } })
		wrapper.appendChild(btn)
		div.appendChild(wrapper)
	}
}

window.RH.injectMenuItems = function () {
	if (!window.location.href.includes("https://intra.21jumpclick.fr")) {
		document.querySelectorAll(".lsesToolItem").forEach((e) => e.remove())
		return
	}
	const anchor = document.querySelector("[href='/medical/files']")
	if (!anchor) return
	const parent = anchor.parentElement.parentElement
	if (!parent) return

	const items = [
		{ hospital: "LSES", title: "LSES Inventory", link: "https://lses-inventory.web.app/", icon: '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="truck-medical" class="svg-inline--fa fa-truck-medical " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" color="#fff"><path fill="currentColor" d="M0 48C0 21.5 21.5 0 48 0H368c26.5 0 48 21.5 48 48V96h50.7c17 0 33.3 6.7 45.3 18.7L589.3 192c12 12 18.7 28.3 18.7 45.3V256v32 64c17.7 0 32 14.3 32 32s-14.3 32-32 32H576c0 53-43 96-96 96s-96-43-96-96H256c0 53-43 96-96 96s-96-43-96-96H48c-26.5 0-48-21.5-48-48V48zM416 256H544V237.3L466.7 160H416v96zM160 464a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm368-48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM176 80v48l-48 0c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h48v48c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V192h48c8.8 0 16-7.2 16-16V144c0-8.8-7.2-16-16-16H240V80c0-8.8-7.2-16-16-16H192c-8.8 0-16 7.2-16 16z"></path></svg>' },
		{ hospital: "BCES", title: "Dispatch", link: "https://docs.google.com/spreadsheets/d/1Vho76MbebIo4d1RgpVL0wGFqbMjeK1e3HcirZV_C7Uk/edit?gid=1466825062#gid=1466825062", icon: '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="truck-medical" class="svg-inline--fa fa-truck-medical " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" color="#fff"><path fill="currentColor" d="M0 48C0 21.5 21.5 0 48 0H368c26.5 0 48 21.5 48 48V96h50.7c17 0 33.3 6.7 45.3 18.7L589.3 192c12 12 18.7 28.3 18.7 45.3V256v32 64c17.7 0 32 14.3 32 32s-14.3 32-32 32H576c0 53-43 96-96 96s-96-43-96-96H256c0 53-43 96-96 96s-96-43-96-96H48c-26.5 0-48-21.5-48-48V48zM416 256H544V237.3L466.7 160H416v96zM160 464a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm368-48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM176 80v48l-48 0c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h48v48c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V192h48c8.8 0 16-7.2 16-16V144c0-8.8-7.2-16-16-16H240V80c0-8.8-7.2-16-16-16H192c-8.8 0-16 7.2-16 16z"></path></svg>' },
	]

	const userHospital = localStorage.getItem("user_hospital_name") || ""
	items.forEach((item) => {
		if (item.hospital && item.hospital !== userHospital) return
		if (document.querySelector(`.lsesToolItem a[href='${item.link}']`)) return
		parent.appendChild(window.RH.createCustomMenuItem(item.icon, item.title, item.link))
	})
}
