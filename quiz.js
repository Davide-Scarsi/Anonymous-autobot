// ─────────────────────────────────────────────
//  MODULO QUIZ — AI SOLVER (Pollinations)
//  Legge domanda + opzioni dal DOM, chiede all'AI,
//  clicca la risposta corretta automaticamente.
//  Chiave API da localStorage('etass-pollinations-key')
// ─────────────────────────────────────────────
(function () {
    var E = window.__ETASS;
    var chatBot     = E.chatBot;
    var _setTimeout = E._setTimeout;

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

    // ── Chiedi all'AI via Pollinations ──
    async function askAI(questionText, options, attempt) {
        attempt = attempt || 1;
        var MAX_RETRIES = 3;

        var apiKey = localStorage.getItem('etass-pollinations-key') || '';

        var optionsText = options.map(function (o, i) {
            return String.fromCharCode(65 + i) + ') ' + o;
        }).join('\n');

        var prompt =
            'Sei un esperto formatore italiano. ' +
            'Prima scrivi SOLO la lettera della risposta corretta (A, B, C o D) seguita da un punto e a capo. ' +
            'Poi spiega brevemente in italiano perché è corretta (max 2 frasi).\n\n' +
            'Domanda: ' + questionText + '\n' + optionsText;

        // Pollinations Text API — POST con JSON body
        var url = 'https://text.pollinations.ai/';
        var body = {
            messages: [
                { role: 'user', content: prompt }
            ],
            model: 'openai',
            seed: 42 + attempt
        };

        // Se c'è una chiave API, aggiungila al body
        if (apiKey) {
            body.token = apiKey;
        }

        try {
            var res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            var text = await res.text();
            var trimmed = text.trim();
            var letter = trimmed.charAt(0).toUpperCase();
            if ('ABCD'.indexOf(letter) === -1) {
                throw new Error('Lettera non valida: ' + letter);
            }
            var explanation = trimmed.substring(trimmed.indexOf('\n') + 1).trim();
            return { letter: letter, explanation: explanation };
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

    // ── Risolvi la domanda corrente ──
    async function solveCurrentQuestion() {
        var visibleItem = getVisibleQuestion();
        if (!visibleItem) {
            console.warn('[Quiz] Nessuna domanda visibile');
            return;
        }

        var qTextEl = visibleItem.querySelector('.wpProQuiz_question_text');
        var questionText = qTextEl ? qTextEl.innerText.trim() : '';
        if (!questionText) return;

        var optionLabels = Array.from(visibleItem.querySelectorAll('.wpProQuiz_questionListItem label'));
        var optionTexts = optionLabels.map(function (l) {
            var clone = l.cloneNode(true);
            var statusEls = clone.querySelectorAll('.ld-quiz-question-item__status');
            statusEls.forEach(function (el) { el.remove(); });
            return clone.innerText.trim();
        });

        console.log('[Quiz] Domanda:', questionText.substring(0, 80));

        var answered = false;
        chatBot.addMessage('🤔 Sto ragionando sulla risposta...', 200, function () {
            if (!answered) chatBot.addTyping();
        });

        var result;
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

        var index = result.letter.charCodeAt(0) - 65;
        if (index >= 0 && index < optionLabels.length) {
            var radio = optionLabels[index].querySelector('input[type="radio"]');
            if (radio) {
                radio.click();
                console.log('[Quiz] ✅ Selezionato:', optionTexts[index]);
                chatBot.addMessage('✅ <b>' + result.letter + ') ' + optionTexts[index] + '</b>', 300);

                if (isAutoQuiz()) {
                    chatBot.addMessage('💡 ' + (result.explanation || 'Nessuna spiegazione disponibile.') + '<br><br><i>Premo "Successivo" automaticamente...</i>', 900);
                } else {
                    chatBot.addMessage('💡 ' + (result.explanation || 'Nessuna spiegazione disponibile.') + '<br><br><i>Clicca su "Successivo" per continuare.</i>', 900);
                }
            }
        } else {
            console.warn('[Quiz] Lettera non valida:', result.letter);
        }
    }

    // ── Risolvi tutte le domande in sequenza ──
    async function autoSolveAll() {
        if (!botRunning) return;
        console.log('[Quiz] Avvio risoluzione domanda corrente...');
        await new Promise(function (r) { setTimeout(r, 600); });

        var visibleItem = getVisibleQuestion();
        if (!visibleItem) {
            console.log('[Quiz] Nessuna domanda visibile.');
            return;
        }

        await solveCurrentQuestion();

        // Aspetta che la domanda cambi, poi risolvi la prossima
        var pollInterval = trackInterval(setInterval(function () {
            if (!botRunning) { untrackInterval(pollInterval); return; }
            var newVisible = getVisibleQuestion();
            if (newVisible && newVisible !== visibleItem) {
                untrackInterval(pollInterval);
                console.log('[Quiz] Nuova domanda rilevata — risolvo...');
                setTimeout(autoSolveAll, 600);
            }
        }, 300));
    }

    // ── START / STOP ──────────────────────────────────────
    function startBot() {
        botRunning = true;

        if (getVisibleQuestion()) {
            console.log('[Quiz] Domanda già visibile — avvio immediato...');
            autoSolveAll();
        } else {
            var startBtn = document.querySelector('input[name="startQuiz"]');
            if (startBtn) {
                console.log('[Quiz] Bottone "Inizia Quiz" trovato — clicco...');
                chatBot.addMessage('▶️ Avvio quiz automaticamente...', 0);
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
        clearAllTracked();
        console.log('[Quiz] Bot fermato — tutti gli intervalli cancellati.');
    }

    E.modules.quiz = { start: startBot, stop: stopBot };

    if (E.botEnabled) {
        startBot();
    } else {
        console.log('[Quiz] Automazione disabilitata (bot disattivo).');
    }

    // ── Polling auto-quiz: se attivo e c'è "Successivo" con risposta selezionata, clicca ──
    var autoQuizClicking = false;
    var autoQuizSelectedAt = null;
    var autoQuizLastVisible = null;
    setInterval(function () {
        if (!isAutoQuiz()) return;
        if (autoQuizClicking) return;
        var visible = getVisibleQuestion();
        if (!visible) return;

        var hasSelection = visible.querySelector('.wpProQuiz_questionListItem input[type="radio"]:checked');
        if (!hasSelection) {
            autoQuizSelectedAt = null;
            autoQuizLastVisible = null;
            return;
        }

        if (visible !== autoQuizLastVisible) {
            autoQuizLastVisible = visible;
            autoQuizSelectedAt = Date.now();
            return;
        }

        // Attendi 3 secondi dalla selezione prima di premere
        if (Date.now() - autoQuizSelectedAt < 3000) return;

        var nextBtn = visible.querySelector('input[name="next"]');
        if (!nextBtn) nextBtn = document.querySelector('.wpProQuiz_button[name="next"]');
        if (nextBtn && nextBtn.offsetParent !== null) {
            autoQuizClicking = true;
            autoQuizSelectedAt = null;
            autoQuizLastVisible = null;
            nextBtn.click();
            console.log('[Quiz] ▶️ Auto-quiz: premuto "Successivo"');

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
