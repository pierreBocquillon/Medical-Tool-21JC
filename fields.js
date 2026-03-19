window.RH = window.RH || {}

window.RH.addBlessures = function (blessures) {
	const field = document.querySelector('textarea[name="injuriesRemark"]')
	if (!field) return
	const current = field.value.trim().split("+").map((s) => s.trim()).filter((s) => s)
	const newValue = [...new Set(current.concat(blessures))].join(" + ")
	window.setTextFieldValue('textarea[name="injuriesRemark"]', newValue)
}

window.RH.addExamens = function (examens) {
	window.RH.updateRemarkField('textarea[name="examinationsRemark"]', examens, {
		order: ["Constantes", "Auscultation", "Radio", "Echo", "IRM", "Scanner", "Ethylometre", "Test", "Autres"],
	})
}

window.RH.addTraitements = function (traitements) {
	const processTraitements = (parsedArray) => {
		let counter = 0
		for (let obj of parsedArray) {
			if (obj.Autres) {
				if (counter === 0) { obj.Manipulations = obj.Autres; delete obj.Autres; counter++ }
				else if (counter === 1) { obj.Medicaments = obj.Autres; delete obj.Autres; counter++ }
			}
		}
		const hasChirAG = parsedArray.some((obj) => obj["Chir AG"]?.length > 0)
		if (hasChirAG) {
			return parsedArray.map((obj) => {
				if (obj["Chir AL"]) { obj["Chir AG"] = obj["Chir AL"]; delete obj["Chir AL"] }
				return obj
			})
		}
		return parsedArray
	}

	window.RH.updateRemarkField('textarea[name="treatmentsRemark"]', traitements, {
		order: ["Chir AG", "Chir AL", "Manipulations", "Medicaments", "Autres"],
		processData: processTraitements,
	})
}

window.RH.addRemarques = function (remarques) {
	const field = document.querySelector('textarea[name="remark"]')
	if (!field) return

	if (typeof remarques === "string" && remarques.trim().length > 0) {
		let current = field.value
		if (current && !current.endsWith("\n")) current += "\n"
		window.setTextFieldValue('textarea[name="remark"]', current + remarques)
		return
	}

	window.RH.updateRemarkField('textarea[name="remark"]', remarques, {
		order: ["Pret", "Facturation", "Autres"],
	})

	let val = field.value
	val = val
		.replace("VISITE MEDICALE // TEST EFFORT [OK] // [APPROUVÉ AU SERVICE]", "[[VMSP]]")
		.replace("VISITE MEDICALE // [APPROUVÉ AU SERVICE]", "[[VMC]]")
		.replace("[[VMSP]]", "VISITE MEDICALE // TEST EFFORT [OK] // [APPROUVÉ AU SERVICE]")
		.replace("[[VMC]]", "VISITE MEDICALE // [APPROUVÉ AU SERVICE]")
	window.setTextFieldValue('textarea[name="remark"]', val)
}
