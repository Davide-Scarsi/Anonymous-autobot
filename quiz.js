// ─────────────────────────────────────────────
//  MODULO QUIZ — AUTO-SOLVE VIA UI
//  Trova le risposte corrette dai dati wpProQuiz,
//  clicca le radio giuste e completa il quiz
//  tramite il JS nativo (gestisce nonces/payload)
// ─────────────────────────────────────────────
(function () {
    var E = window.__ETASS;
    var chatBot     = E.chatBot;
    var _setTimeout = E._setTimeout;

    function isAutoQuiz() { return E.autoQuiz; }

    function sleep(ms) {
        return new Promise(function (r) { _setTimeout(r, ms); });
    }

    // ── Trova la domanda attualmente visibile ──
    function getVisibleQuestion() {
        return Array.from(document.querySelectorAll('.wpProQuiz_listItem')).find(function (el) {
            return window.getComputedStyle(el).display !== 'none';
        });
    }

    // ── Cerca i dati del quiz (risposte corrette) ──
    function findQuizData() {
        var result = null;

        // ── METODO 1: jQuery data — wpProQuiz salva i dati parsati sull'elemento DOM ──
        try {
            var quizEl = document.querySelector('[id^="wpProQuiz_"]');
            if (quizEl && window.jQuery) {
                var jqData = jQuery(quizEl).data();
                console.log('[Quiz][findData] jQuery data keys:', Object.keys(jqData));
                // wpProQuizFront salva l'istanza come data('wpProQuizFront')
                var inst = jqData.wpProQuizFront || jqData.quizData || jqData.wpProQuiz;
                if (inst) {
                    // L'istanza ha _quizData o _questionJson o config.json
                    var qd = inst._quizData || inst.questionJson || inst._questionJson;
                    if (qd) { console.log('[Quiz][findData] Trovato via jQuery data (istanza):', qd.length); result = qd; }
                    if (!result && inst.config && inst.config.json) {
                        try { result = JSON.parse(inst.config.json); console.log('[Quiz][findData] Trovato via inst.config.json'); } catch(e){}
                    }
                }
                // Prova anche jqData direttamente
                if (!result && jqData.json) {
                    try { result = JSON.parse(jqData.json); console.log('[Quiz][findData] Trovato via jqData.json'); } catch(e){}
                }
            }
        } catch(e) { console.warn('[Quiz][findData] Errore metodo jQuery:', e); }

        // ── METODO 2: Cerca wpProQuizInitList (array globale usato da LearnDash) ──
        if (!result) {
            try {
                var initList = window.wpProQuizInitList;
                if (initList && Array.isArray(initList)) {
                    for (var il = 0; il < initList.length; il++) {
                        var entry = initList[il];
                        if (entry.json) {
                            result = typeof entry.json === 'string' ? JSON.parse(entry.json) : entry.json;
                            console.log('[Quiz][findData] Trovato via wpProQuizInitList');
                            break;
                        }
                    }
                }
            } catch(e) {}
        }

        // ── METODO 3: Cerca il campo "json" nel call a wpProQuizFront negli script inline ──
        if (!result) {
            var scripts = Array.from(document.querySelectorAll('script:not([src])'));
            for (var i = 0; i < scripts.length; i++) {
                var text = scripts[i].textContent;
                if (text.indexOf('wpProQuizFront') === -1 && text.indexOf('json') === -1) continue;

                // Cerca il valore di "json": "..." (stringa JSON escapata dentro un oggetto JS)
                var jsonMatch = text.match(/"json"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                if (jsonMatch) {
                    try {
                        // Il valore è double-escaped: deunescape
                        var raw = jsonMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                        result = JSON.parse(raw);
                        console.log('[Quiz][findData] Trovato via regex "json": in script inline, domande:', result.length);
                        break;
                    } catch(e) { console.warn('[Quiz][findData] Parse "json" fallito:', e.message); }
                }

                // Cerca anche json: '[...]' (con apici singoli)
                if (!result) {
                    jsonMatch = text.match(/json\s*:\s*'((?:[^'\\]|\\.)*)'/);
                    if (jsonMatch) {
                        try {
                            result = JSON.parse(jsonMatch[1].replace(/\\'/g, "'"));
                            console.log('[Quiz][findData] Trovato via regex json (apici singoli)');
                            break;
                        } catch(e) {}
                    }
                }
            }
        }

        // ── METODO 4: Variabili globali con struttura quiz ──
        if (!result) {
            var globals = Object.keys(window);
            for (var g = 0; g < globals.length; g++) {
                var key = globals[g];
                try {
                    var val = window[key];
                    if (Array.isArray(val) && val.length > 0 && val[0] && val[0].answer) {
                        result = val;
                        console.log('[Quiz][findData] Trovato via variabile globale:', key);
                        break;
                    }
                } catch(e) {}
            }
        }

        // ── DUMP DIAGNOSTICO se non trovato ──
        if (!result) {
            console.log('[Quiz][findData] ═══ DUMP DIAGNOSTICO ═══');
            try {
                var quizEl2 = document.querySelector('[id^="wpProQuiz_"]');
                console.log('[Quiz][findData] Quiz element:', quizEl2 ? quizEl2.id : 'NON TROVATO');
                if (quizEl2 && window.jQuery) {
                    var d = jQuery(quizEl2).data();
                    console.log('[Quiz][findData] jQuery data:', JSON.stringify(Object.keys(d)));
                    Object.keys(d).forEach(function(k) {
                        try { console.log('[Quiz][findData]   ' + k + ':', typeof d[k], JSON.stringify(d[k]).substring(0, 300)); } catch(e) { console.log('[Quiz][findData]   ' + k + ':', typeof d[k], '[non serializzabile]'); }
                    });
                }
            } catch(e) {}

            // Cerca script con "wpProQuiz" o "json"
            var scripts2 = Array.from(document.querySelectorAll('script:not([src])'));
            scripts2.forEach(function(s, idx) {
                var t = s.textContent;
                if (t.indexOf('wpProQuiz') > -1 || (t.indexOf('"json"') > -1 && t.indexOf('answer') > -1)) {
                    console.log('[Quiz][findData] Script #' + idx + ' (rilevante):', t.substring(0, 500));
                }
            });

            // Variabili globali con "quiz" nel nome
            Object.keys(window).forEach(function(k) {
                if (k.toLowerCase().indexOf('quiz') > -1) {
                    try { console.log('[Quiz][findData] window.' + k + ':', typeof window[k], JSON.stringify(window[k]).substring(0, 200)); } catch(e) {}
                }
            });
        }

        return result;
    }

    // ── Trova l'indice della risposta corretta per una domanda dal quiz data ──
    function findCorrectIndex(questionData) {
        if (!questionData || !questionData.answer) return -1;
        var answers = questionData.answer;
        for (var i = 0; i < answers.length; i++) {
            // wpProQuiz usa "correct" boolean o "points" > 0 per la risposta giusta
            if (answers[i].correct === true || answers[i].correct === 1 ||
                answers[i].correct === '1' || answers[i].correct === 'true') {
                return i;
            }
        }
        // Fallback: la risposta con più punti
        var maxPts = -1, maxIdx = 0;
        for (var j = 0; j < answers.length; j++) {
            var pts = parseInt(answers[j].points) || 0;
            if (pts > maxPts) { maxPts = pts; maxIdx = j; }
        }
        return maxPts > 0 ? maxIdx : -1;
    }

    // ── AUTO-SOLVE: risponde a tutte le domande e completa ──
    async function autoSolveQuiz() {
      try {
        console.log('[Quiz] autoSolveQuiz() avviato');

        // Trova dati quiz
        var quizData = findQuizData();
        console.log('[Quiz] Quiz data trovati:', quizData ? quizData.length + ' domande' : 'NESSUNO');

        var allItems = Array.from(document.querySelectorAll('.wpProQuiz_listItem'));
        var nQuestions = allItems.length;
        if (!nQuestions) {
            chatBot.addMessage('❌ Nessuna domanda trovata nel DOM.', 0);
            return;
        }

        chatBot.addMessage('🧠 Trovate <b>' + nQuestions + '</b> domande — risolvo automaticamente...', 0);

        // Per ogni domanda: seleziona risposta corretta, attendi, vai avanti
        for (var q = 0; q < nQuestions; q++) {
            // Aspetta che la domanda corrente sia visibile
            var visible = null;
            for (var wait = 0; wait < 50; wait++) {
                visible = getVisibleQuestion();
                if (visible) break;
                await sleep(200);
            }
            if (!visible) {
                console.warn('[Quiz] Domanda', q + 1, 'non visibile dopo attesa');
                break;
            }

            // Leggi testo domanda
            var qTextEl = visible.querySelector('.wpProQuiz_question_text');
            var qText = qTextEl ? qTextEl.innerText.trim() : '(domanda ' + (q + 1) + ')';
            console.log('[Quiz] Domanda', q + 1, ':', qText.substring(0, 80));

            // Trova le radio/checkbox
            var answerLabels = Array.from(visible.querySelectorAll('.wpProQuiz_questionListItem'));
            var radios = Array.from(visible.querySelectorAll('.wpProQuiz_questionListItem input[type="radio"], .wpProQuiz_questionListItem input[type="checkbox"]'));

            // Trova la risposta corretta
            var correctIdx = -1;

            // Metodo 1: dal quiz data JSON (se trovato)
            if (quizData && quizData[q]) {
                correctIdx = findCorrectIndex(quizData[q]);
                console.log('[Quiz]   -> dal quizData: indice', correctIdx);
            }

            // Metodo 2: cerca data-correct o data-pos sugli elementi
            if (correctIdx < 0) {
                answerLabels.forEach(function (lbl, idx) {
                    if (lbl.dataset.correct === '1' || lbl.dataset.correct === 'true') correctIdx = idx;
                });
            }

            // Metodo 3: cerca attributo sortString "1" (wpProQuiz sort order hack)
            if (correctIdx < 0) {
                answerLabels.forEach(function (lbl, idx) {
                    var sortEl = lbl.querySelector('[data-sort]');
                    if (sortEl && sortEl.dataset.sort === '1') correctIdx = idx;
                });
            }

            // Fallback: se non trovo la risposta corretta, seleziono la prima
            if (correctIdx < 0) {
                correctIdx = 0;
                console.log('[Quiz]   -> risposta corretta non trovata, uso indice 0 (fallback)');
            }

            // Clicca la radio/checkbox corretta
            if (correctIdx < radios.length) {
                radios[correctIdx].click();
                var ansText = answerLabels[correctIdx] ? answerLabels[correctIdx].innerText.trim().substring(0, 60) : '?';
                console.log('[Quiz]   -> selezionato:', String.fromCharCode(65 + correctIdx), '-', ansText);
                chatBot.addMessage('✅ <b>D' + (q + 1) + ':</b> ' + String.fromCharCode(65 + correctIdx) + ') ' + ansText, 0);
            }

            // Attendi un po' (simula lettura umana: 3-6 secondi)
            var humanDelay = 3000 + Math.random() * 3000;
            await sleep(humanDelay);

            // Clicca "Successivo" o "Completa quiz"
            var nextBtn = visible.querySelector('input[name="next"]');
            if (!nextBtn) nextBtn = document.querySelector('.wpProQuiz_button[name="next"]');
            var completeBtn = document.querySelector('input[name="wpProQuiz_completed_quiz"]');

            if (q < nQuestions - 1 && nextBtn) {
                nextBtn.click();
                console.log('[Quiz]   -> cliccato Successivo');
                await sleep(500);
            } else if (completeBtn) {
                // Ultima domanda o bottone completa già visibile
                console.log('[Quiz]   -> è l\'ultima domanda, cerco bottone Completa');
            }
        }

        // Clicca "Completa quiz"
        await sleep(1000);
        var completeBtn = document.querySelector('input[name="wpProQuiz_completed_quiz"]');
        if (!completeBtn) completeBtn = document.querySelector('.wpProQuiz_QuestionButton[name="wpProQuiz_completed_quiz"]');
        if (!completeBtn) completeBtn = document.querySelector('.wpProQuiz_button2[name="next"]');
        // Cerca anche un qualsiasi bottone di completamento
        if (!completeBtn) {
            var allBtns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"], button'));
            completeBtn = allBtns.find(function (b) {
                var t = (b.value || b.textContent || '').toLowerCase();
                return t.indexOf('complet') > -1 || t.indexOf('finish') > -1 || t.indexOf('invia') > -1;
            });
        }

        if (completeBtn) {
            completeBtn.click();
            console.log('[Quiz] ✅ Cliccato bottone Completa Quiz');
            chatBot.addMessage('🎉 <b>Quiz completato!</b> Il sistema sta elaborando i risultati...', 0);
        } else {
            console.warn('[Quiz] Bottone "Completa" non trovato');
            chatBot.addMessage('⚠️ Quiz risolto ma non trovo il bottone "Completa". Cliccalo manualmente.', 0);
        }

      } catch (err) {
          console.error('[Quiz] autoSolveQuiz() ERRORE:', err);
          chatBot.addMessage('❌ Errore: ' + err.message, 0);
      }
    }

    // Esponi per uso manuale
    E.bypassQuiz = autoSolveQuiz;

    // ── START / STOP ──────────────────────────────────────
    var waitingForQuiz = false;

    function startBot() {
        if (getVisibleQuestion()) {
            if (isAutoQuiz()) {
                console.log('[Quiz] Domanda visibile e autoQuiz attivo — avvio...');
                autoSolveQuiz();
            }
            return;
        }

        if (waitingForQuiz) return;
        waitingForQuiz = true;

        var startBtn = document.querySelector('input[name="startQuiz"]');
        if (startBtn) {
            console.log('[Quiz] Premo "Inizia Quiz" automaticamente...');
            chatBot.addMessage('▶️ Avvio quiz automaticamente...', 0);
            setTimeout(function () { startBtn.click(); }, 500);
        }

        var startPoll = setInterval(function () {
            if (getVisibleQuestion()) {
                clearInterval(startPoll);
                waitingForQuiz = false;
                if (isAutoQuiz()) {
                    console.log('[Quiz] Prima domanda visibile — avvio auto-solve...');
                    setTimeout(autoSolveQuiz, 500);
                }
            }
        }, 200);
    }

    function stopBot() {
        waitingForQuiz = false;
        console.log('[Quiz] Bot fermato.');
    }

    E.modules.quiz = { start: startBot, stop: stopBot };

    if (E.botEnabled) {
        startBot();
    } else {
        console.log('[Quiz] Automazione disabilitata (bot disattivo).');
    }

})();
