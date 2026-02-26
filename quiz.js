// ─────────────────────────────────────────────
//  MODULO QUIZ
//  Legge da window.__ETASS (chatBot, botEnabled, ecc.)
// ─────────────────────────────────────────────
(function () {
    var E = window.__ETASS;
    var botEnabled          = E.botEnabled;
    var AUTO_PRESS_START_BTN = E.AUTO_PRESS_START_BTN;
    var chatBot             = E.chatBot;
    var _setTimeout         = E._setTimeout;

    function isAutoQuiz() { return E.autoQuiz; }

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

        const url = 'https://text.pollinations.ai/' + encodeURIComponent(prompt) + '?model=openai&seed=' + (42 + attempt);

        try {
            const res = await fetch(url);
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
                    // Cerca e clicca il bottone "Successivo" dopo un breve delay
                    setTimeout(function () {
                        var nextBtn = visibleItem.querySelector('input[name="next"], input.wpProQuiz_button[name="next"]');
                        if (!nextBtn) {
                            // Fallback: cerca qualsiasi bottone "Successivo" visibile nel quiz
                            nextBtn = document.querySelector('.wpProQuiz_button[name="next"]');
                        }
                        if (nextBtn) {
                            nextBtn.click();
                            console.log('[Quiz] ▶️ Premuto "Successivo" automaticamente');
                        } else {
                            console.warn('[Quiz] Bottone "Successivo" non trovato');
                            chatBot.addMessage('⚠️ Bottone "Successivo" non trovato — premi manualmente.', 0);
                        }
                    }, 1500);
                } else {
                    chatBot.addMessage('💡 ' + (result.explanation || 'Nessuna spiegazione disponibile.') + '<br><br><i>Clicca su "Successivo" per continuare.</i>', 900);
                }
            }
        } else {
            console.warn('[Quiz] Lettera non valida:', result.letter);
        }
    }

    async function autoSolveAll() {
        console.log('[Quiz] Avvio risoluzione domanda corrente...');
        await new Promise(function (r) { setTimeout(r, 600); });

        const visibleItem = getVisibleQuestion();

        if (!visibleItem) {
            console.log('[Quiz] Nessuna domanda visibile.');
            return;
        }

        await solveCurrentQuestion();

        var pollInterval = setInterval(function () {
            var newVisible = getVisibleQuestion();
            if (newVisible && newVisible !== visibleItem) {
                clearInterval(pollInterval);
                console.log('[Quiz] Nuova domanda rilevata — risolvo...');
                setTimeout(autoSolveAll, 600);
            }
        }, 300);

        console.log('[Quiz] In attesa che tu vada alla prossima domanda...');
    }

    // Se il quiz è già attivo (domanda già visibile)
    if (AUTO_PRESS_START_BTN && getVisibleQuestion()) {
        console.log('[Quiz] Domanda già visibile — avvio immediato...');
        autoSolveAll();
    } else if (!AUTO_PRESS_START_BTN) {
        console.log('[Quiz] Automazione disabilitata (AUTO_PRESS_START_BTN = false).');
    } else {
        const startBtn = document.querySelector('input[name="startQuiz"]');
        if (startBtn) {
            if (AUTO_PRESS_START_BTN) {
                console.log('[Quiz] Bottone "Inizio Quiz" trovato — clicco automaticamente...');
                setTimeout(function () { startBtn.click(); }, 500);
            } else {
                console.log('[Quiz] Bottone "Inizio Quiz" trovato — pressione automatica disabilitata.');
            }
        } else {
            console.log('[Quiz] Bottone "Inizio Quiz" non trovato...');
        }

        var startPoll = setInterval(function () {
            if (getVisibleQuestion()) {
                clearInterval(startPoll);
                if (AUTO_PRESS_START_BTN) {
                    console.log('[Quiz] Prima domanda rilevata — avvio...');
                    setTimeout(autoSolveAll, 500);
                } else {
                    console.log('[Quiz] Prima domanda rilevata — automazione disabilitata.');
                }
            }
        }, 200);
    }

    // ── Polling auto-quiz: se attivo e c'è un "Successivo" con risposta selezionata, clicca ──
    setInterval(function () {
        if (!isAutoQuiz()) return;
        var visible = getVisibleQuestion();
        if (!visible) return;
        // Controlla che ci sia almeno una risposta selezionata
        var hasSelection = visible.querySelector('.wpProQuiz_questionListItem input[type="radio"]:checked');
        if (!hasSelection) return;
        // Cerca il bottone "Successivo"
        var nextBtn = visible.querySelector('input[name="next"]');
        if (!nextBtn) nextBtn = document.querySelector('.wpProQuiz_button[name="next"]');
        if (nextBtn && nextBtn.offsetParent !== null) {
            nextBtn.click();
            console.log('[Quiz] ▶️ Auto-quiz: premuto "Successivo"');
        }
    }, 1500);

})();
