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

    // ── Cerca i dati del quiz (risposte corrette) negli script inline ──
    function findQuizData() {
        // wpProQuiz inietta i dati come JSON in un tag <script>
        // Cerchiamo strutture con "answer" e "correct" o "points"
        var scripts = Array.from(document.querySelectorAll('script:not([src])'));
        for (var i = 0; i < scripts.length; i++) {
            var text = scripts[i].textContent;

            // Pattern 1: LearnDash/wpProQuiz inietta un array JSON con dati domande
            // Cerca variabili come: var defined_xxx = [{...}]
            var match = text.match(/var\s+\w+\s*=\s*(\[\s*\{[\s\S]*?"answer"[\s\S]*?\}\s*\])\s*;/);
            if (match) {
                try { return JSON.parse(match[1]); } catch (e) { console.warn('[Quiz] Parse fallito per pattern 1:', e); }
            }

            // Pattern 2: Cerca JSON array con campi "points" in ogni answer
            match = text.match(/(\[\s*\{[^;]*"points"\s*:[^;]*"answer"[^;]*\}\s*\])/);
            if (match) {
                try { return JSON.parse(match[1]); } catch (e) {}
            }

            // Pattern 3: wpProQuizFront data injection
            match = text.match(/wpProQuizFront\s*\(\s*\d+\s*,\s*(\{[\s\S]*?\})\s*\)/);
            if (match) {
                try {
                    var cfg = JSON.parse(match[1]);
                    if (cfg.json) return JSON.parse(cfg.json);
                    if (cfg.questionData) return cfg.questionData;
                } catch (e) {}
            }
        }

        // Cerca anche nelle variabili globali
        var globals = Object.keys(window);
        for (var g = 0; g < globals.length; g++) {
            var key = globals[g];
            if (key.indexOf('defined_') === 0 || key.indexOf('quizData') === 0) {
                var val = window[key];
                if (Array.isArray(val) && val.length && val[0].answer) return val;
            }
        }

        return null;
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
