(function () {

    // ─────────────────────────────────────────────
    //  CONFIGURAZIONE E NAMESPACE CONDIVISO
    // ─────────────────────────────────────────────
    var BRANCH = window.__ETASS_BRANCH || 'main';
    var BASE   = 'https://raw.githubusercontent.com/Davide-Scarsi/Anonymous-autobot/' + BRANCH + '/';

    window.__ETASS = {
        botEnabled:         sessionStorage.getItem('etass-bot-enabled') === 'true',
        _setInterval:       window.setInterval.bind(window),
        _clearInterval:     window.clearInterval.bind(window),
        _setTimeout:        window.setTimeout.bind(window),
        hasVideo:           !!document.querySelector('iframe[src*="vimeo"], iframe[data-vimeo-id], iframe[src*="player.vimeo"]'),
        hasQuiz:            !!document.querySelector('.wpProQuiz_list, #wpProQuiz_604, [id^="wpProQuiz_"]'),
        AVATAR:             BASE + 'img/Avatar.png',
        ANON:               BASE + 'img/Anonymous.png',
        BASE:               BASE,
        autoQuiz:           sessionStorage.getItem('etass-auto-quiz') === 'true',
        chatBot:            null
    };

    window.__ETASS.AUTO_PRESS_START_BTN = window.__ETASS.botEnabled;
    window.__ETASS.AUTO_SKIP_VIDEO      = window.__ETASS.botEnabled;

    // Se il bot è disabilitato, forza anche autoQuiz a false
    if (!window.__ETASS.botEnabled) {
        window.__ETASS.autoQuiz = false;
        sessionStorage.setItem('etass-auto-quiz', 'false');
    }

    console.log('[Etass] Video:', window.__ETASS.hasVideo, '| Quiz:', window.__ETASS.hasQuiz);

    // ─────────────────────────────────────────────
    //  LOADER MODULI
    // ─────────────────────────────────────────────
    function loadModule(name) {
        return fetch(BASE + name + '?t=' + Date.now())
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status + ' — ' + name);
                return r.text();
            })
            .then(function (code) { (0, eval)(code); });
    }

    // Carica prima la UI chatbot, poi (in parallelo) i moduli funzionali
    loadModule('chatbot.js')
        .then(function () {
            var tasks = [];
            if (window.__ETASS.hasVideo) tasks.push(loadModule('video.js'));
            if (window.__ETASS.hasQuiz)  tasks.push(loadModule('quiz.js'));
            return Promise.all(tasks);
        })
        .catch(function (e) { console.error('[Etass] Errore caricamento modulo:', e); });

})();
