/**
 * ==========================================================================
 * RistoManager Pro - Sistema di Controllo Multiruolo ed Architettura Dati
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    initAppRouting();
    initAppCoreLogic();
});

/* ==========================================================================
   SISTEMA DI ROUTING, ACCESSO E NAVIGAZIONE (SPA)
   ========================================================================== */
function initAppRouting() {
    const buttons = document.querySelectorAll(".nav-btn:not(#btn-logout)");
    const contents = document.querySelectorAll(".tab-content");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-target");

            // Verifica blocco di sicurezza preventivo per viste admin
            if (target.startsWith("view-admin-") && sessionStorage.getItem("admin_logged") !== "true") {
                alert("Accesso negato. Autenticarsi prima nell'Area Riservata.");
                switchView("view-login");
                return;
            }

            switchView(target);
        });
    });

    // Funzione interna globale per scambiare i tab ed i bottoni attivi
    window.switchView = function(targetId) {
        contents.forEach(c => c.classList.remove("active"));
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));

        const targetContent = document.getElementById(targetId);
        if(targetContent) targetContent.classList.add("active");

        const matchingBtn = document.querySelector(`[data-target="${targetId}"]`);
        if(matchingBtn) matchingBtn.classList.add("active");
    };
}

/* ==========================================================================
   CORE APPLICATION LOGIC (MODEL - CONTROLLER - SELEZIONI)
   ========================================================================== */
