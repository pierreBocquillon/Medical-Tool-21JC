;(async () => {
	const secretCode = "21JC"
	let injuries = {}

	// --- Initialisation ---

	async function loadInjuries() {
		const stored = localStorage.getItem("injuries_data")
		if (stored) {
			try {
				injuries = JSON.parse(stored)
			} catch (e) {
				console.error("Erreur parsing localStorage, reset.", e)
				await resetInjuries()
			}
		} else {
			await resetInjuries()
		}
	}

	async function resetInjuries() {
		try {
			injuries = await fetch(chrome.runtime.getURL("data/injuries.json")).then((res) => res.json())
			localStorage.setItem("injuries_data", JSON.stringify(injuries))
		} catch (e) {
			console.error("Erreur chargement data/injuries.json", e)
		}
	}

	await loadInjuries()

	// --- Helpers ---

	/**
	 * Crée un élément DOM avec des attributs, styles et événements
	 * @param {string} tag - Le tag HTML (div, span, etc.)
	 * @param {object} options - Options de configuration
	 */
	function createElement(tag, { text, html, id, style, className, attributes, events, children } = {}) {
		const el = document.createElement(tag)
		if (text) el.textContent = text
		if (html) el.innerHTML = html
		if (id) el.id = id
		if (className) el.className = className
		if (style) Object.assign(el.style, style)
		if (attributes) Object.entries(attributes).forEach(([k, v]) => el.setAttribute(k, v))
		if (events) Object.entries(events).forEach(([k, v]) => el.addEventListener(k, v))
		if (children) children.forEach((c) => el.appendChild(c))
		return el
	}

	/**
	 * Parse le contenu d'un champ texte structuré (format // : +)
	 * Retourne un objet ou un tableau d'objets selon la structure
	 */
	function parseRemarkField(value) {
		if (!value) return []
		return value
			.trim()
			.split("//")
			.map((s) => s.trim())
			.filter((s) => s)
			.map((s) => {
				const parts = s.split(":")
				if (parts.length > 1) {
					const key = parts[0].trim()
					const values = parts
						.slice(1)
						.join(":")
						.trim()
						.split("+")
						.map((v) => v.trim())
					return { [key]: values }
				} else {
					const values = s.split("+").map((v) => v.trim())
					if (values.length >= 1) return { Autres: values }
				}
				return null
			})
			.filter(Boolean)
	}

	/**
	 * Fusionne un tableau d'objets parsés en un seul objet unique
	 */
	function mergeParsedData(parsedArray) {
		return parsedArray.reduce((acc, obj) => {
			for (let key in obj) {
				if (!acc[key]) acc[key] = []
				acc[key] = [...new Set(acc[key].concat(obj[key]))]
			}
			return acc
		}, {})
	}

	/**
	 * Formate un objet de données en chaîne de caractères selon un ordre défini
	 */
	function formatRemarkData(data, order = [], exceptions = {}) {
		// Filtrage des entrées vides
		for (let key in data) {
			if (!data[key] || data[key].length === 0) delete data[key]
			else data[key] = [...new Set(data[key])]
		}

		const keys = Object.keys(data).sort((a, b) => {
			const idxA = order.indexOf(a)
			const idxB = order.indexOf(b)
			if (idxA !== -1 && idxB !== -1) return idxA - idxB
			if (idxA !== -1) return -1
			if (idxB !== -1) return 1
			return 0
		})

		return keys
			.map((key) => {
				let valuesStr = data[key].join(" + ")
				if (exceptions.removeKeyLabel && exceptions.removeKeyLabel.includes(key)) {
					return valuesStr
				}
				return `${key}: ${valuesStr}`
			})
			.join(" // ")
			.replace("RAS + ", "")
			.replace("+ RAS", "") // Nettoyage spécifique
	}

	/**
	 * Fonction générique pour mettre à jour un champ textarea
	 * @param {string} selector - Sélecteur CSS du champ
	 * @param {object|string} newData - Nouvelles données à ajouter
	 * @param {object} options - Options de traitement { order, processData, isString }
	 */
	function updateRemarkField(selector, newData, { order = [], processData = null, isString = false, replaceAll = false } = {}) {
		const field = document.querySelector(selector)
		if (!field) return

		if (isString) {
			window.setTextFieldValue(selector, newData)
			return
		}

		// Parsing existant
		let parsedArray = parseRemarkField(field.value)

		// Traitement spécifique si nécessaire (avant fusion)
		if (processData) {
			parsedArray = processData(parsedArray)
		}

		// Fusion existant
		let currentData = mergeParsedData(parsedArray)

		// Fusion avec nouveau
		for (let key in newData) {
			if (!currentData[key]) currentData[key] = []
			currentData[key] = [...new Set(currentData[key].concat(newData[key]))]
		}

		// Traitement post-fusion si nécessaire (ex: Chir AG/AL)
		// Pour simplification, on applique la logique spécifique "Chir" ici si c'est les traitements
		if (currentData["Chir AL"] && currentData["Chir AL"].length > 0 && currentData["Chir AG"] && currentData["Chir AG"].length > 0) {
			currentData["Chir AG"] = currentData["Chir AG"].concat(currentData["Chir AL"])
			delete currentData["Chir AL"]
		}

		const formatted = formatRemarkData(currentData, order, { removeKeyLabel: ["Autres", "Medicaments", "Manipulations"] })
		window.setTextFieldValue(selector, formatted)
	}

	// --- Specific Logic ---

	function addBlessures(blessures) {
		const field = document.querySelector('textarea[name="injuriesRemark"]')
		if (!field) return

		let current = field.value
			.trim()
			.split("+")
			.map((s) => s.trim())
			.filter((s) => s)
		let newValue = [...new Set(current.concat(blessures))].join(" + ")
		window.setTextFieldValue('textarea[name="injuriesRemark"]', newValue)
	}

	function addExamens(examens) {
		updateRemarkField('textarea[name="examinationsRemark"]', examens, {
			order: ["Constantes", "Auscultation", "Radio", "Echo", "IRM", "Scanner", "Ethylometre", "Test", "Autres"],
		})
	}

	function addTraitements(traitements) {
		const processTraitements = (parsedArray) => {
			// Logique spécifique pour mapper "Autres" vers Manipulations/Medicaments séquentiellement
			let counter = 0
			for (let obj of parsedArray) {
				if (obj.Autres) {
					if (counter === 0) {
						obj.Manipulations = obj.Autres
						delete obj.Autres
						counter++
					} else if (counter === 1) {
						obj.Medicaments = obj.Autres
						delete obj.Autres
						counter++
					}
				}
			}
			// Logique Chir AG vs AL
			let hasChirAG = parsedArray.some((obj) => obj["Chir AG"] != undefined && obj["Chir AG"].length > 0)
			if (hasChirAG) {
				return parsedArray.map((obj) => {
					if (obj["Chir AL"]) {
						obj["Chir AG"] = obj["Chir AL"]
						delete obj["Chir AL"]
					}
					return obj
				})
			}
			return parsedArray
		}

		updateRemarkField('textarea[name="treatmentsRemark"]', traitements, {
			order: ["Chir AG", "Chir AL", "Manipulations", "Medicaments", "Autres"],
			processData: processTraitements,
		})
	}

	function addRemarques(remarques) {
		const field = document.querySelector('textarea[name="remark"]')
		if (!field) return

		if (typeof remarques === "string" && remarques.trim().length > 0) {
			let current = field.value
			if (current && !current.endsWith("\n")) current += "\n"
			window.setTextFieldValue('textarea[name="remark"]', current + remarques)
			return
		}

		// Simplification : on applique la logique de fusion générique
		updateRemarkField('textarea[name="remark"]', remarques, {
			order: ["Pret", "Facturation", "Autres"],
		})

		// Post process propre aux remarques (remplacement de string)
		let val = field.value
		val = val.replace("VISITE MEDICALE // TEST EFFORT [OK] // [APPROUVÉ AU SERVICE]", "[[VMSP]]").replace("VISITE MEDICALE // [APPROUVÉ AU SERVICE]", "[[VMC]]")

		// On réapplique les replacements inverses après formatage
		val = val.replace("[[VMSP]]", "VISITE MEDICALE // TEST EFFORT [OK] // [APPROUVÉ AU SERVICE]").replace("[[VMC]]", "VISITE MEDICALE // [APPROUVÉ AU SERVICE]")

		window.setTextFieldValue('textarea[name="remark"]', val)
	}

	// --- UI Creation ---

	function updateSelectOptions() {
		const select = document.querySelector("#rapport-helper-select")
		if (!select) return
		select.innerHTML = ""
		Object.keys(injuries).forEach((cas) => {
			select.appendChild(createElement("option", { text: cas, attributes: { value: cas } }))
		})
		select.value = Object.keys(injuries)[0] || ""
	}

	function openInjuriesEditor() {
		if (document.getElementById("injuries-editor-overlay")) return

		let localInjuries = JSON.parse(JSON.stringify(injuries))
		let selectedKey = Object.keys(localInjuries)[0] || null

		const overlay = createElement("div", {
			id: "injuries-editor-overlay",
			style: { position: "fixed", top: "0", left: "0", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.8)", zIndex: "10000", display: "flex", justifyContent: "center", alignItems: "center" },
		})

		const container = createElement("div", {
			style: { backgroundColor: "#1e1e1e", padding: "0", borderRadius: "8px", width: "90%", height: "90%", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #555" },
		})

		// Header
		const header = createElement("div", {
			style: { padding: "15px", backgroundColor: "#252526", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" },
			html: `<h2 style="color: #eee; margin: 0; font-size: 18px;">Éditeur de Blessures</h2>`,
		})

		// Body
		const body = createElement("div", {
			style: { flex: "1", display: "flex", overflow: "hidden" },
		})

		// Sidebar
		const sidebar = createElement("div", {
			style: { width: "250px", borderRight: "1px solid #333", display: "flex", flexDirection: "column", backgroundColor: "#252526" },
		})

		// Sidebar list container
		const listContainer = createElement("div", {
			style: { flex: "1", overflowY: "auto" },
		})

		// Add button
		const addBtn = createElement("button", {
			text: "+ Nouvelle blessure",
			style: { width: "100%", padding: "10px", backgroundColor: "#333", color: "#eee", border: "none", borderBottom: "1px solid #444", cursor: "pointer", textAlign: "left" },
			events: { click: () => createNewInjury() },
		})
		sidebar.appendChild(addBtn)
		sidebar.appendChild(listContainer)

		// Content Area
		const content = createElement("div", {
			style: { flex: "1", padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "15px", color: "#eee" },
		})

		// Form generation
		function renderForm() {
			content.innerHTML = ""
			if (!selectedKey || !localInjuries[selectedKey]) {
				content.innerHTML = '<div style="color: #888; text-align: center; margin-top: 50px;">Sélectionnez une blessure pour l\'éditer</div>'
				return
			}

			if (selectedKey === "-- Ajouter une blessure --") {
				content.innerHTML = '<div style="color: #888; text-align: center; margin-top: 50px;">Cette entrée est réservée et ne peut pas être modifiée.</div>'
				return
			}

			const data = localInjuries[selectedKey]

			// Helper for rows
			const createRow = (label, input) => {
				const row = createElement("div", { style: { display: "flex", flexDirection: "column", gap: "5px" } })
				row.appendChild(createElement("label", { text: label, style: { fontSize: "12px", color: "#aaa" } }))
				row.appendChild(input)
				return row
			}

			// Helper for inputs
			const createInput = (key, val) =>
				createElement("input", {
					attributes: { value: val || "" },
					style: { padding: "8px", backgroundColor: "#333", border: "1px solid #444", color: "white", borderRadius: "4px" },
					events: {
						input: (e) => {
							localInjuries[selectedKey][key] = e.target.value
						},
					},
				})

			// ID Edit (Key rename)
			const idInput = createElement("input", {
				attributes: { value: selectedKey },
				style: { padding: "8px", backgroundColor: "#333", border: "1px solid #444", color: "white", borderRadius: "4px", fontWeight: "bold" },
				events: { change: (e) => renameKey(e.target.value) },
			})
			content.appendChild(createRow("Nom de la blessure (ID)", idInput))

			// Basic Fields
			const types = ["Note interne", "Intervention", "Consultation"]

			const typeSelect = createElement("select", {
				style: { padding: "8px", backgroundColor: "#333", border: "1px solid #444", color: "white", borderRadius: "4px" },
				events: {
					change: (e) => {
						localInjuries[selectedKey].type = e.target.value
					},
				},
			})

			types.forEach((t) => {
				const opt = createElement("option", { text: t, attributes: { value: t } })
				if (t === data.type) opt.selected = true
				typeSelect.appendChild(opt)
			})

			const grid = createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" } })
			grid.appendChild(createRow("Type", typeSelect))
			grid.appendChild(createRow("Durée (HH:MM:SS)", createInput("dureeInvalidite", data.dureeInvalidite)))
			grid.appendChild(createRow("Code Postal (« hospital_zip » pour le code postal par défaut de l'hôpital)", createInput("codePostal", data.codePostal)))
			content.appendChild(grid)

			// Category Inputs Helper
			const createCategorySection = (title, fieldName, allowedKeys) => {
				const wrapper = createElement("div", { style: { display: "flex", flexDirection: "column", gap: "10px", padding: "10px", border: "1px solid #444", borderRadius: "4px", backgroundColor: "#252526" } })
				wrapper.appendChild(createElement("h4", { text: title, style: { margin: "0", color: "#ddd", fontSize: "14px" } }))

				if (!localInjuries[selectedKey][fieldName] || typeof localInjuries[selectedKey][fieldName] !== "object") {
					localInjuries[selectedKey][fieldName] = {}
				}
				const fieldData = localInjuries[selectedKey][fieldName]

				const grid = createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" } })

				allowedKeys.forEach((key) => {
					let val = fieldData[key]
					if (val && !Array.isArray(val)) val = [val]
					const currentVal = (val || []).join(" + ")

					const input = createElement("input", {
						attributes: { value: currentVal, placeholder: "..." },
						style: { padding: "6px", backgroundColor: "#333", border: "1px solid #444", color: "white", borderRadius: "4px", width: "100%", boxSizing: "border-box" },
						events: {
							change: (e) => {
								const val = e.target.value
									.split("+")
									.map((s) => s.trim())
									.filter((s) => s)
								if (val.length > 0) fieldData[key] = val
								else delete fieldData[key]
							},
						},
					})

					const label = createElement("label", { text: key, style: { fontSize: "11px", color: "#aaa", display: "block", marginBottom: "2px" } })
					const container = createElement("div")
					container.appendChild(label)
					container.appendChild(input)
					grid.appendChild(container)
				})

				wrapper.appendChild(grid)
				return wrapper
			}

			// Blessures (Simple Textarea)
			const createTextarea = (val) =>
				createElement("textarea", {
					text: val || "",
					style: { padding: "8px", backgroundColor: "#333", border: "1px solid #444", color: "white", borderRadius: "4px", minHeight: "60px", fontFamily: "monospace", whiteSpace: "pre" },
					events: {
						change: (e) => {
							localInjuries[selectedKey].blessures = e.target.value
						},
					},
				})

			content.appendChild(createRow("Blessures (Ex: A + B)", createTextarea(data.blessures)))

			// Detailed Sections
			const examKeys = ["Constantes", "Auscultation", "Radio", "Echo", "IRM", "Scanner", "Ethylometre", "Test salivaire", "Autres"]
			content.appendChild(createCategorySection("Examens", "examens", examKeys))

			const treatKeys = ["Chir AG", "Chir AL", "Manipulations", "Medicaments", "Autres"]
			content.appendChild(createCategorySection("Traitements", "traitements", treatKeys))

			// Remarques simplified
			let remarkVal = data.remarques || ""
			if (typeof remarkVal === "object") {
				// Flatten object values to string
				remarkVal = Object.values(remarkVal).flat().join(" + ")
			}

			const remarksInput = createElement("textarea", {
				text: remarkVal,
				style: { padding: "8px", backgroundColor: "#333", border: "1px solid #444", color: "white", borderRadius: "4px", minHeight: "60px", fontFamily: "monospace", whiteSpace: "pre" },
				events: {
					change: (e) => {
						localInjuries[selectedKey].remarques = e.target.value
					},
				},
			})
			const remarksGroup = createElement("div", { style: { display: "flex", flexDirection: "column", gap: "5px" } })
			remarksGroup.appendChild(createElement("label", { text: "Remarques", style: { fontSize: "12px", color: "#aaa" } }))
			remarksGroup.appendChild(remarksInput)
			content.appendChild(remarksGroup)

			// Extras
			const extraGrid = createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", alignItems: "center" } })

			// Incapacites Checkboxes
			const incContainer = createElement("div", { style: { display: "flex", flexDirection: "column", gap: "5px" } })
			const incLabel = createElement("label", { text: "Incapacités", style: { fontSize: "12px", color: "#aaa" } })
			incContainer.appendChild(incLabel)

			const incOptions = [
				{ id: 1, label: "Saut (1)" },
				{ id: 2, label: "Course (2)" },
				{ id: 3, label: "Conduite (3)" },
				{ id: 4, label: "Armes (4)" },
			]

			incOptions.forEach((opt) => {
				const wrapper = createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } })

				const checkbox = createElement("input", {
					attributes: { type: "checkbox" },
					events: {
						change: (e) => {
							let currentInc = localInjuries[selectedKey].incapacites || []
							if (e.target.checked) {
								if (!currentInc.includes(opt.id)) currentInc.push(opt.id)
							} else {
								currentInc = currentInc.filter((i) => i !== opt.id)
							}
							localInjuries[selectedKey].incapacites = currentInc.sort((a, b) => a - b)
						},
					},
				})

				if ((data.incapacites || []).includes(opt.id)) {
					checkbox.checked = true
				}

				wrapper.appendChild(checkbox)
				wrapper.appendChild(createElement("label", { text: opt.label, style: { fontSize: "13px", color: "#ddd" } }))
				incContainer.appendChild(wrapper)
			})

			extraGrid.appendChild(incContainer)

			// Coma
			const comaDiv = createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginTop: "20px" } })
			const comaCheck = createElement("input", {
				attributes: { type: "checkbox", ...(data.coma ? { checked: "true" } : {}) },
				events: {
					change: (e) => {
						localInjuries[selectedKey].coma = e.target.checked
					},
				},
			})
			comaDiv.appendChild(comaCheck)
			comaDiv.appendChild(createElement("label", { text: "Coma" }))
			extraGrid.appendChild(comaDiv)
			content.appendChild(extraGrid)

			// Delete Button
			const deleteBtn = createElement("button", {
				text: "🗑️ Supprimer cette blessure",
				style: { marginTop: "20px", padding: "10px", backgroundColor: "#d32f2f", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", alignSelf: "flex-start" },
				events: { click: () => deleteKey() },
			})
			content.appendChild(deleteBtn)
		}

		function moveItem(key, direction) {
			const keys = Object.keys(localInjuries)
			const index = keys.indexOf(key)
			if (index === -1) return

			const newIndex = index + direction
			if (newIndex < 0 || newIndex >= keys.length) return

			// Swap Logic
			const newKeys = [...keys]
			const temp = newKeys[index]
			newKeys[index] = newKeys[newIndex]
			newKeys[newIndex] = temp

			const newObj = {}
			newKeys.forEach((k) => {
				newObj[k] = localInjuries[k]
			})
			localInjuries = newObj
			renderList()
		}

		// Logic
		function renderList() {
			listContainer.innerHTML = ""
			Object.keys(localInjuries).forEach((key, index, arr) => {
				if (key === "-- Ajouter une blessure --") return

				const item = createElement("div", {
					style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", backgroundColor: selectedKey === key ? "#37373d" : "transparent", borderBottom: "1px solid #333" },
				})

				const label = createElement("span", {
					text: key,
					style: { cursor: "pointer", color: "#ccc", flex: "1", fontSize: "14px" },
					events: {
						click: () => {
							selectedKey = key
							renderList()
							renderForm()
						},
					},
				})
				item.appendChild(label)

				const btnContainer = createElement("div", { style: { display: "flex", gap: "2px" } })

				// Up Button
				if (index > 0 && arr[index - 1] !== "-- Ajouter une blessure --") {
					const upBtn = createElement("button", {
						text: "↑",
						style: { cursor: "pointer", backgroundColor: "transparent", border: "none", color: "#aaa", fontSize: "18px", padding: "5px" },
						attributes: { title: "Monter" },
						events: {
							click: (e) => {
								e.stopPropagation()
								moveItem(key, -1)
							},
						},
					})
					btnContainer.appendChild(upBtn)
				}

				// Down Button
				if (index < arr.length - 1 && arr[index + 1] !== "-- Ajouter une blessure --") {
					const downBtn = createElement("button", {
						text: "↓",
						style: { cursor: "pointer", backgroundColor: "transparent", border: "none", color: "#aaa", fontSize: "18px", padding: "5px" },
						attributes: { title: "Descendre" },
						events: {
							click: (e) => {
								e.stopPropagation()
								moveItem(key, 1)
							},
						},
					})
					btnContainer.appendChild(downBtn)
				}

				item.appendChild(btnContainer)
				listContainer.appendChild(item)
			})
		}

		function createNewInjury() {
			const name = "Nouvelle blessure " + (Object.keys(localInjuries).length + 1)
			localInjuries[name] = { type: "", dureeInvalidite: "00:00:00", codePostal: "hospital_zip", blessures: "", examens: {}, traitements: {}, remarques: {}, incapacites: [], coma: false }
			selectedKey = name
			renderList()
			renderForm()
		}

		function renameKey(newName) {
			if (!newName || newName === selectedKey) return
			if (localInjuries[newName]) {
				alert("Ce nom existe déjà")
				return
			}

			const data = localInjuries[selectedKey]
			delete localInjuries[selectedKey]
			localInjuries[newName] = data
			selectedKey = newName
			renderList()
			renderForm()
		}

		function deleteKey() {
			if (!confirm("Supprimer " + selectedKey + " ?")) return
			delete localInjuries[selectedKey]
			const keys = Object.keys(localInjuries)
			selectedKey = keys.length > 0 ? keys[0] : null
			renderList()
			renderForm()
		}

		// Footer
		const footer = createElement("div", {
			style: { padding: "15px", backgroundColor: "#252526", borderTop: "1px solid #333", display: "flex", gap: "10px", justifyContent: "flex-end" },
		})

		const saveBtn = createElement("button", {
			text: "💾 Sauvegarder tout",
			style: { padding: "8px 16px", backgroundColor: "#5C9336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" },
			events: {
				click: () => {
					// Ensure "-- Ajouter une blessure --" is always first
					const finalInjuries = { "-- Ajouter une blessure --": injuries["-- Ajouter une blessure --"] || { type: "", dureeInvalidite: "", codePostal: "" } }

					Object.keys(localInjuries).forEach((key) => {
						if (key !== "-- Ajouter une blessure --") {
							finalInjuries[key] = localInjuries[key]
						}
					})

					injuries = finalInjuries
					localStorage.setItem("injuries_data", JSON.stringify(injuries))
					updateSelectOptions()
					overlay.remove()
				},
			},
		})

		const resetBtn = createElement("button", {
			text: "Reset par défaut",
			style: { padding: "8px 16px", backgroundColor: "#d32f2f", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "auto" },
			events: {
				click: async () => {
					if (confirm("Attention, cela va effacer vos modifications. Continuer ?")) {
						await resetInjuries()
						localInjuries = JSON.parse(JSON.stringify(injuries))
						selectedKey = Object.keys(localInjuries)[0]
						renderList()
						renderForm()
					}
				},
			},
		})

		const closeBtn = createElement("button", {
			text: "Annuler",
			style: { padding: "8px 16px", backgroundColor: "#555", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" },
			events: { click: () => overlay.remove() },
		})

		footer.appendChild(resetBtn)
		footer.appendChild(closeBtn)
		footer.appendChild(saveBtn)

		body.appendChild(sidebar)
		body.appendChild(content)

		header.appendChild(createElement("div")) // Spacer

		container.appendChild(header)
		container.appendChild(body)
		container.appendChild(footer)

		overlay.appendChild(container)
		document.body.appendChild(overlay)

		renderList()
		renderForm()
	}

	function createSelect() {
		const select = createElement("select", {
			id: "rapport-helper-select",
			style: { backgroundColor: "#1e1e1e", color: "#eee", border: "1px solid #555", padding: "6px 8px", borderRadius: "4px", fontSize: "16px", width: "100%" },
			events: { change: () => handleCaseSelection(select.value) },
		})

		Object.keys(injuries).forEach((cas) => {
			select.appendChild(createElement("option", { text: cas, attributes: { value: cas } }))
		})
		return select
	}

	function createInfoPanel() {
		const container = createElement("div", { id: "rapport-helper-alert-container" })

		const info = createElement("p", {
			text: "INFO : Pour le bon fonctionnement de l'outil, il est preferable d'ajouter en priorité les blessures les plus graves.",
			id: "rapport-helper-info",
			style: { color: "teal", fontSize: "14px", margin: "0", textAlign: "center", padding: "0" },
		})

		const alert = createElement("p", {
			text: "ATTENTION : Ces cas ne sont que des exemples courants et doivent être ajustés en fonction de la situation.",
			id: "rapport-helper-alert",
			style: { color: "Coral", fontSize: "14px", margin: "0", textAlign: "center", padding: "0" },
		})

		container.appendChild(info)
		container.appendChild(alert)
		return container
	}

	function createDateCalculatorButton() {
		const btn = createElement("button", {
			text: "🔄️",
			id: "rapport-helper-calc-btn",
			attributes: { type: "button" },
			style: { backgroundColor: "#2a2a2a", color: "#eee", border: "1px solid #555", padding: "0", borderRadius: "4px", cursor: "pointer", fontSize: "26px" },
			events: {
				mouseenter: (e) => (e.target.style.backgroundColor = "#333"),
				mouseleave: (e) => (e.target.style.backgroundColor = "#2a2a2a"),
				click: () => {
					const inputDate = document.querySelector('input[name="admission"]')
					const inputDuration = document.querySelector('input[name="disabilityDuration"]')
					const date = window.parseDateFR(inputDate?.value)
					const duration = inputDuration?.value

					if (!date || !duration || !duration.includes(":")) return

					const [h, m, s] = duration.split(":").map(Number)
					const deltaTime = new Date().getTimezoneOffset() / 60 - window.getTimezoneOffsetFor("Europe/Paris") / 60
					const controlDate = new Date(date.getTime() + ((h + deltaTime) * 3600 + m * 60 + s) * 1000)
					window.setTextFieldValue('input[name="controlVisit"]', window.formatDateTimeFR(controlDate))
				},
			},
		})
		return btn
	}

	function createCustomMenuItem(icon, title, link) {
		return createElement("div", {
			className: "lsesToolItem",
			html: `
        <a color="inherit" class="link_nav css-16qv2i2" href="${link}" target="_blank">
          <div class="MuiBox-root css-1ty8yy2">
            <div class="MuiButtonBase-root MuiListItemButton-root MuiListItemButton-gutters css-12rz11a" tabindex="0" role="button" aria-label="Rapports Medicaux" style="height: 50px;">
              <div class="MuiListItemIcon-root css-5n5rd1">${icon}</div>
              <div class="MuiListItemText-root css-1tsvksn">
                <p class="MuiTypography-root MuiTypography-body1 css-18r5fht" style="white-space: normal;">${title}</p>
              </div>
              <span class="MuiTouchRipple-root css-w0pj6f"></span>
            </div>
          </div>
        </a>
      `,
		})
	}

	// --- Logic & Injections ---

	function handleCaseSelection(key) {
		const data = injuries[key]
		if (!data) return

		const setValue = (selector, value) => window.setTextFieldValue(selector, value)
		const setValueIfEmpty = (selector, value) => window.setTextFieldValueIfEmpty(selector, value)
		const setValueIfMax = (selector, value) => window.setTextFieldValueIfMax(selector, value)

		setValue('input[name="type"]', data.type)
		let zip = data.codePostal
		if (zip === "hospital_zip") zip = localStorage.getItem("user_hospital_zip") || "8040"
		setValueIfEmpty('input[name="zip"]', zip)
		setValueIfMax('input[name="disabilityDuration"]', data.dureeInvalidite)

		addBlessures(data.blessures)
		addExamens(data.examens)
		addTraitements(data.traitements)
		addRemarques(data.remarques)

		// Calcul dates
		const deltaTime = new Date().getTimezoneOffset() / 60 - window.getTimezoneOffsetFor("Europe/Paris") / 60
		const now = new Date(new Date().getTime() + deltaTime * 3600 * 1000)
		setValue('input[name="admission"]', window.formatDateTimeFR(now))

		const [h, m, s] = data.dureeInvalidite.split(":").map(Number)
		const ctrlDate = new Date(now.getTime() + ((h + deltaTime) * 3600 + m * 60 + s) * 1000)
		setValue('input[name="controlVisit"]', window.formatDateTimeFR(ctrlDate))

		// Checkboxes
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
			if (select) select.value = Object.keys(injuries)[0] || "-- Sélectionner une blessure --"
		}, 300)
	}

	function loadVCExams() {
		const title = [...document.querySelectorAll("h5")].find((el) => el.textContent.includes("Nouveau rapport medical") || el.textContent.includes("Modifier le rapport médical"))
		if (!title || document.querySelector("#rapport-helper-select")) return
		if (!(localStorage.getItem("VC_needed") == "true")) return

		const setValue = (s, v) => window.setTextFieldValue(s, v)
		const setValueIfEmpty = (s, v) => window.setTextFieldValueIfEmpty(s, v)

		setValue('input[name="type"]', "Note interne")
		setValueIfEmpty('input[name="zip"]', localStorage.getItem("user_hospital_zip") || "8040")

		addBlessures("VC") // String "VC" ajouté aux blessures
		window.setTextFieldValue('textarea[name="examinationsRemark"]', localStorage.getItem("VC_Exams"))
		window.setTextFieldValue('textarea[name="treatmentsRemark"]', localStorage.getItem("VC_Treatments"))

		const remarks = (localStorage.getItem("VC_Remarks") || "").trim()
		window.setTextFieldValue('textarea[name="remark"]', remarks.length > 0 ? remarks + " + FDS" : "FDS")

		// Dates
		const deltaTime = new Date().getTimezoneOffset() / 60 - window.getTimezoneOffsetFor("Europe/Paris") / 60
		const now = new Date(new Date().getTime() + deltaTime * 3600 * 1000)
		setValue('input[name="admission"]', window.formatDateTimeFR(now))

		localStorage.setItem("VC_needed", false)
		localStorage.setItem("VC_Exams", "")
		localStorage.setItem("VC_Treatments", "")
		localStorage.setItem("VC_Remarks", "")
	}

	function injectSelect() {
		const title = [...document.querySelectorAll("h5")].find((el) => el.textContent.includes("Nouveau rapport medical") || el.textContent.includes("Modifier le rapport médical"))
		if (!title || document.querySelector("#rapport-helper-select")) return

		const container = createElement("div", {
			id: "rapport-helper-select-container",
			style: { margin: "10px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
		})
		container.appendChild(createSelect())
		title.after(container)
	}

	function injectAlert() {
		if (document.querySelector("#rapport-helper-alert")) return
		const container = document.querySelector("#rapport-helper-select-container")
		if (container) container.appendChild(createInfoPanel())
	}

	function injectDateCalculatorButton() {
		if (document.querySelector("#rapport-helper-calc-btn")) return
		const inputFn = document.querySelector('input[name="controlVisit"]')
		if (inputFn) {
			inputFn.parentElement.parentElement.parentElement?.appendChild(createDateCalculatorButton())
		}
	}

	function injectIcon() {
		if (!window.location.href.includes("https://intra.21jumpclick.fr")) {
			document.querySelector("#rapport-helper-icon-container")?.remove()
			return
		}
		if (document.querySelector("#rapport-helper-icon-container")) return

		const container = createElement("div", {
			id: "rapport-helper-icon-container",
			style: { overflow: "hidden", height: "60px", width: "500px", position: "fixed", top: "10px", right: "-450px", zIndex: "9999", display: "flex", flexDirection: "row", alignItems: "center", padding: "5px", backgroundColor: "rgba(44, 44, 44, .9)", borderRadius: "30px", transition: "all 0.2s ease-in-out", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)" },
		})
		sessionStorage.setItem("rapport_helper_menu_open", "false")

		const leftRow = createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center" } })
		const rightRow = createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center" } })

		const openBtn = createElement("span", {
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

		const title = createElement("p", {
			html: `Medical Tool 21JC</br> v${chrome.runtime.getManifest().version} `,
			style: { color: "#5C9336", fontSize: "16px", margin: "0", textAlign: "center" },
		})

		const createConfigBtn = (text, titleAttr, action) =>
			createElement("div", {
				text,
				attributes: { title: titleAttr },
				style: { cursor: "pointer", fontSize: "16px", marginLeft: "6px", color: "white", backgroundColor: "#444", padding: "5px", margin: "5px 0", borderRadius: "4px", width: "250px", textAlign: "center" },
				events: { click: action },
			})

		title.appendChild(
			createConfigBtn("🛠️ Zip par défaut", "Configurer le code zip", () => {
				const zip = prompt("Entrez le code zip de votre hopital :")
				if (zip !== null) {
					localStorage.setItem("user_hospital_zip", zip.trim())
					alert(`Code zip enregistré : ${zip.trim()}`)
				}
			}),
		)
		title.appendChild(createConfigBtn("📝 Configurer la liste", "Modifier le JSON des blessures", () => openInjuriesEditor()))
		title.appendChild(
			createConfigBtn("🩵 Menu LSES", "Activer menu LSES", () => {
				if (confirm("Activer le menu LSES ?")) {
					localStorage.setItem("user_hospital_name", "LSES")
					window.location.reload()
				}
			}),
		)
		title.appendChild(
			createConfigBtn("💚 Menu BCES", "Activer menu BCES", () => {
				if (confirm("Activer le menu BCES ?")) {
					localStorage.setItem("user_hospital_name", "BCES")
					window.location.reload()
				}
			}),
		)
		title.appendChild(
			createConfigBtn("❌ Menu par defaut", "Menu par défaut", () => {
				if (confirm("Revenir au menu par défaut ?")) {
					localStorage.setItem("user_hospital_name", "DEFAULT")
					window.location.reload()
				}
			}),
		)

		leftRow.appendChild(openBtn)
		rightRow.appendChild(createElement("img", { attributes: { src: chrome.runtime.getURL("icons/logo.png") }, style: { width: "200px", height: "200px", zIndex: "1", borderRadius: "16px", marginTop: "10px"} }))
		rightRow.appendChild(title)

		container.appendChild(leftRow)
		container.appendChild(rightRow)
		document.body.appendChild(container)
	}

	function injectBloodTypeButton() {
		if (document.getElementById("modif-blood-btn")) return
		const bloodInput = document.querySelector('input[name="bloodgroup"]')
		const wrapper = bloodInput?.parentElement?.parentElement?.parentElement
		if (!wrapper) return

		const btn = createElement("button", {
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

		// On cherche l'input 'smoking' pour se placer
		const target = document.querySelector('input[name="smoking"]')?.parentElement?.parentElement?.parentElement
		if (target) {
			const div = createElement("div", { style: { marginTop: "4px" } })
			div.appendChild(btn)
			target.appendChild(div)
		}
	}

	function injectSimpleButton(id, label, inputSelector, isTime = false) {
		if (document.getElementById(id)) return
		const input = document.querySelector(inputSelector)
		if (!input) return

		const btn = createElement("button", {
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

		const wrapper = createElement("div", { style: { marginTop: "4px" } })
		wrapper.appendChild(btn)
		input.parentElement.parentElement.appendChild(wrapper)
	}

	function highlightErrorText() {
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false)
		const nodes = []
		while (walker.nextNode()) {
			const node = walker.currentNode
			if (node.parentNode.dataset && node.parentNode.dataset.errorHighlight) continue
			if (node.nodeValue.toLowerCase().includes("infos pas ok")) {
				nodes.push(node)
			}
		}

		nodes.forEach((node) => {
			const span = document.createElement("span")
			span.dataset.errorHighlight = "true"
			const parts = node.nodeValue.split(/(infos pas ok)/gi)
			parts.forEach((part) => {
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

	function injectVCButton() {
		const divList = document.querySelectorAll('div[role="menu"]')
		if (divList.length === 0) return

		for (const div of divList) {
			if (div.querySelector("#modif-vc-btn")) continue
			// Check context
			const region = div.parentElement.parentElement
			const injuryTitle = region.querySelector('div[data-field="injuriesRemark"] div[role="presentation"]')?.innerText.trim().toUpperCase()
			if (["VC", "VM"].includes(injuryTitle)) continue

			const btn = createElement("button", {
				text: "🔬 VC",
				id: "modif-vc-btn",
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

						// Click "New entry" button logic... brittle in original code but kept
						const toolbar = document.querySelector('div[class*="MuiDataGrid-toolbarContainer"]')
						const btns = toolbar?.querySelectorAll('button[type="button"]')
						if (btns && btns[4]) btns[4].click()
					},
				},
			})

			const wrapper = createElement("div", { style: { marginTop: "4px" } })
			wrapper.appendChild(btn)
			div.appendChild(wrapper)
			break
		}
	}

	function injectMenuItems() {
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
			parent.appendChild(createCustomMenuItem(item.icon, item.title, item.link))
		})
	}

	// --- Loop ---

	function inject() {
    if (window.location.href.includes("https://intra.21jumpclick.fr/medical/files")) {
      loadVCExams()
      injectSelect()
      injectAlert()
      injectDateCalculatorButton()
      injectBloodTypeButton()
      injectSimpleButton("modif-vm-btn", "⚕️ VM Maintenant", 'input[name="medicalVisitDate"]')
      injectSimpleButton("modif-dds-btn", "🩸 DDS Maintenant", 'input[name="bloodDonationDate"]', true)
      injectVCButton()
      highlightErrorText()
      console.log("Rapport Helper: Injections effectuées")
    }
    injectIcon()
    injectMenuItems()
	}

	let loopId = null

	function startLoop() {
		if (loopId !== null) return
		loopId = setInterval(() => {
			const before = document.body.innerHTML.length
			inject()
			const after = document.body.innerHTML.length
			if (before === after) {
				clearInterval(loopId)
				loopId = null
			}
		}, 300)
	}

	startLoop()
	document.addEventListener("click", startLoop)
	document.addEventListener("keydown", startLoop)

})()
