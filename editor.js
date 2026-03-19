window.RH = window.RH || {}

window.RH.updateSelectOptions = function () {
	const select = document.querySelector("#rapport-helper-select")
	if (!select) return
	select.innerHTML = ""
	Object.keys(window.RH.injuries).forEach((cas) => {
		select.appendChild(window.RH.createElement("option", { text: cas, attributes: { value: cas } }))
	})
	select.value = Object.keys(window.RH.injuries)[0] || ""
}

window.RH.openInjuriesEditor = function () {
	if (document.getElementById("injuries-editor-overlay")) return

	let localInjuries = JSON.parse(JSON.stringify(window.RH.injuries))
	let selectedKey = Object.keys(localInjuries)[0] || null

	const overlay = window.RH.createElement("div", {
		id: "injuries-editor-overlay",
		style: { position: "fixed", top: "0", left: "0", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.8)", zIndex: "10000", display: "flex", justifyContent: "center", alignItems: "center" },
	})

	const container = window.RH.createElement("div", {
		style: { backgroundColor: "#1e1e1e", padding: "0", borderRadius: "8px", width: "90%", height: "90%", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #555" },
	})

	const header = window.RH.createElement("div", {
		style: { padding: "15px", backgroundColor: "#252526", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" },
		html: `<h2 style="color: #eee; margin: 0; font-size: 18px;">Éditeur de Blessures</h2>`,
	})

	const body = window.RH.createElement("div", { style: { flex: "1", display: "flex", overflow: "hidden" } })

	const sidebar = window.RH.createElement("div", {
		style: { width: "250px", borderRight: "1px solid #333", display: "flex", flexDirection: "column", backgroundColor: "#252526" },
	})

	const listContainer = window.RH.createElement("div", { style: { flex: "1", overflowY: "auto" } })

	const addBtn = window.RH.createElement("button", {
		text: "+ Nouvelle blessure",
		style: { width: "100%", padding: "10px", backgroundColor: "#333", color: "#eee", border: "none", borderBottom: "1px solid #444", cursor: "pointer", textAlign: "left" },
		events: { click: () => createNewInjury() },
	})
	sidebar.appendChild(addBtn)
	sidebar.appendChild(listContainer)

	const content = window.RH.createElement("div", {
		style: { flex: "1", padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "15px", color: "#eee" },
	})

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

		const createRow = (label, input) => {
			const row = window.RH.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "5px" } })
			row.appendChild(window.RH.createElement("label", { text: label, style: { fontSize: "12px", color: "#aaa" } }))
			row.appendChild(input)
			return row
		}

		const createInput = (key, val) =>
			window.RH.createElement("input", {
				attributes: { value: val || "" },
				style: { padding: "8px", backgroundColor: "#333", border: "1px solid #444", color: "white", borderRadius: "4px" },
				events: { input: (e) => { localInjuries[selectedKey][key] = e.target.value } },
			})

		const idInput = window.RH.createElement("input", {
			attributes: { value: selectedKey },
			style: { padding: "8px", backgroundColor: "#333", border: "1px solid #444", color: "white", borderRadius: "4px", fontWeight: "bold" },
			events: { change: (e) => renameKey(e.target.value) },
		})
		content.appendChild(createRow("Nom de la blessure (ID)", idInput))

		const typeSelect = window.RH.createElement("select", {
			style: { padding: "8px", backgroundColor: "#333", border: "1px solid #444", color: "white", borderRadius: "4px" },
			events: { change: (e) => { localInjuries[selectedKey].type = e.target.value } },
		})
		;["Note interne", "Intervention", "Consultation"].forEach((t) => {
			const opt = window.RH.createElement("option", { text: t, attributes: { value: t } })
			if (t === data.type) opt.selected = true
			typeSelect.appendChild(opt)
		})

		const grid = window.RH.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" } })
		grid.appendChild(createRow("Type", typeSelect))
		grid.appendChild(createRow("Durée (HH:MM:SS)", createInput("dureeInvalidite", data.dureeInvalidite)))
		grid.appendChild(createRow("Code Postal (« hospital_zip » pour le code postal par défaut de l'hôpital)", createInput("codePostal", data.codePostal)))
		content.appendChild(grid)

		const createCategorySection = (title, fieldName, allowedKeys) => {
			const wrapper = window.RH.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "10px", padding: "10px", border: "1px solid #444", borderRadius: "4px", backgroundColor: "#252526" } })
			wrapper.appendChild(window.RH.createElement("h4", { text: title, style: { margin: "0", color: "#ddd", fontSize: "14px" } }))

			if (!localInjuries[selectedKey][fieldName] || typeof localInjuries[selectedKey][fieldName] !== "object") {
				localInjuries[selectedKey][fieldName] = {}
			}
			const fieldData = localInjuries[selectedKey][fieldName]
			const sectionGrid = window.RH.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" } })

			allowedKeys.forEach((key) => {
				let val = fieldData[key]
				if (val && !Array.isArray(val)) val = [val]
				const currentVal = (val || []).join(" + ")

				const input = window.RH.createElement("input", {
					attributes: { value: currentVal, placeholder: "..." },
					style: { padding: "6px", backgroundColor: "#333", border: "1px solid #444", color: "white", borderRadius: "4px", width: "100%", boxSizing: "border-box" },
					events: {
						change: (e) => {
							const v = e.target.value.split("+").map((s) => s.trim()).filter((s) => s)
							if (v.length > 0) fieldData[key] = v
							else delete fieldData[key]
						},
					},
				})

				const label = window.RH.createElement("label", { text: key, style: { fontSize: "11px", color: "#aaa", display: "block", marginBottom: "2px" } })
				const inputContainer = window.RH.createElement("div")
				inputContainer.appendChild(label)
				inputContainer.appendChild(input)
				sectionGrid.appendChild(inputContainer)
			})

			wrapper.appendChild(sectionGrid)
			return wrapper
		}

		const createTextarea = (val) =>
			window.RH.createElement("textarea", {
				text: val || "",
				style: { padding: "8px", backgroundColor: "#333", border: "1px solid #444", color: "white", borderRadius: "4px", minHeight: "60px", fontFamily: "monospace", whiteSpace: "pre" },
				events: { change: (e) => { localInjuries[selectedKey].blessures = e.target.value } },
			})

		content.appendChild(createRow("Blessures (Ex: A + B)", createTextarea(data.blessures)))
		content.appendChild(createCategorySection("Examens", "examens", ["Constantes", "Auscultation", "Radio", "Echo", "IRM", "Scanner", "Ethylometre", "Test salivaire", "Autres"]))
		content.appendChild(createCategorySection("Traitements", "traitements", ["Chir AG", "Chir AL", "Manipulations", "Medicaments", "Autres"]))

		let remarkVal = data.remarques || ""
		if (typeof remarkVal === "object") remarkVal = Object.values(remarkVal).flat().join(" + ")

		const remarksInput = window.RH.createElement("textarea", {
			text: remarkVal,
			style: { padding: "8px", backgroundColor: "#333", border: "1px solid #444", color: "white", borderRadius: "4px", minHeight: "60px", fontFamily: "monospace", whiteSpace: "pre" },
			events: { change: (e) => { localInjuries[selectedKey].remarques = e.target.value } },
		})
		const remarksGroup = window.RH.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "5px" } })
		remarksGroup.appendChild(window.RH.createElement("label", { text: "Remarques", style: { fontSize: "12px", color: "#aaa" } }))
		remarksGroup.appendChild(remarksInput)
		content.appendChild(remarksGroup)

		const extraGrid = window.RH.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", alignItems: "center" } })

		const incContainer = window.RH.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "5px" } })
		incContainer.appendChild(window.RH.createElement("label", { text: "Incapacités", style: { fontSize: "12px", color: "#aaa" } }))
		;[{ id: 1, label: "Saut (1)" }, { id: 2, label: "Course (2)" }, { id: 3, label: "Conduite (3)" }, { id: 4, label: "Armes (4)" }].forEach((opt) => {
			const wrapper = window.RH.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } })
			const checkbox = window.RH.createElement("input", {
				attributes: { type: "checkbox" },
				events: {
					change: (e) => {
						let currentInc = localInjuries[selectedKey].incapacites || []
						if (e.target.checked) { if (!currentInc.includes(opt.id)) currentInc.push(opt.id) }
						else currentInc = currentInc.filter((i) => i !== opt.id)
						localInjuries[selectedKey].incapacites = currentInc.sort((a, b) => a - b)
					},
				},
			})
			if ((data.incapacites || []).includes(opt.id)) checkbox.checked = true
			wrapper.appendChild(checkbox)
			wrapper.appendChild(window.RH.createElement("label", { text: opt.label, style: { fontSize: "13px", color: "#ddd" } }))
			incContainer.appendChild(wrapper)
		})
		extraGrid.appendChild(incContainer)

		const comaDiv = window.RH.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginTop: "20px" } })
		const comaCheck = window.RH.createElement("input", {
			attributes: { type: "checkbox", ...(data.coma ? { checked: "true" } : {}) },
			events: { change: (e) => { localInjuries[selectedKey].coma = e.target.checked } },
		})
		comaDiv.appendChild(comaCheck)
		comaDiv.appendChild(window.RH.createElement("label", { text: "Coma" }))
		extraGrid.appendChild(comaDiv)
		content.appendChild(extraGrid)

		content.appendChild(window.RH.createElement("button", {
			text: "🗑️ Supprimer cette blessure",
			style: { marginTop: "20px", padding: "10px", backgroundColor: "#d32f2f", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", alignSelf: "flex-start" },
			events: { click: () => deleteKey() },
		}))
	}

	function moveItem(key, direction) {
		const keys = Object.keys(localInjuries)
		const index = keys.indexOf(key)
		if (index === -1) return
		const newIndex = index + direction
		if (newIndex < 0 || newIndex >= keys.length) return
		const newKeys = [...keys]
		;[newKeys[index], newKeys[newIndex]] = [newKeys[newIndex], newKeys[index]]
		const newObj = {}
		newKeys.forEach((k) => { newObj[k] = localInjuries[k] })
		localInjuries = newObj
		renderList()
	}

	function renderList() {
		listContainer.innerHTML = ""
		Object.keys(localInjuries).forEach((key, index, arr) => {
			if (key === "-- Ajouter une blessure --") return

			const item = window.RH.createElement("div", {
				style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", backgroundColor: selectedKey === key ? "#37373d" : "transparent", borderBottom: "1px solid #333" },
			})

			item.appendChild(window.RH.createElement("span", {
				text: key,
				style: { cursor: "pointer", color: "#ccc", flex: "1", fontSize: "14px" },
				events: { click: () => { selectedKey = key; renderList(); renderForm() } },
			}))

			const btnContainer = window.RH.createElement("div", { style: { display: "flex", gap: "2px" } })

			if (index > 0 && arr[index - 1] !== "-- Ajouter une blessure --") {
				btnContainer.appendChild(window.RH.createElement("button", {
					text: "↑",
					style: { cursor: "pointer", backgroundColor: "transparent", border: "none", color: "#aaa", fontSize: "18px", padding: "5px" },
					attributes: { title: "Monter" },
					events: { click: (e) => { e.stopPropagation(); moveItem(key, -1) } },
				}))
			}

			if (index < arr.length - 1 && arr[index + 1] !== "-- Ajouter une blessure --") {
				btnContainer.appendChild(window.RH.createElement("button", {
					text: "↓",
					style: { cursor: "pointer", backgroundColor: "transparent", border: "none", color: "#aaa", fontSize: "18px", padding: "5px" },
					attributes: { title: "Descendre" },
					events: { click: (e) => { e.stopPropagation(); moveItem(key, 1) } },
				}))
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
		if (localInjuries[newName]) { alert("Ce nom existe déjà"); return }
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

	const footer = window.RH.createElement("div", {
		style: { padding: "15px", backgroundColor: "#252526", borderTop: "1px solid #333", display: "flex", gap: "10px", justifyContent: "flex-end" },
	})

	footer.appendChild(window.RH.createElement("button", {
		text: "Reset par défaut",
		style: { padding: "8px 16px", backgroundColor: "#d32f2f", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "auto" },
		events: {
			click: async () => {
				if (confirm("Attention, cela va effacer vos modifications. Continuer ?")) {
					await window.RH.resetInjuries()
					localInjuries = JSON.parse(JSON.stringify(window.RH.injuries))
					selectedKey = Object.keys(localInjuries)[0]
					renderList()
					renderForm()
				}
			},
		},
	}))

	footer.appendChild(window.RH.createElement("button", {
		text: "Annuler",
		style: { padding: "8px 16px", backgroundColor: "#555", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" },
		events: { click: () => overlay.remove() },
	}))

	footer.appendChild(window.RH.createElement("button", {
		text: "💾 Sauvegarder tout",
		style: { padding: "8px 16px", backgroundColor: "#5C9336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" },
		events: {
			click: () => {
				const finalInjuries = { "-- Ajouter une blessure --": window.RH.injuries["-- Ajouter une blessure --"] || { type: "", dureeInvalidite: "", codePostal: "" } }
				Object.keys(localInjuries).forEach((key) => {
					if (key !== "-- Ajouter une blessure --") finalInjuries[key] = localInjuries[key]
				})
				window.RH.injuries = finalInjuries
				localStorage.setItem("injuries_data", JSON.stringify(window.RH.injuries))
				window.RH.updateSelectOptions()
				overlay.remove()
			},
		},
	}))

	body.appendChild(sidebar)
	body.appendChild(content)
	header.appendChild(window.RH.createElement("div"))
	container.appendChild(header)
	container.appendChild(body)
	container.appendChild(footer)
	overlay.appendChild(container)
	document.body.appendChild(overlay)

	renderList()
	renderForm()
}