function initAppCoreLogic() {
    // --- MODEL SYSTEM (INIZIALIZZAZIONE DATABASE IN MEMORIA DA LOCALSTORAGE) ---
    const defaultMenu = [
        { id: "m1", categoria: "Antipasti", piatto: "Tagliere di Salumi Locali", prezzo: 10.00 },
        { id: "m2", categoria: "Primi Piatti", piatto: "Tonnarelli Cacio e Pepe", prezzo: 12.00 },
        { id: "m3", categoria: "Primi Piatti", piatto: "Rigatoni all'Anatra", prezzo: 14.00 },
        { id: "m4", categoria: "Secondi Piatti", piatto: "Filetto di Manzo ai Funghi", prezzo: 18.00 },
        { id: "m5", categoria: "Dolci & Bevande", piatto: "Tiramisù della Casa", prezzo: 5.00 }
    ];

    const defaultFeedback = [
        { id: "f1", nome: "Luca M.", voto: 5, commento: "Cacio e pepe stratosferica! Servizio rapido ed efficiente." },
        { id: "f2", nome: "Elena R.", voto: 4, commento: "Ottima atmosfera, torneremo sicuramente." }
    ];

    // Carica da localStorage o imposta defaults vuoti/precompilati
    let db = {
        prenotazioni: JSON.parse(localStorage.getItem("db_prenotazioni")) || [],
        menu: JSON.parse(localStorage.getItem("db_menu")) || defaultMenu,
        ordini: JSON.parse(localStorage.getItem("db_ordini")) || [],
        feedback: JSON.parse(localStorage.getItem("db_feedback")) || defaultFeedback
    };

    // Funzione interna di sincronizzazione automatica persistente
    function saveAndRefresh(databaseObject, entityKey) {
        localStorage.setItem(`db_${entityKey}`, JSON.stringify(databaseObject[entityKey]));
        renderAllViews(databaseObject);
    }

    // --- GESTIONE INTERATTIVA DELLE SELEZIONI GRAFICHE TAVOLI ---
    function setupVisualGridSelector(gridId, hiddenInputId) {
        const grid = document.getElementById(gridId);
        const input = document.getElementById(hiddenInputId);
        if (!grid || !input) return;

        grid.querySelectorAll(".table-block").forEach(block => {
            block.addEventListener("click", () => {
                // Se il tavolo è disabilitato (occupato), interrompe l'azione di selezione
                if (block.classList.contains("disabled")) return;

                grid.querySelectorAll(".table-block").forEach(b => b.classList.remove("selected"));
                block.classList.add("selected");
                input.value = block.getAttribute("data-table");
            });
        });
    }

    // FUNZIONE DI AGGIORNAMENTO TAVOLI DISPONIBILI (Riconosce i tavoli occupati nel DB e li blocca ai clienti)
    function aggiornaTavoliDisponibili() {
        const tavoliOccupati = db.prenotazioni.map(p => parseInt(p.tavolo));
        const griglieCliente = ["client-booking-grid", "client-order-grid"];
        
        griglieCliente.forEach(gridId => {
            const grid = document.getElementById(gridId);
            if (!grid) return;
            
            grid.querySelectorAll(".table-block").forEach(block => {
                const numeroTavolo = parseInt(block.getAttribute("data-table"));
                
                if (tavoliOccupati.includes(numeroTavolo)) {
                    block.classList.add("disabled");
                    block.classList.remove("selected");
                    block.style.backgroundColor = "#e74c3c";
                    block.style.color = "white";
                    block.style.cursor = "not-allowed";
                    block.style.opacity = "0.6";
                    block.innerText = `Tav. ${numeroTavolo} (Occupato)`;
                } else {
                    block.classList.remove("disabled");
                    block.style.backgroundColor = "";
                    block.style.color = "";
                    block.style.cursor = "";
                    block.style.opacity = "";
                    block.innerText = `Tavolo ${numeroTavolo}`;
                }
            });
        });
    }

    function syncVisualSelection(gridId, tableNumber) {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        grid.querySelectorAll(".table-block").forEach(block => {
            if (block.getAttribute("data-table") == tableNumber) {
                block.classList.add("selected");
            } else {
                block.classList.remove("selected");
            }
        });
    }

    function clearVisualSelection(gridId) {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        grid.querySelectorAll(".table-block").forEach(block => block.classList.remove("selected"));
    }

    // Inizializzazione listener per le quattro griglie grafiche indipendenti (Inclusa la nuova per ordini)
    setupVisualGridSelector("client-booking-grid", "cp-tavolo");
    setupVisualGridSelector("client-order-grid", "co-tavolo");
    setupVisualGridSelector("admin-booking-grid", "ap-tavolo");
    setupVisualGridSelector("admin-order-grid", "ao-tavolo");


    // --- LOGICA FLUSSI LATO CLIENTE ---

    // 1. Invio Prenotazione dal Cliente
    const formClientP = document.getElementById("form-cliente-prenotazione");
    formClientP.addEventListener("submit", (e) => {
        e.preventDefault();
        const tVal = document.getElementById("cp-tavolo").value;
        if (!tVal) {
            alert("Scegli un tavolo cliccando sulla mappa grafica prima di inviare.");
            return;
        }

        const nuovaP = {
            id: "p_" + Date.now(),
            nome: document.getElementById("cp-nome").value.trim(),
            tavolo: parseInt(tVal),
            coperti: parseInt(document.getElementById("cp-coperti").value),
            data: document.getElementById("cp-data").value
        };

        db.prenotazioni.push(nuovaP);
        saveAndRefresh(db, "prenotazioni");
        formClientP.reset();
        clearVisualSelection("client-booking-grid");
        alert("Prenotazione registrata con successo! Ti aspettiamo nel locale.");
    });

    // 2. Ordinazione Piatti Menu e Carrello Locale dal Cliente
    const btnAddCart = document.getElementById("btn-add-to-cart");
    const txtDettagliOrdine = document.getElementById("co-dettagli");
    const selectPiatti = document.getElementById("co-piatto-select");
    const formClientO = document.getElementById("form-cliente-ordine");
    let carrelloCorrente = [];

    if (btnAddCart && selectPiatti && txtDettagliOrdine) {
        btnAddCart.addEventListener("click", () => {
            const piattoSelezionato = selectPiatti.value;
            if(!piattoSelezionato) return;
            
            carrelloCorrente.push(piattoSelezionato);
            
            const conteggio = {};
            carrelloCorrente.forEach(p => conteggio[p] = (conteggio[p] || 0) + 1);
            
            txtDettagliOrdine.value = Object.entries(conteggio)
                .map(([piatto, qta]) => `${qta}x ${piatto}`)
                .join(", ");
        });
    }

    if (formClientO) {
        formClientO.addEventListener("submit", (e) => {
            e.preventDefault();
            const tVal = document.getElementById("co-tavolo").value;
            if (!tVal) {
                alert("Seleziona il tuo numero di tavolo sulla mappa prima di ordinare.");
                return;
            }
            if (carrelloCorrente.length === 0) {
                alert("Il carrello è vuoto! Aggiungi almeno un piatto dal menu.");
                return;
            }

            const nuovoOrdine = {
                id: "o_" + Date.now(),
                tavolo: parseInt(tVal),
                dettagli: txtDettagliOrdine.value,
                stato: "In Attesa"
            };

            db.ordini.push(nuovoOrdine);
            saveAndRefresh(db, "ordini");
            
            formClientO.reset();
            carrelloCorrente = [];
            txtDettagliOrdine.value = "";
            clearVisualSelection("client-order-grid");
            alert("Ordine inviato con successo! I nostri chef si sono messi al lavoro.");
        });
    }

    // 3. Invio Recensione dal Cliente
    const formClientF = document.getElementById("form-cliente-feedback");
    formClientF.addEventListener("submit", (e) => {
        e.preventDefault();
        const nuovoF = {
            id: "f_" + Date.now(),
            nome: document.getElementById("cf-nome").value.trim(),
            voto: parseInt(document.getElementById("cf-voto").value),
            commento: document.getElementById("cf-commento").value.trim()
        };

        db.feedback.push(nuovoF);
        saveAndRefresh(db, "feedback");
        formClientF.reset();
        alert("Grazie per la tua recensione!");
    });


    // --- CONTROLLER AMMINISTRATORE CENTRALIZZATO (GESTORI EVENTI E MODIFICHE AZIONI) ---

    // Autenticazione pannello
    const formLogin = document.getElementById("form-login-admin");
    formLogin.addEventListener("submit", (e) => {
        e.preventDefault();
        const u = document.getElementById("login-user").value;
        const p = document.getElementById("login-pass").value;

        if (u === "admin" && p === "admin123") {
            sessionStorage.setItem("admin_logged", "true");
            document.getElementById("nav-cliente").classList.add("hidden");
            document.getElementById("nav-admin").classList.remove("hidden");
            formLogin.reset();
            switchView("view-admin-prenotazioni");
        } else {
            alert("Credenziali errate. Riprovare.");
        }
    });

    // Pulsante Logout
    document.getElementById("btn-logout").addEventListener("click", () => {
        sessionStorage.removeItem("admin_logged");
        document.getElementById("nav-admin").classList.add("hidden");
        document.getElementById("nav-cliente").classList.remove("hidden");
        switchView("view-prenota");
    });

    // Form Admin: Aggiungi Prenotazione
    const formAdminP = document.getElementById("form-admin-prenotazione");
    formAdminP.addEventListener("submit", (e) => {
        e.preventDefault();
        const tVal = document.getElementById("ap-tavolo").value;
        if(!tVal) { alert("Seleziona un tavolo prima del salvataggio."); return; }

        db.prenotazioni.push({
            id: "p_" + Date.now(),
            nome: document.getElementById("ap-nome").value.trim(),
            tavolo: parseInt(tVal),
            coperti: parseInt(document.getElementById("ap-coperti").value),
            data: document.getElementById("ap-data").value
        });
        saveAndRefresh(db, "prenotazioni");
        formAdminP.reset();
        clearVisualSelection("admin-booking-grid");
    });

    // Form Admin: Aggiungi Voce Menu
    const formAdminM = document.getElementById("form-admin-menu");
    formAdminM.addEventListener("submit", (e) => {
        e.preventDefault();
        db.menu.push({
            id: "m_" + Date.now(),
            categoria: document.getElementById("am-categoria").value,
            piatto: document.getElementById("am-piatto").value.trim(),
            prezzo: parseFloat(document.getElementById("am-prezzo").value)
        });
        saveAndRefresh(db, "menu");
        formAdminM.reset();
    });

    // Form Admin: Aggiungi Ordine Cucina
    const formAdminO = document.getElementById("form-admin-ordine");
    formAdminO.addEventListener("submit", (e) => {
        e.preventDefault();
        const tVal = document.getElementById("ao-tavolo").value;
        if(!tVal) { alert("Seleziona un tavolo prima di inserire la comanda."); return; }

        db.ordini.push({
            id: "o_" + Date.now(),
            tavolo: parseInt(tVal),
            dettagli: document.getElementById("ao-dettagli").value.trim(),
            stato: "In Attesa"
        });
        saveAndRefresh(db, "ordini");
        formAdminO.reset();
        clearVisualSelection("admin-order-grid");
    });

    // GESTORE CENTRALIZZATO DELLE AZIONI IN TABELLA (Invocate tramite onclick inline nella View)
    window.handleAction = function(entity, mode, targetId) {
        if (entity === "prenotazioni" && mode === "delete") {
            db.prenotazioni = db.prenotazioni.filter(i => i.id !== targetId);
            saveAndRefresh(db, "prenotazioni");
        }
        else if (entity === "menu" && mode === "delete") {
            db.menu = db.menu.filter(i => i.id !== targetId);
            saveAndRefresh(db, "menu");
        }
        else if (entity === "feedback" && mode === "delete") {
            db.feedback = db.feedback.filter(i => i.id !== targetId);
            saveAndRefresh(db, "feedback");
        }
        else if (entity === "ordini") {
            if (mode === "delete") {
                db.ordini = db.ordini.filter(i => i.id !== targetId);
                saveAndRefresh(db, "ordini");
            } else if (mode === "edit") {
                db.ordini = db.ordini.map(i => {
                    if (i.id === targetId) {
                        if (i.stato === "In Attesa") i.stato = "In Preparazione";
                        else if (i.stato === "In Preparazione") i.stato = "Completato";
                        else i.stato = "In Attesa";
                    }
                    return i;
                });
                saveAndRefresh(db, "ordini");
            }
        }
    };

    // Esponi esternamente ad aggiornaTavoliDisponibili per il render
    window.eseguiAggiornamentoTavoli = aggiornaTavoliDisponibili;

    // --- INIZIALIZZAZIONE PRIMO AVVIO ED ESECUZIONE RENDERIZZATORI ---
    renderAllViews(db);
}

