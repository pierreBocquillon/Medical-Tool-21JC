window.RH = window.RH || {}

window.RH.createElement = function (tag, { text, html, id, style, className, attributes, events, children } = {}) {
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

window.RH.parseRemarkField = function (value) {
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
				const values = parts.slice(1).join(":").trim().split("+").map((v) => v.trim())
				return { [key]: values }
			} else {
				const values = s.split("+").map((v) => v.trim())
				if (values.length >= 1) return { Autres: values }
			}
			return null
		})
		.filter(Boolean)
}

window.RH.mergeParsedData = function (parsedArray) {
	return parsedArray.reduce((acc, obj) => {
		for (let key in obj) {
			if (!acc[key]) acc[key] = []
			acc[key] = [...new Set(acc[key].concat(obj[key]))]
		}
		return acc
	}, {})
}

window.RH.formatRemarkData = function (data, order = [], exceptions = {}) {
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
			const valuesStr = data[key].join(" + ")
			if (exceptions.removeKeyLabel && exceptions.removeKeyLabel.includes(key)) return valuesStr
			return `${key}: ${valuesStr}`
		})
		.join(" // ")
		.replace("RAS + ", "")
		.replace("+ RAS", "")
}

window.RH.updateRemarkField = function (selector, newData, { order = [], processData = null, isString = false } = {}) {
	const field = document.querySelector(selector)
	if (!field) return

	if (isString) {
		window.setTextFieldValue(selector, newData)
		return
	}

	let parsedArray = window.RH.parseRemarkField(field.value)
	if (processData) parsedArray = processData(parsedArray)

	let currentData = window.RH.mergeParsedData(parsedArray)

	for (let key in newData) {
		if (!currentData[key]) currentData[key] = []
		currentData[key] = [...new Set(currentData[key].concat(newData[key]))]
	}

	if (currentData["Chir AL"]?.length > 0 && currentData["Chir AG"]?.length > 0) {
		currentData["Chir AG"] = currentData["Chir AG"].concat(currentData["Chir AL"])
		delete currentData["Chir AL"]
	}

	const formatted = window.RH.formatRemarkData(currentData, order, { removeKeyLabel: ["Autres", "Medicaments", "Manipulations"] })
	window.setTextFieldValue(selector, formatted)
}
