// ─────────────────────────────────────────────
//  MODULO QUIZ — AI SOLVER (GitHub Models)
//  Legge domanda + opzioni dal DOM, chiede all'AI,
//  clicca la risposta corretta automaticamente.
//  Chiave: GitHub PAT da localStorage('etass-github-token')
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

        var apiKey = localStorage.getItem('etass-github-token') || '';

        if (!apiKey) {
            throw new Error('NO_KEY');
        }

        var optionsText = options.map(function (o, i) {
            return String.fromCharCode(65 + i) + ') ' + o;
        }).join('\n');

        var prompt =
            'Sei un esperto formatore italiano. ' +
            'Prima scrivi SOLO la lettera della risposta corretta (A, B, C o D) seguita da un punto e a capo. ' +
            'Poi spiega brevemente in italiano perché è corretta (max 2 frasi).\n\n' +
            'Domanda: ' + questionText + '\n' + optionsText;

        // GitHub Models API (compatibile OpenAI)
        var url = 'https://models.inference.ai.azure.com/chat/completions';
        var body = {
            model: 'gpt-4o-mini',
            messages: [
                { role: 'user', content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.3
        };

        try {
            var res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify(body)
            });
            if (res.status === 401) throw new Error('INVALID_KEY');
            if (res.status === 429) throw new Error('RATE_LIMIT');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            var json = await res.json();
            var text = json.choices[0].message.content.trim();
            var letter = text.charAt(0).toUpperCase();
            if ('ABCD'.indexOf(letter) === -1) {
                throw new Error('Lettera non valida: ' + letter);
            }
            var explanation = text.substring(text.indexOf('\n') + 1).trim();
            return { letter: letter, explanation: explanation };
        } catch (e) {
            console.warn('[Quiz] Tentativo ' + attempt + ' fallito:', e.message);
            if (e.message === 'NO_KEY' || e.message === 'INVALID_KEY' || e.message === 'RATE_LIMIT') throw e;
            if (attempt < MAX_RETRIES) {
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

        // Controlla chiave PRIMA di mostrare il messaggio "sto ragionando"
        var apiKey = localStorage.getItem('etass-github-token') || '';
        if (!apiKey) {
            chatBot.addMessage('🔑 <b>Token GitHub mancante!</b> Apri le impostazioni (⚙️) e inserisci il tuo GitHub PAT.<br><a href="https://github.com/settings/tokens" target="_blank" style="color:#1a73e8;">👉 Genera il tuo token qui</a>', 0);
            return;
        }

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
            if (e.message === 'INVALID_KEY') {
                chatBot.addMessage('🔑 <b>Token non valido!</b> Controlla il token nelle impostazioni (⚙️) oppure <a href="https://github.com/settings/tokens" target="_blank" style="color:#1a73e8;">genera un nuovo PAT</a>.', 0);
            } else if (e.message === 'RATE_LIMIT') {
                chatBot.addMessage('⏳ <b>Troppe richieste!</b> Hai superato il limite di GitHub Models. Attendo e riprovo automaticamente...', 0);
            } else {
                chatBot.addMessage('⚠️ Errore AI: ' + e.message, 0);
            }
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

    // ── Rate-limit: timestamp ultima richiesta API ──
    var lastApiCallTime = 0;
    var API_DELAY_MS = 7000; // 7s → max ~8.5 RPM, dentro il limite di 10 RPM (GitHub Models free)

    function waitForRateLimit() {
        var elapsed = Date.now() - lastApiCallTime;
        var waitMs = API_DELAY_MS - elapsed;
        if (waitMs <= 0) return Promise.resolve();
        var secs = Math.ceil(waitMs / 1000);
        chatBot.addMessage('⏳ Attendo <b>' + secs + 's</b> per rispettare il rate-limit...', 0);
        console.log('[Quiz] Rate-limit: attendo ' + secs + 's...');
        return new Promise(function (r) { _setTimeout(r, waitMs); });
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

        // Attendi rate-limit prima di chiamare l'AI
        await waitForRateLimit();
        lastApiCallTime = Date.now();

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