/* ==========================================================================
   FUNZIONI DI RENDERING SPECIALIZZATE (VIEW COMPONENT SYSTEM)
   ========================================================================== */
function renderAllViews(db) {
    // Viste Cliente
    renderClientMenuTable(db.menu);
    renderClientFeedbackTable(db.feedback);
    renderClientOrderElements(db.menu);
    
    if (window.eseguiAggiornamentoTavoli) {
        window.eseguiAggiornamentoTavoli();
    }

    // Viste Amministratore
    renderAdminPrenotazioniTable(db.prenotazioni);
    renderAdminMenuTable(db.menu);
    renderAdminOrdiniTable(db.ordini);
    renderAdminFeedbackTable(db.feedback);
}

function renderClientMenuTable(data) {
    const tbody = document.querySelector("#client-table-menu tbody");
    if(!tbody) return; tbody.innerHTML = "";
    data.forEach(i => {
        tbody.innerHTML += `
            <tr>
                <td><span class="badge badge-neutral">${i.categoria}</span></td>
                <td><strong>${i.piatto}</strong></td>
                <td>${i.prezzo.toFixed(2)} €</td>
            </tr>`;
    });
}

function renderClientOrderElements(menuData) {
    const select = document.getElementById("co-piatto-select");
    const tbody = document.querySelector("#client-order-table-menu tbody");
    
    if (select) {
        select.innerHTML = menuData.map(i => `<option value="${i.piatto}">${i.piatto} (${i.prezzo.toFixed(2)} €)</option>`).join("");
    }
    
    if (tbody) {
        tbody.innerHTML = "";
        menuData.forEach(i => {
            tbody.innerHTML += `<tr><td><strong>${i.piatto}</strong></td><td>${i.prezzo.toFixed(2)} €</td></tr>`;
        });
    }
}

