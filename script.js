/**
 * ==========================================================================
 * RistoManager Pro - Logic & Storage Core (Soddisfa requisiti CRUD e Persistenza)
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initAppCore();
});

/* ==========================================================================
   SISTEMA DI NAVIGAZIONE TAB (Single Page Application)
   ========================================================================== */
function initNavigation() {
    const buttons = document.querySelectorAll(".nav-btn");
    const contents = document.querySelectorAll(".tab-content");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-target");

            buttons.forEach(b => b.classList.remove("active"));
            contents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById(target).classList.add("active");
        });
    });
}

/* ==========================================================================
   LOGICA APPLICATIVA CORE (CRUD & LOCALSTORAGE)
   ========================================================================== */
function initAppCore() {
    // Caricamento dei dati preesistenti da LocalStorage (Garantisce persistenza post-riavvio)
    let db = {
        prenotazioni: JSON.parse(localStorage.getItem("db_prenotazioni")) || [],
        menu: JSON.parse(localStorage.getItem("db_menu")) || [],
        ordini: JSON.parse(localStorage.getItem("db_ordini")) || [],
        feedback: JSON.parse(localStorage.getItem("db_feedback")) || []
    };

    // Inizializzazione Dati Mock Demo se vuoti (per agevolare la prima presentazione Scrum)
    if(db.prenotazioni.length === 0 && db.menu.length === 0) {
        db.prenotazioni = [
            { id: "p1", nome: "Alessandro Rossi", tavolo: 4, coperti: 3, data: "2026-06-25T20:30" },
            { id: "p2", nome: "Chiara Bianchi", tavolo: 12, coperti: 2, data: "2026-06-26T21:00" }
        ];
        db.menu = [
            { id: "m1", piatto: "Spaghetti alle Vongole", categoria: "Primi", prezzo: 14.00 },
            { id: "m2", piatto: "Tagliata di Manzo con rucola", categoria: "Secondi", prezzo: 18.50 },
            { id: "m3", piatto: "Tiramisù della Casa", categoria: "Dolci", prezzo: 6.00 }
        ];
        db.ordini = [
            { id: "o1", tavolo: 4, dettagli: "1x Spaghetti Vongole, 1x Acqua Naturale", stato: "In Preparazione" }
        ];
        db.feedback = [
            { id: "f1", nome: "Giacomo", voto: 5, commento: "Cibo spettacolare e servizio impeccabile!" }
        ];
        saveAll(db);
    }

    // Render iniziale di tutte le tabelle (Operazione READ)
    renderAll(db);

    // ==========================================
    // SEZIONE PRENOTAZIONI - EVENTI CRUD
    // ==========================================
    const formP = document.getElementById("form-prenotazione");
    const cancelP = document.getElementById("btn-p-cancel");

    formP.addEventListener("submit", (e) => {
        e.preventDefault();
        const mode = formP.getAttribute("data-mode");
        const itemData = {
            nome: document.getElementById("p-nome").value,
            tavolo: parseInt(document.getElementById("p-tavolo").value),
            coperti: parseInt(document.getElementById("p-coperti").value),
            data: document.getElementById("p-data").value
        };

        if (mode === "insert") {
            // CREATE
            itemData.id = "p_" + Date.now();
            db.prenotazioni.push(itemData);
        } else if (mode === "edit") {
            // UPDATE
            const id = formP.getAttribute("data-edit-id");
            const index = db.prenotazioni.findIndex(item => item.id === id);
            if (index !== -1) {
                itemData.id = id;
                db.prenotazioni[index] = itemData;
            }
            resetForm(formP, cancelP, "Aggiungi Prenotazione", "Salva Prenotazione");
        }
        saveAndRefresh(db, "prenotazioni");
    });

    cancelP.addEventListener("click", () => {
        resetForm(formP, cancelP, "Aggiungi Prenotazione", "Salva Prenotazione");
    });

    // ==========================================
    // SEZIONE MENU - EVENTI CRUD
    // ==========================================
    const formM = document.getElementById("form-menu");
    const cancelM = document.getElementById("btn-m-cancel");

    formM.addEventListener("submit", (e) => {
        e.preventDefault();
        const mode = formM.getAttribute("data-mode");
        const itemData = {
            piatto: document.getElementById("m-piatto").value,
            categoria: document.getElementById("m-categoria").value,
            prezzo: parseFloat(document.getElementById("m-prezzo").value).toFixed(2)
        };

        if (mode === "insert") {
            itemData.id = "m_" + Date.now();
            db.menu.push(itemData);
        } else if (mode === "edit") {
            const id = formM.getAttribute("data-edit-id");
            const index = db.menu.findIndex(item => item.id === id);
            if (index !== -1) {
                itemData.id = id;
                db.menu[index] = itemData;
            }
            resetForm(formM, cancelM, "Aggiungi Piatto", "Aggiungi Piatto");
        }
        saveAndRefresh(db, "menu");
    });

    cancelM.addEventListener("click", () => {
        resetForm(formM, cancelM, "Aggiungi Piatto", "Aggiungi Piatto");
    });

    // ==========================================
    // SEZIONE ORDINI - EVENTI CRUD
    // ==========================================
    const formO = document.getElementById("form-ordini");
    const cancelO = document.getElementById("btn-o-cancel");

    formO.addEventListener("submit", (e) => {
        e.preventDefault();
        const mode = formO.getAttribute("data-mode");
        const itemData = {
            tavolo: parseInt(document.getElementById("o-tavolo").value),
            dettagli: document.getElementById("o-dettagli").value,
            stato: document.getElementById("o-stato").value
        };

        if (mode === "insert") {
            itemData.id = "o_" + Date.now();
            db.ordini.push(itemData);
        } else if (mode === "edit") {
            const id = formO.getAttribute("data-edit-id");
            const index = db.ordini.findIndex(item => item.id === id);
            if (index !== -1) {
                itemData.id = id;
                db.ordini[index] = itemData;
            }
            resetForm(formO, cancelO, "Nuovo Ordine", "Invia Ordine");
        }
        saveAndRefresh(db, "ordini");
    });

    cancelO.addEventListener("click", () => {
        resetForm(formO, cancelO, "Nuovo Ordine", "Invia Ordine");
    });

    // ==========================================
    // SEZIONE FEEDBACK - EVENTI CRUD
    // ==========================================
    const formF = document.getElementById("form-feedback");
    const cancelF = document.getElementById("btn-f-cancel");

    formF.addEventListener("submit", (e) => {
        e.preventDefault();
        const mode = formF.getAttribute("data-mode");
        const itemData = {
            nome: document.getElementById("f-nome").value || "Anonimo",
            voto: parseInt(document.getElementById("f-voto").value),
            commento: document.getElementById("f-commento").value
        };

        if (mode === "insert") {
            itemData.id = "f_" + Date.now();
            db.feedback.push(itemData);
        } else if (mode === "edit") {
            const id = formF.getAttribute("data-edit-id");
            const index = db.feedback.findIndex(item => item.id === id);
            if (index !== -1) {
                itemData.id = id;
                db.feedback[index] = itemData;
            }
            resetForm(formF, cancelF, "Rilascia Recensione", "Invia Feedback");
        }
        saveAndRefresh(db, "feedback");
    });

    cancelF.addEventListener("click", () => {
        resetForm(formF, cancelF, "Rilascia Recensione", "Invia Feedback");
    });

    // Delegazione Eventi per Modifica e Cancellazione (Rende i bottoni dinamici interattivi)
    window.handleAction = function(entity, action, id) {
        if (action === "delete") {
            // DELETE
            if (confirm("Sicuro di voler eliminare questa voce?")) {
                db[entity] = db[entity].filter(item => item.id !== id);
                saveAndRefresh(db, entity);
            }
        } else if (action === "edit") {
            // PREPARA L'UPDATE (Carica dati nel rispettivo form)
            const item = db[entity].find(i => i.id === id);
            if (!item) return;

            if (entity === "prenotazioni") {
                document.getElementById("p-nome").value = item.nome;
                document.getElementById("p-tavolo").value = item.tavolo;
                document.getElementById("p-coperti").value = item.coperti;
                document.getElementById("p-data").value = item.data;
                prepareForm(formP, cancelP, "Modifica Prenotazione", "Salva Modifiche", id);
            } else if (entity === "menu") {
                document.getElementById("m-piatto").value = item.piatto;
                document.getElementById("m-categoria").value = item.categoria;
                document.getElementById("m-prezzo").value = item.prezzo;
                prepareForm(formM, cancelM, "Modifica Piatto", "Salva Modifiche", id);
            } else if (entity === "ordini") {
                document.getElementById("o-tavolo").value = item.tavolo;
                document.getElementById("o-dettagli").value = item.dettagli;
                document.getElementById("o-stato").value = item.stato;
                prepareForm(formO, cancelO, "Modifica Stato Ordine", "Aggiorna Ordine", id);
            } else if (entity === "feedback") {
                document.getElementById("f-nome").value = item.nome;
                document.getElementById("f-voto").value = item.voto;
                document.getElementById("f-commento").value = item.commento;
                prepareForm(formF, cancelF, "Modifica Recensione", "Salva Modifiche", id);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
}

/* ==========================================================================
   FUNZIONI AUSILIARIE (RE-RENDER DELLE TABELLE HTML)
   ========================================================================== */
function renderAll(db) {
    renderPrenotazioni(db.prenotazioni);
    renderMenu(db.menu);
    renderOrdini(db.ordini);
    renderFeedback(db.feedback);
}

function saveAndRefresh(db, entity) {
    localStorage.setItem("db_" + entity, JSON.stringify(db[entity]));
    if (entity === "prenotazioni") renderPrenotazioni(db.prenotazioni);
    if (entity === "menu") renderMenu(db.menu);
    if (entity === "ordini") renderOrdini(db.ordini);
    if (entity === "feedback") renderFeedback(db.feedback);
}

function saveAll(db) {
    localStorage.setItem("db_prenotazioni", JSON.stringify(db.prenotazioni));
    localStorage.setItem("db_menu", JSON.stringify(db.menu));
    localStorage.setItem("db_ordini", JSON.stringify(db.ordini));
    localStorage.setItem("db_feedback", JSON.stringify(db.feedback));
}

function prepareForm(form, cancelBtn, titleText, submitText, id) {
    form.setAttribute("data-mode", "edit");
    form.setAttribute("data-edit-id", id);
    const titleEl = document.getElementById(form.id + "-title");
    const submitEl = form.querySelector("button[type='submit']");
    if (titleEl) titleEl.innerText = titleText;
    if (submitEl) submitEl.innerText = submitText;
    cancelBtn.classList.remove("hidden");
}

function resetForm(form, cancelBtn, titleText, submitText) {
    form.reset();
    form.setAttribute("data-mode", "insert");
    form.setAttribute("data-edit-id", "");
    const titleEl = document.getElementById(form.id + "-title");
    const submitEl = form.querySelector("button[type='submit']");
    if (titleEl) titleEl.innerText = titleText;
    if (submitEl) submitEl.innerText = submitText;
    cancelBtn.classList.add("hidden");
}

function renderPrenotazioni(data) {
    const tbody = document.querySelector("#table-prenotazioni tbody");
    tbody.innerHTML = "";
    data.forEach(item => {
        const dateFormatted = item.data.replace("T", " ");
        tbody.innerHTML += `
            <tr>
                <td><strong>${item.nome}</strong></td>
                <td>Tavolo ${item.tavolo}</td>
                <td>${item.coperti} persone</td>
                <td>${dateFormatted}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="handleAction('prenotazioni', 'edit', '${item.id}')">Modifica</button>
                    <button class="btn btn-danger btn-sm" onclick="handleAction('prenotazioni', 'delete', '${item.id}')">Elimina</button>
                </td>
            </tr>
        `;
    });
}

function renderMenu(data) {
    const tbody = document.querySelector("#table-menu tbody");
    tbody.innerHTML = "";
    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${item.piatto}</strong></td>
                <td><span class="badge badge-progress">${item.categoria}</span></td>
                <td>${item.prezzo} €</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="handleAction('menu', 'edit', '${item.id}')">Modifica</button>
                    <button class="btn btn-danger btn-sm" onclick="handleAction('menu', 'delete', '${item.id}')">Elimina</button>
                </td>
            </tr>
        `;
    });
}

function renderOrdini(data) {
    const tbody = document.querySelector("#table-ordini tbody");
    tbody.innerHTML = "";
    data.forEach(item => {
        let badgeClass = "badge-waiting";
        if(item.stato === "In Preparazione") badgeClass = "badge-progress";
        if(item.stato === "Completato") badgeClass = "badge-completed";

        tbody.innerHTML += `
            <tr>
                <td><strong>Tavolo ${item.tavolo}</strong></td>
                <td>${item.dettagli}</td>
                <td><span class="badge ${badgeClass}">${item.stato}</span></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="handleAction('ordini', 'edit', '${item.id}')">Stato</button>
                    <button class="btn btn-danger btn-sm" onclick="handleAction('ordini', 'delete', '${item.id}')">Elimina</button>
                </td>
            </tr>
        `;
    });
}

function renderFeedback(data) {
    const tbody = document.querySelector("#table-feedback tbody");
    tbody.innerHTML = "";
    data.forEach(item => {
        const stars = "⭐".repeat(item.voto);
        tbody.innerHTML += `
            <tr>
                <td><strong>${item.nome}</strong></td>
                <td>${stars}</td>
                <td><em>"${item.commento}"</em></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="handleAction('feedback', 'edit', '${item.id}')">Modifica</button>
                    <button class="btn btn-danger btn-sm" onclick="handleAction('feedback', 'delete', '${item.id}')">Elimina</button>
                </td>
            </tr>
        `;
    });
}
