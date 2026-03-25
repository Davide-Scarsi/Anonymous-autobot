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

        var apiKey = localStorage.getItem('etass-groq-key');
        if (!apiKey) {
            throw new Error('Nessuna Groq API key — aprire le impostazioni (⚙️) e inserire la chiave da console.groq.com');
        }

        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 200,
                    temperature: 0.1
                })
            });
            if (res.status === 401) throw new Error('API key non valida — aggiornala nelle impostazioni ⚙️');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const json = await res.json();
            var raw = (json.choices && json.choices[0] && json.choices[0].message)
                ? json.choices[0].message.content.trim()
                : '';
            if (!raw) throw new Error('Risposta vuota');
            const letter = raw.charAt(0).toUpperCase();
            if (!'ABCD'.includes(letter)) throw new Error('Lettera non valida: ' + letter);
            const explanation = raw.substring(raw.indexOf('\n') + 1).trim();
            return { letter, explanation };
        } catch (e) {
            console.warn('[Quiz] Tentativo ' + attempt + ' fallito:', e.message);
            // Non riprovare se è un errore di autenticazione
            if (e.message.includes('API key') || e.message.includes('Nessuna Groq')) throw e;
            if (attempt < MAX_RETRIES) {
                chatBot.addMessage('⚠️ Riprovo... (' + attempt + '/' + MAX_RETRIES + ')', 0);
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

    // ── BYPASS DIRETTO VIA AJAX ────────────────────────────────
    async function bypassQuiz() {
        // 1. Leggi i parametri dal DOM / wpProQuiz config
        var quizEl    = document.querySelector('[id^="wpProQuiz_"]');
        var formEl    = document.querySelector('form#wp_pro_quiz_form, form[data-quiz-id], .wpProQuiz');
        var nonceEl   = document.querySelector('input[name="quiz_nonce"], input[name="_wpnonce"]');
        var quizIdEl  = document.querySelector('input[name="quizId"]');
        var courseIdEl= document.querySelector('input[name="course_id"]');

        // Fallback: cerca nei wpProQuizFront o variabili globali iniettate da WP
        var globalCfg = window.wpProQuizFront || window.wpProQuiz || null;
        var quizId   = quizIdEl   ? quizIdEl.value   : (globalCfg && globalCfg.quizId)   || (quizEl && quizEl.id.replace('wpProQuiz_',''));
        var courseId = courseIdEl ? courseIdEl.value  : (globalCfg && globalCfg.course_id) || document.querySelector('[data-course-id]')?.dataset.courseId || '';
        var nonce    = nonceEl    ? nonceEl.value     : (globalCfg && globalCfg.quiz_nonce) || '';

        if (!quizId) {
            chatBot.addMessage('❌ Impossibile trovare quizId nella pagina.', 0);
            return;
        }
        if (!nonce) {
            chatBot.addMessage('❌ Nonce non trovato — ricarica la pagina e riprova.', 0);
            return;
        }

        // 2. Raccoglie tutti i questionId dal DOM (.wpProQuiz_listItem [data-question-pro-id])
        var allItems = Array.from(document.querySelectorAll('.wpProQuiz_listItem'));
        if (!allItems.length) {
            chatBot.addMessage('❌ Nessuna domanda trovata nel DOM.', 0);
            return;
        }

        var results = {};
        var reviewBox = [];
        allItems.forEach(function (item, idx) {
            var qId = item.dataset.questionProId || item.querySelector('[data-question-pro-id]')?.dataset.questionProId;
            if (!qId) {
                // prova attributo id="wpProQuiz_questionListItem_N"
                var inputs = item.querySelectorAll('input[type="radio"]');
                if (inputs.length) qId = inputs[0].name.replace('question_', '');
            }
            if (!qId) { reviewBox.push({ solved: true }); return; }
            // Marca la prima opzione come corretta (il server verifica — ma salva lo stato)
            var optCount = item.querySelectorAll('.wpProQuiz_questionListItem').length || 4;
            var value = {};
            for (var i = 0; i < optCount; i++) value[i] = i === 0;
            results[qId] = { index: idx, value: value, type: 'single', lockQuestion: false };
            reviewBox.push({ solved: true });
        });

        var payload = new URLSearchParams({
            action:       'wp_pro_quiz_cookie_save_quiz',
            course_id:    courseId,
            quiz:         quizId,
            quizId:       quizId,
            quiz_started: Date.now(),
            results:      JSON.stringify(results),
            quiz_nonce:   nonce,
            reviewBox:    JSON.stringify(reviewBox)
        });

        chatBot.addMessage('⏳ Invio bypass quiz...', 0);
        console.log('[Quiz] Bypass payload:', Object.fromEntries(payload));

        try {
            var res = await fetch('/wp-admin/admin-ajax.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
                body: payload.toString(),
                credentials: 'include'
            });
            var json = await res.json();
            console.log('[Quiz] Bypass risposta:', json);
            if (json.success) {
                chatBot.addMessage('✅ <b>Bypass inviato!</b> Stato quiz salvato — puoi procedere alla schermata finale.', 0);
            } else {
                chatBot.addMessage('⚠️ Il server ha risposto ma con success=false. Controlla la console.', 0);
            }
        } catch (e) {
            chatBot.addMessage('❌ Errore nella chiamata: ' + e.message, 0);
        }
    }

    // Esponi bypassQuiz globalmente per uso manuale dalla console
    E.bypassQuiz = bypassQuiz;

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