function renderClientFeedbackTable(data) {
    const tbody = document.querySelector("#client-table-feedback tbody");
    if(!tbody) return; tbody.innerHTML = "";
    data.forEach(i => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${i.nome}</strong></td>
                <td>${"⭐".repeat(i.voto)}</td>
                <td>"${i.commento}"</td>
            </tr>`;
    });
}

function renderAdminPrenotazioniTable(data) {
    const tbody = document.querySelector("#admin-table-prenotazioni tbody");
    if(!tbody) return; tbody.innerHTML = "";
    data.forEach(i => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${i.nome}</strong></td>
                <td>Tavolo ${i.tavolo}</td>
                <td>${i.coperti} Persone</td>
                <td>${i.data.replace("T", " ore ")}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="handleAction('prenotazioni', 'delete', '${i.id}')">Rimuovi</button>
                </td>
            </tr>`;
    });
}

function renderAdminMenuTable(data) {
    const tbody = document.querySelector("#admin-table-menu tbody");
    if(!tbody) return; tbody.innerHTML = "";
    data.forEach(i => {
        tbody.innerHTML += `
            <tr>
                <td><span class="badge badge-neutral">${i.categoria}</span></td>
                <td><strong>${i.piatto}</strong></td>
                <td>${i.prezzo.toFixed(2)} €</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="handleAction('menu', 'delete', '${i.id}')">Elimina</button>
                </td>
            </tr>`;
    });
}

function renderAdminOrdiniTable(data) {
    const tbody = document.querySelector("#admin-table-ordini tbody");
    if(!tbody) return; tbody.innerHTML = "";
    data.forEach(i => {
        let bc = "badge-waiting";
        if(i.stato === "In Preparazione") bc = "badge-progress";
        if(i.stato === "Completato") bc = "badge-completed";
        tbody.innerHTML += `
            <tr>
                <td><strong>Tavolo ${i.tavolo}</strong></td>
                <td>${i.dettagli}</td>
                <td><span class="badge ${bc}">${i.stato}</span></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="handleAction('ordini', 'edit', '${i.id}')">Stato</button>
                    <button class="btn btn-danger btn-sm" onclick="handleAction('ordini', 'delete', '${i.id}')">Elimina</button>
                </td>
            </tr>`;
    });
}

function renderAdminFeedbackTable(data) {
    const tbody = document.querySelector("#admin-table-feedback tbody");
    if(!tbody) return; tbody.innerHTML = "";
    data.forEach(i => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${i.nome}</strong></td>
                <td>${"⭐".repeat(i.voto)}</td>
                <td>"${i.commento}"</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="handleAction('feedback', 'delete', '${i.id}')">Elimina</button>
                </td>
            </tr>`;
    });
}