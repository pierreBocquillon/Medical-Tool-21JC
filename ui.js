window.RH = window.RH || {}

window.RH.createSelect = function () {
	const select = window.RH.createElement("select", {
		id: "rapport-helper-select",
		style: { backgroundColor: "#1e1e1e", color: "#eee", border: "1px solid #555", padding: "6px 8px", borderRadius: "4px", fontSize: "16px", width: "100%" },
		events: { change: () => window.RH.handleCaseSelection(select.value) },
	})
	Object.keys(window.RH.injuries).forEach((cas) => {
		select.appendChild(window.RH.createElement("option", { text: cas, attributes: { value: cas } }))
	})
	return select
}

window.RH.createInfoPanel = function () {
	const container = window.RH.createElement("div", { id: "rapport-helper-alert-container" })
	container.appendChild(window.RH.createElement("p", {
		text: "INFO : Pour le bon fonctionnement de l'outil, il est preferable d'ajouter en priorité les blessures les plus graves.",
		id: "rapport-helper-info",
		style: { color: "teal", fontSize: "14px", margin: "0", textAlign: "center", padding: "0" },
	}))
	container.appendChild(window.RH.createElement("p", {
		text: "ATTENTION : Ces cas ne sont que des exemples courants et doivent être ajustés en fonction de la situation.",
		id: "rapport-helper-alert",
		style: { color: "Coral", fontSize: "14px", margin: "0", textAlign: "center", padding: "0" },
	}))
	return container
}

window.RH.createDateCalculatorButton = function () {
	return window.RH.createElement("button", {
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
}

window.RH.createCustomMenuItem = function (icon, title, link) {
	return window.RH.createElement("div", {
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
