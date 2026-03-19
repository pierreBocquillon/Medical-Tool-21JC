;(async () => {
	window.RH = window.RH || {}
	window.RH.injuries = {}

	window.RH.resetInjuries = async function () {
		try {
			window.RH.injuries = await fetch(chrome.runtime.getURL("data/injuries.json")).then((res) => res.json())
			localStorage.setItem("injuries_data", JSON.stringify(window.RH.injuries))
		} catch (e) {
			console.error("Erreur chargement data/injuries.json", e)
		}
	}

	async function loadInjuries() {
		const stored = localStorage.getItem("injuries_data")
		if (stored) {
			try {
				window.RH.injuries = JSON.parse(stored)
			} catch (e) {
				console.error("Erreur parsing localStorage, reset.", e)
				await window.RH.resetInjuries()
			}
		} else {
			await window.RH.resetInjuries()
		}
	}

	await loadInjuries()

	function inject() {
		if (window.location.href.includes("https://intra.21jumpclick.fr/medical/files")) {
			window.RH.loadVCExams()
			window.RH.injectSelect()
			window.RH.injectAlert()
			window.RH.injectDateCalculatorButton()
			window.RH.injectBloodTypeButton()
			window.RH.injectSimpleButton("modif-vm-btn", "⚕️ VM Maintenant", 'input[name="medicalVisitDate"]')
			window.RH.injectSimpleButton("modif-dds-btn", "🩸 DDS Maintenant", 'input[name="bloodDonationDate"]', true)
			window.RH.injectVCButton()
			window.RH.highlightErrorText()
		}
		window.RH.injectIcon()
		window.RH.injectMenuItems()
	}

	let debounceTimer = null

	function runInject() {
		observer.disconnect()
		inject()
		observer.observe(document.body, { childList: true, subtree: true })
	}

	const observer = new MutationObserver(() => {
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(runInject, 150)
	})

	runInject()
})()
