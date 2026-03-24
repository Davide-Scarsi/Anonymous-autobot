// ─────────────────────────────────────────────
//  MODULO QUIZ
//  Legge da window.__ETASS (chatBot, botEnabled, ecc.)
//  Espone start/stop su E.modules.quiz
// ─────────────────────────────────────────────
(function () {
    var E = window.__ETASS;
    var chatBot             = E.chatBot;
    var _setTimeout         = E._setTimeout;

    function isAutoQuiz() { return E.autoQuiz; }

    // ── State tracking per toggle live ──
    var activeIntervals = [];
    var botRunning = false;

    function trackInterval(id) { activeIntervals.push(id); return id; }
    function untrackInterval(id) {
        clearInterval(id);
        activeIntervals = activeIntervals.filter(function (x) { return x !== id; });
    }
    function clearAllTracked() {
        activeIntervals.forEach(function (id) { clearInterval(id); });
        activeIntervals = [];
    }

    function getVisibleQuestion() {
        return Array.from(document.querySelectorAll('.wpProQuiz_listItem')).find(function (el) {
            return window.getComputedStyle(el).display !== 'none';
        });
    }

    async function askAI(questionText, options, attempt) {
        attempt = attempt || 1;
        var MAX_RETRIES = 3;

        const optionsText = options.map(function (o, i) {
            return String.fromCharCode(65 + i) + ') ' + o;
        }).join('\n');

        const prompt =
            'Sei un esperto formatore italiano. ' +
            'Prima scrivi SOLO la lettera della risposta corretta (A, B, C o D) seguita da un punto e a capo. ' +
            'Poi spiega brevemente in italiano perché è corretta (max 2 frasi).\n\n' +
            'Domanda: ' + questionText + '\n' + optionsText;

        try {
            const res = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'openai',
                    seed: 42 + attempt,
                    private: true
                })
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const text = await res.text();
            const trimmed = text.trim();
            const letter = trimmed.charAt(0).toUpperCase();
            if (!'ABCD'.includes(letter)) {
                throw new Error('Lettera non valida: ' + letter);
            }
            const explanation = trimmed.substring(trimmed.indexOf('\n') + 1).trim();
            return { letter, explanation };
        } catch (e) {
            console.warn('[Quiz] Tentativo ' + attempt + ' fallito:', e.message);
            if (attempt < MAX_RETRIES) {
                chatBot.addMessage('⚠️ Errore di rete, riprovo... (' + attempt + '/' + MAX_RETRIES + ')', 0);
                await new Promise(function (r) { _setTimeout(r, 1500); });
                return askAI(questionText, options, attempt + 1);
            }
            throw e;
        }
    }

    async function solveCurrentQuestion() {
        const visibleItem = getVisibleQuestion();

        if (!visibleItem) {
            console.warn('[Quiz] Nessuna domanda visibile');
            return;
        }

        const questionText = visibleItem.querySelector('.wpProQuiz_question_text')?.innerText?.trim();
        if (!questionText) return;

        const optionLabels = Array.from(visibleItem.querySelectorAll('.wpProQuiz_questionListItem label'));
        const optionTexts = optionLabels.map(function (l) {
            const clone = l.cloneNode(true);
            clone.querySelectorAll('.ld-quiz-question-item__status').forEach(function (el) { el.remove(); });
            return clone.innerText.trim();
        });

        console.log('[Quiz] Domanda:', questionText);

        var answered = false;
        chatBot.addMessage('Stiamo ragionando su come rispondere al quiz...', 200, function () {
            if (!answered) chatBot.addTyping();
        });

        let result;
        try {
            result = await askAI(questionText, optionTexts);
            answered = true;
            chatBot.removeTyping();
            console.log('[Quiz] Risposta AI:', result.letter);
        } catch (e) {
            console.warn('[Quiz] Errore AI:', e);
            answered = true;
            chatBot.removeTyping();
            chatBot.addMessage('⚠️ Errore AI: ' + e.message + '. Riprovo alla prossima domanda.', 0);
            return;
        }

        const index = result.letter.charCodeAt(0) - 65;
        if (index >= 0 && index < optionLabels.length) {
            const radio = optionLabels[index].querySelector('input[type="radio"]');
            if (radio) {
                radio.click();
                console.log('[Quiz] ✅ Selezionato:', optionTexts[index]);
                chatBot.addMessage('✅ <b>' + result.letter + ') ' + optionTexts[index] + '</b>', 300);

                if (isAutoQuiz()) {
                    chatBot.addMessage('💡 ' + (result.explanation || 'Nessuna spiegazione disponibile.') + '<br><br><i>Premo "Successivo" automaticamente...</i>', 900);
                    // Il click su "Successivo" è gestito dal polling in fondo al modulo
                } else {
                    chatBot.addMessage('💡 ' + (result.explanation || 'Nessuna spiegazione disponibile.') + '<br><br><i>Clicca su "Successivo" per continuare.</i>', 900);
                }
            }
        } else {
            console.warn('[Quiz] Lettera non valida:', result.letter);
        }
    }

    async function autoSolveAll() {
        if (!botRunning) return;
        console.log('[Quiz] Avvio risoluzione domanda corrente...');
        await new Promise(function (r) { setTimeout(r, 600); });

        const visibleItem = getVisibleQuestion();

        if (!visibleItem) {
            console.log('[Quiz] Nessuna domanda visibile.');
            return;
        }

        await solveCurrentQuestion();

        var pollInterval = trackInterval(setInterval(function () {
            if (!botRunning) { untrackInterval(pollInterval); return; }
            var newVisible = getVisibleQuestion();
            if (newVisible && newVisible !== visibleItem) {
                untrackInterval(pollInterval);
                console.log('[Quiz] Nuova domanda rilevata — risolvo...');
                setTimeout(autoSolveAll, 600);
            }
        }, 300));

        console.log('[Quiz] In attesa che tu vada alla prossima domanda...');
    }

    // ── START / STOP per toggle live ──────────────────────
    function startBot() {
        botRunning = true;
        E.AUTO_PRESS_START_BTN = true;

        if (getVisibleQuestion()) {
            console.log('[Quiz] Domanda già visibile — avvio immediato...');
            autoSolveAll();
        } else {
            const startBtn = document.querySelector('input[name="startQuiz"]');
            if (startBtn) {
                console.log('[Quiz] Bottone "Inizio Quiz" trovato — clicco automaticamente...');
                setTimeout(function () { startBtn.click(); }, 500);
            }

            var startPoll = trackInterval(setInterval(function () {
                if (!botRunning) { untrackInterval(startPoll); return; }
                if (getVisibleQuestion()) {
                    untrackInterval(startPoll);
                    console.log('[Quiz] Prima domanda rilevata — avvio...');
                    setTimeout(autoSolveAll, 500);
                }
            }, 200));
        }
    }

    function stopBot() {
        botRunning = false;
        E.AUTO_PRESS_START_BTN = false;
        clearAllTracked();
        console.log('[Quiz] Bot fermato — tutti gli intervalli cancellati.');
    }

    // ── Registra modulo per toggle live ──
    E.modules.quiz = { start: startBot, stop: stopBot };

    // Avvio iniziale
    if (E.botEnabled) {
        startBot();
    } else {
        console.log('[Quiz] Automazione disabilitata (bot disattivo).');
    }

    // ── Polling auto-quiz: se attivo e c'è un "Successivo" con risposta selezionata, clicca ──
    var autoQuizClicking = false;
    var autoQuizSelectedAt = null;
    var autoQuizLastVisible = null;
    setInterval(function () {
        if (!isAutoQuiz()) return;
        if (autoQuizClicking) return;
        var visible = getVisibleQuestion();
        if (!visible) return;
        // Controlla che ci sia almeno una risposta selezionata
        var hasSelection = visible.querySelector('.wpProQuiz_questionListItem input[type="radio"]:checked');
        if (!hasSelection) {
            // Reset se la domanda cambia o non c'è selezione
            autoQuizSelectedAt = null;
            autoQuizLastVisible = null;
            return;
        }
        // Se è una nuova domanda, registra il momento della selezione
        if (visible !== autoQuizLastVisible) {
            autoQuizLastVisible = visible;
            autoQuizSelectedAt = Date.now();
            return;
        }
        // Attendi 3 secondi dalla selezione prima di premere
        if (Date.now() - autoQuizSelectedAt < 3000) return;
        // Cerca il bottone "Successivo"
        var nextBtn = visible.querySelector('input[name="next"]');
        if (!nextBtn) nextBtn = document.querySelector('.wpProQuiz_button[name="next"]');
        if (nextBtn && nextBtn.offsetParent !== null) {
            autoQuizClicking = true;
            autoQuizSelectedAt = null;
            autoQuizLastVisible = null;
            nextBtn.click();
            console.log('[Quiz] ▶️ Auto-quiz: premuto "Successivo"');
            // Sblocca solo dopo che la domanda è cambiata (max 5s)
            var releaseAfter = Date.now() + 5000;
            var releaseCheck = setInterval(function () {
                var newVisible = getVisibleQuestion();
                if (newVisible !== visible || Date.now() > releaseAfter) {
                    clearInterval(releaseCheck);
                    autoQuizClicking = false;
                }
            }, 200);
        }
    }, 500);

})();
