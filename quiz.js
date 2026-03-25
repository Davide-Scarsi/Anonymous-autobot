// ─────────────────────────────────────────────
//  MODULO QUIZ
//  Legge da window.__ETASS (chatBot, botEnabled, ecc.)
//  Espone start/stop su E.modules.quiz
// ─────────────────────────────────────────────
(function () {
    var E = window.__ETASS;
    var chatBot     = E.chatBot;
    var _setTimeout = E._setTimeout;

    function isAutoQuiz() { return E.autoQuiz; }

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

        // Ricerca nonce allargata: input, variabili globali, script inline
        var nonce = '';
        if (nonceEl) {
            nonce = nonceEl.value;
        } else if (globalCfg && (globalCfg.quiz_nonce || globalCfg.nonce)) {
            nonce = globalCfg.quiz_nonce || globalCfg.nonce;
        } else {
            // Prova altri input con nome "nonce"
            var nonceAlt = document.querySelector('input[name="nonce"]');
            if (nonceAlt) nonce = nonceAlt.value;
        }
        if (!nonce) {
            // Cerca nei global come ldVars, learndash o sfwd
            var ldCfg = window.ldVars || window.sfwd_data || window.learndash_settings || null;
            if (ldCfg) nonce = ldCfg.quiz_nonce || ldCfg.nonce || ldCfg.ajaxNonce || '';
        }
        if (!nonce) {
            // Ultimo resort: cerca "quiz_nonce" o "nonce" negli script inline della pagina
            var scripts = Array.from(document.querySelectorAll('script:not([src])'));
            for (var s = 0; s < scripts.length; s++) {
                var m = scripts[s].textContent.match(/"(?:quiz_nonce|nonce)"\s*:\s*"([^"]+)"/);
                if (m) { nonce = m[1]; break; }
            }
        }

        console.log('[Quiz] quizId:', quizId, '| courseId:', courseId, '| nonce:', nonce);

        if (!quizId) {
            chatBot.addMessage('❌ Impossibile trovare quizId nella pagina.', 0);
            return;
        }

        // DEBUG: dump tutti i posti dove abbiamo cercato
        if (!nonce) {
            console.log('[Quiz][DEBUG] ─── NONCE DUMP ───');
            console.log('[Quiz][DEBUG] input nonce/wpnonce:', nonceEl);
            console.log('[Quiz][DEBUG] input[name="nonce"]:', document.querySelector('input[name="nonce"]'));
            console.log('[Quiz][DEBUG] Tutti gli input hidden:', Array.from(document.querySelectorAll('input[type="hidden"]')).map(function(el){ return el.name + '=' + el.value; }));
            console.log('[Quiz][DEBUG] wpProQuizFront:', window.wpProQuizFront);
            console.log('[Quiz][DEBUG] wpProQuiz:', window.wpProQuiz);
            console.log('[Quiz][DEBUG] ldVars:', window.ldVars);
            console.log('[Quiz][DEBUG] sfwd_data:', window.sfwd_data);
            console.log('[Quiz][DEBUG] learndash_settings:', window.learndash_settings);
            // Cerca qualsiasi variabile globale con "nonce" nel nome
            var nonceGlobals = Object.keys(window).filter(function(k){ try { return typeof window[k] === 'object' && window[k] !== null && JSON.stringify(window[k]).indexOf('nonce') > -1; } catch(e){ return false; } });
            console.log('[Quiz][DEBUG] Variabili globali con "nonce":', nonceGlobals);
            nonceGlobals.forEach(function(k){ try { console.log('[Quiz][DEBUG]  ->', k, '=', JSON.stringify(window[k]).substring(0, 500)); } catch(e){} });
            chatBot.addMessage('❌ Nonce non trovato — apri la console (F12) e cerca "[Quiz][DEBUG]" per i dettagli.', 0);
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

        // Stima il tempo reale già trascorso (quiz_started è iniettato da WP nel DOM)
        var realStarted = null;
        var startedEl = document.querySelector('input[name="quiz_started"]');
        if (startedEl) realStarted = parseInt(startedEl.value);
        if (!realStarted) {
            // Cerca nei dati JS di wpProQuiz
            var cfg = window.wpProQuizFront || window.wpProQuiz;
            if (cfg && cfg.quiz_started) realStarted = parseInt(cfg.quiz_started);
        }
        var elapsedMs = realStarted ? (Date.now() - realStarted) : 0;

        // Stima ~45-90 sec a domanda + spread casuale per sembrare umano
        var nQuestions = allItems.length || 5;
        var minMs  = nQuestions * 45000;
        var maxMs  = nQuestions * 90000;
        var targetMs = minMs + Math.random() * (maxMs - minMs);
        // Se l'utente ha già aspettato abbastanza, attendi solo il residuo (min 3s)
        var waitMs = Math.max(3000, targetMs - elapsedMs);
        var waitSec = Math.round(waitMs / 1000);

        chatBot.addMessage('⏳ Simulazione tempo risposta (' + waitSec + 's)...', 0);
        await new Promise(function (r) { _setTimeout(r, waitMs); });

        var fakeStarted = realStarted || (Date.now() - Math.round(targetMs));

        var payload = new URLSearchParams({
            action:       'wp_pro_quiz_cookie_save_quiz',
            course_id:    courseId,
            quiz:         quizId,
            quizId:       quizId,
            quiz_started: fakeStarted,
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
    var waitingForQuiz = false;

    // Cerca la prima domanda VISIBILE (display !== 'none')
    function getVisibleQuestion() {
        return Array.from(document.querySelectorAll('.wpProQuiz_listItem')).find(function (el) {
            return window.getComputedStyle(el).display !== 'none';
        });
    }

    function startBot() {
        // Se c'è già una domanda visibile, il quiz è già partito
        if (getVisibleQuestion()) {
            if (isAutoQuiz()) {
                console.log('[Quiz] Domanda visibile e autoQuiz attivo — avvio bypass...');
                bypassQuiz();
            } else {
                console.log('[Quiz] Domanda visibile ma autoQuiz disattivato.');
            }
            return;
        }

        if (waitingForQuiz) return;
        waitingForQuiz = true;

        // Premi sempre il bottone "Inizia Quiz" (il quiz non è ancora partito)
        var startBtn = document.querySelector('input[name="startQuiz"]');
        if (startBtn) {
            console.log('[Quiz] Premo "Inizia Quiz" automaticamente...');
            chatBot.addMessage('▶️ Avvio quiz automaticamente...', 0);
            setTimeout(function () { startBtn.click(); }, 500);
        } else {
            console.log('[Quiz] Bottone "Inizia Quiz" non trovato — in attesa...');
        }

        // Aspetta che appaia la prima domanda VISIBILE
        var startPoll = setInterval(function () {
            if (getVisibleQuestion()) {
                clearInterval(startPoll);
                waitingForQuiz = false;
                if (isAutoQuiz()) {
                    console.log('[Quiz] Prima domanda visibile e autoQuiz attivo — avvio bypass...');
                    setTimeout(bypassQuiz, 500);
                } else {
                    console.log('[Quiz] Prima domanda visibile ma autoQuiz disattivato.');
                }
            }
        }, 200);
    }

    function stopBot() {
        waitingForQuiz = false;
        console.log('[Quiz] Bot fermato.');
    }

    // ── Registra modulo per toggle live ──
    E.modules.quiz = { start: startBot, stop: stopBot };

    // Avvio iniziale
    if (E.botEnabled) {
        startBot();
    } else {
        console.log('[Quiz] Automazione disabilitata (bot disattivo).');
    }

})();
