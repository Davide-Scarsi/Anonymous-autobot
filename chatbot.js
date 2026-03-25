// ─────────────────────────────────────────────
//  MODULO CHATBOT GRAFICO
//  Legge da window.__ETASS — espone chatBot su window.__ETASS.chatBot
// ─────────────────────────────────────────────
(function () {
    var VERSION = 'v1.0.28';
    var E = window.__ETASS;
    var botEnabled     = E.botEnabled;
    var autoQuiz       = E.autoQuiz;
    var branch         = E.BRANCH || 'main';
    var _setInterval   = E._setInterval;
    var _clearInterval = E._clearInterval;
    var _setTimeout    = E._setTimeout;
    var ETASS_AVATAR   = E.AVATAR;

    function createChatBot() {
        var style = document.createElement('style');
        style.textContent = [
            '#etass-chat{position:fixed;bottom:24px;right:24px;width:320px;background:#f5f7fa;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.22);display:flex;flex-direction:column;font-family:"Segoe UI",Arial,sans-serif;z-index:2147483647;overflow:hidden;transform:translateY(calc(100% + 32px));opacity:0;max-height:700px;transition:transform .5s cubic-bezier(.22,1,.36,1),opacity .5s,width .3s cubic-bezier(.22,1,.36,1),border-radius .3s cubic-bezier(.22,1,.36,1),max-height .45s cubic-bezier(.22,1,.36,1);}',
            '#etass-chat.etass-visible{transform:translateY(0);opacity:1;}',
            /* Stato minimizzato: cerchio */
            '#etass-chat.etass-minimized{width:68px;max-height:68px;border-radius:50%;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.28);overflow:visible;background:#fff;}',
            /* Fase 1 apertura: larghezza espansa, border-radius già corretti, altezza ancora compressa */
            '#etass-chat.etass-pre-expand{width:320px;max-height:68px;border-radius:16px;cursor:default;pointer-events:none;}',
            /* Fase 1 chiusura: comprimi altezza prima di restringersi in cerchio */
            '#etass-chat.etass-collapsing{max-height:68px!important;transition:max-height .35s cubic-bezier(.22,1,.36,1)!important;}',
            '#etass-chat.etass-collapsing #etass-chat-body,#etass-chat.etass-collapsing #etass-chat-footer,#etass-chat.etass-collapsing #etass-settings{display:none!important;}',
            /* Puntino status visibile solo quando minimizzato */
            '#etass-mini-dot{display:none;position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;z-index:1;pointer-events:none;transition:background .3s;}',
            '#etass-chat.etass-minimized #etass-mini-dot{display:block;}',
            '#etass-mini-dot.etass-mini-on{background:#4caf50;box-shadow:0 0 6px #4caf50;}',
            '#etass-mini-dot.etass-mini-off{background:#e53935;box-shadow:0 0 6px #e53935;}',
            '#etass-chat-header{display:flex;align-items:center;gap:10px;padding:13px 16px;background:#fff;border-bottom:1px solid #e0e4ea;cursor:pointer;user-select:none;}',
            '#etass-chat.etass-minimized #etass-chat-header{padding:5px;border-bottom:none;justify-content:center;background:transparent;width:68px;height:68px;box-sizing:border-box;}',
            '#etass-chat.etass-minimized .etass-hinfo,#etass-chat.etass-minimized .etass-dot-online{display:none;}',
            '#etass-chat.etass-minimized #etass-chat-body{display:none;}',
            '#etass-chat-header .etass-header-av{width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #e0e4ea;background:#fff;}',
            '#etass-chat.etass-minimized #etass-chat-header .etass-header-av{width:58px;height:58px;border:3px solid #e0e4ea;background:#fff;}',
            '#etass-chat-header .etass-hinfo{display:flex;flex-direction:column;min-width:0;}',
            '#etass-chat-header .etass-hname{color:#1a1a2e;font-size:13.5px;font-weight:700;letter-spacing:.3px;}',
            '#etass-chat-header .etass-hsub{color:#999;font-size:11px;}',
            '#etass-chat-header .etass-dot-online{margin-left:auto;width:9px;height:9px;flex-shrink:0;background:#4caf50;border-radius:50%;box-shadow:0 0 6px #4caf50;}',
            '#etass-chat-header .etass-dot-online.etass-dot-off{background:#e53935;box-shadow:0 0 6px #e53935;}',
            '#etass-chat-body{overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:10px;max-height:320px;background:#f5f7fa;}',
            '#etass-chat-body::-webkit-scrollbar{width:3px;}',
            '#etass-chat-body::-webkit-scrollbar-thumb{background:#d0d5de;border-radius:2px;}',
            '.etass-msg{display:flex;align-items:flex-end;gap:10px;animation:etass-fi .35s ease;}',
            '@keyframes etass-fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}',
            '.etass-msg-av{width:58px;height:58px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #e0e4ea;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.1);}',
            '.etass-msg-bbl{background:#fff;color:#2c2c3e;padding:10px 14px;border-radius:14px 14px 14px 2px;font-size:12.5px;line-height:1.6;max-width:220px;border:1px solid #e0e4ea;box-shadow:0 1px 4px rgba(0,0,0,.07);word-break:break-word;}',
            '.etass-msg-bbl.etass-scrambling{font-family:monospace;color:#1a9e3f;letter-spacing:.5px;}',
            '.etass-msg-bbl.etass-typing-bbl{display:flex!important;align-items:center!important;justify-content:center;gap:6px;padding:19px 18px!important;min-height:40px!important;box-sizing:border-box;}',
            '.etass-td{width:7px;height:7px;background:#aab0be;border-radius:50%;animation:etass-bounce 1.1s infinite;}',
            '.etass-td:nth-child(2){animation-delay:.18s}',
            '.etass-td:nth-child(3){animation-delay:.36s}',
            '@keyframes etass-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-3px)}}',
            '#etass-chat-footer{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#fff;border-top:1px solid #e0e4ea;}',
            '#etass-version{font-size:10.5px;color:#aab0be;font-family:"Segoe UI",Arial,sans-serif;letter-spacing:.3px;user-select:none;}',
            '#etass-version .etass-dev-tag{color:#e67e22;font-weight:700;margin-left:3px;}',
            '#etass-chat.etass-minimized #etass-chat-footer{display:none;}',
            '#etass-gear-btn{background:none;border:none;cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:background .2s;}',
            '#etass-gear-btn:hover{background:#eef0f5;}',
            '#etass-gear-btn svg{width:20px;height:20px;fill:#888;transition:fill .2s;}',
            '#etass-gear-btn:hover svg{fill:#555;}',
            '#etass-settings{display:none;padding:10px 14px;background:#fff;border-top:1px solid #e0e4ea;flex-direction:column;gap:10px;}',
            '#etass-settings.etass-settings-open{display:flex;}',
            '.etass-settings-row{display:flex;align-items:center;justify-content:space-between;width:100%;}',
            '#etass-settings .etass-opt-label{font-size:12.5px;color:#2c2c3e;font-weight:500;}',
            '.etass-settings-key-row{gap:6px;}',
            '#etass-groq-key{flex:1;font-size:11px;padding:5px 8px;border:1px solid #d0d5de;border-radius:6px;outline:none;min-width:0;}',
            '#etass-groq-save{font-size:11px;padding:5px 10px;background:#4caf50;color:#fff;border:none;border-radius:6px;cursor:pointer;white-space:nowrap;}',
            '#etass-groq-save:hover{background:#388e3c;}',
            '#etass-groq-status{font-size:10.5px;color:#4caf50;min-height:14px;}',
            '#etass-groq-status.etass-key-error{color:#e53935;}',
            '#etass-groq-status.etass-key-ok{color:#4caf50;}',

            '.etass-switch{position:relative;width:40px;height:22px;flex-shrink:0;}',
            '.etass-switch input{opacity:0;width:0;height:0;}',
            '.etass-switch .etass-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#ccd0d9;border-radius:22px;transition:.3s;}',
            '.etass-switch .etass-slider:before{content:"";position:absolute;height:16px;width:16px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.15);}',
            '.etass-switch input:checked+.etass-slider{background:#4caf50;}',
            '.etass-switch input:checked+.etass-slider:before{transform:translateX(18px);}'
        ].join('');
        document.head.appendChild(style);

        var wrap = document.createElement('div');
        wrap.id = 'etass-chat';
        wrap.innerHTML =
            '<div id="etass-chat-header">' +
                '<img class="etass-header-av" src="' + ETASS_AVATAR + '" alt="" />' +
                '<div class="etass-hinfo">' +
                    '<span class="etass-hname">Etass AI</span>' +
                    '<span class="etass-hsub">Assistente automatico</span>' +
                '</div>' +
                '<span class="etass-dot-online' + (botEnabled ? '' : ' etass-dot-off') + '"></span>' +
            '</div>' +
            '<span id="etass-mini-dot" class="' + (botEnabled ? 'etass-mini-on' : 'etass-mini-off') + '"></span>' +
            '<div id="etass-chat-body"></div>' +
            '<div id="etass-settings">' +
                '<div class="etass-settings-row">' +
                    '<span class="etass-opt-label">Abilita bot</span>' +
                    '<label class="etass-switch">' +
                        '<input type="checkbox" id="etass-toggle-bot"' + (botEnabled ? ' checked' : '') + ' />' +
                        '<span class="etass-slider"></span>' +
                    '</label>' +
                '</div>' +
                '<div class="etass-settings-row">' +
                    '<span class="etass-opt-label">Quiz automatico</span>' +
                    '<label class="etass-switch">' +
                        '<input type="checkbox" id="etass-toggle-autoquiz"' + (autoQuiz ? ' checked' : '') + ' />' +
                        '<span class="etass-slider"></span>' +
                    '</label>' +
                '</div>' +
                '<div class="etass-settings-row etass-settings-key-row">' +
                    '<input id="etass-groq-key" type="password" placeholder="GitHub PAT (ghp_...)" autocomplete="off" />' +
                    '<button id="etass-groq-save">Salva</button>' +
                '</div>' +
                '<div id="etass-groq-status"></div>' +
            '</div>' +
            '<div id="etass-chat-footer">' +
                '<span id="etass-version">' + VERSION + (branch === 'dev' ? '<span class="etass-dev-tag">(dev)</span>' : '') + '</span>' +
                '<button id="etass-gear-btn" title="Impostazioni">'   +
                    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>' +
                '</button>' +
            '</div>';
        document.body.appendChild(wrap);

        // Settings panel toggle
        var gearBtn = wrap.querySelector('#etass-gear-btn');
        var settingsPanel = wrap.querySelector('#etass-settings');
        gearBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            settingsPanel.classList.toggle('etass-settings-open');
        });

        // Bot toggle — scrive su sessionStorage e ricarica
        var toggleInput = wrap.querySelector('#etass-toggle-bot');
        var toggleAutoQuiz = wrap.querySelector('#etass-toggle-autoquiz');

        toggleInput.addEventListener('change', function () {
            var enabled = toggleInput.checked;
            sessionStorage.setItem('etass-bot-enabled', enabled ? 'true' : 'false');
            E.botEnabled = enabled;

            // Se disabilito il bot, disabilito anche auto-quiz
            if (!enabled) {
                sessionStorage.setItem('etass-auto-quiz', 'false');
                toggleAutoQuiz.checked = false;
                E.autoQuiz = false;
            }

            // Aggiorna indicatore stato (dot header + dot mini)
            var dot = wrap.querySelector('.etass-dot-online');
            if (dot) {
                if (enabled) dot.classList.remove('etass-dot-off');
                else dot.classList.add('etass-dot-off');
            }
            var miniDot = wrap.querySelector('#etass-mini-dot');
            if (miniDot) {
                miniDot.className = enabled ? 'etass-mini-on' : 'etass-mini-off';
            }

            // Toggle moduli attivi senza reload
            var mods = E.modules || {};
            if (enabled) {
                if (mods.video) mods.video.start();
                if (mods.quiz)  mods.quiz.start();
                chatBot.addMessage('🟢 <b>Bot abilitato</b> — automazione attiva.', 300);
            } else {
                if (mods.video) mods.video.stop();
                if (mods.quiz)  mods.quiz.stop();
                chatBot.addMessage('🔴 <b>Bot disabilitato</b> — automazione fermata.', 300);
            }

            console.log('[Etass] Bot ' + (enabled ? 'ABILITATO' : 'DISABILITATO') + ' (senza reload)');
        });

        toggleAutoQuiz.addEventListener('change', function () {
            sessionStorage.setItem('etass-auto-quiz', toggleAutoQuiz.checked ? 'true' : 'false');
            E.autoQuiz = toggleAutoQuiz.checked;
            console.log('[Etass] Quiz automatico:', toggleAutoQuiz.checked ? 'ATTIVATO' : 'DISATTIVATO');
        });

        // Groq API key
        var groqKeyInput  = wrap.querySelector('#etass-groq-key');
        var groqSaveBtn   = wrap.querySelector('#etass-groq-save');
        var groqStatus    = wrap.querySelector('#etass-groq-status');
        var storedKey = localStorage.getItem('etass-github-token') || '';
        groqKeyInput.value = storedKey ? '●'.repeat(8) : '';
        if (storedKey) {
            groqStatus.textContent = '✓ Chiave salvata';
            groqStatus.className = 'etass-key-ok';
        }
        groqKeyInput.addEventListener('focus', function () {
            if (localStorage.getItem('etass-github-token')) groqKeyInput.value = '';
        });
        groqSaveBtn.addEventListener('click', function () {
            var val = groqKeyInput.value.trim();
            if (!val || val === '●'.repeat(8)) {
                groqStatus.textContent = '⚠️ Inserisci la chiave';
                groqStatus.className = 'etass-key-error';
                return;
            }
            localStorage.setItem('etass-github-token', val);
            groqKeyInput.value = '●'.repeat(8);
            groqStatus.textContent = '✓ Chiave salvata';
            groqStatus.className = 'etass-key-ok';

            // Abilita bot + quiz automaticamente dopo il salvataggio del token
            if (!E.botEnabled) {
                toggleInput.checked = true;
                toggleInput.dispatchEvent(new Event('change'));
            }
            if (!E.autoQuiz) {
                toggleAutoQuiz.checked = true;
                toggleAutoQuiz.dispatchEvent(new Event('change'));
            }
            chatBot.addMessage('🚀 <b>Token salvato!</b> Bot e quiz automatico attivati.', 300);
        });

        // Evita che click sul settings propaghi all'header
        settingsPanel.addEventListener('click', function (e) { e.stopPropagation(); });

        // Toggle minimizza/espandi con animazione fluida a due fasi
        var header = wrap.querySelector('#etass-chat-header');
        var isAnimating = false;
        header.addEventListener('click', function () {
            if (isAnimating) return;
            if (wrap.classList.contains('etass-minimized')) {
                // APERTURA:
                // Fase 1 (0-300ms): larghezza 68→320 + border-radius 50%→16px
                //                   (border-radius già corretto fin dall'inizio!)
                isAnimating = true;
                settingsPanel.classList.remove('etass-settings-open');
                wrap.classList.remove('etass-minimized');
                wrap.classList.add('etass-pre-expand');
                sessionStorage.setItem('etass-chat-open', 'true');
                setTimeout(function () {
                    // Fase 2 (300-750ms): max-height 68→700px — espansione verticale graduale
                    wrap.classList.remove('etass-pre-expand');
                    isAnimating = false;
                }, 300);
            } else {
                // CHIUSURA:
                // Fase 1 (0-350ms): max-height 700→68px — compressione verticale graduale
                isAnimating = true;
                settingsPanel.classList.remove('etass-settings-open');
                wrap.classList.add('etass-collapsing');
                setTimeout(function () {
                    // Fase 2 (350-650ms): larghezza 320→68 + border-radius 16→50%
                    wrap.classList.remove('etass-collapsing');
                    wrap.classList.add('etass-minimized');
                    sessionStorage.setItem('etass-chat-open', 'false');
                    isAnimating = false;
                }, 380);
            }
        });

        var body = wrap.querySelector('#etass-chat-body');
        var typingEl = null;
        var nameEl = wrap.querySelector('.etass-hname');

        var SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&?<>[]{}~';
        var NAME_A = 'Etass AI';
        var NAME_B = 'Anonymous';
        var currentName = NAME_A;

        function scrambleName(fromText, toText, callback) {
            var maxLen = Math.max(fromText.length, toText.length);
            var STEPS = 20;
            var step = 0;
            var intId = _setInterval(function () {
                step++;
                var progress = step / STEPS;
                var revealedCount = Math.floor(toText.length * progress);
                var out = '';
                for (var i = 0; i < maxLen; i++) {
                    if (i < revealedCount) {
                        out += (i < toText.length) ? toText[i] : '';
                    } else if (i < toText.length) {
                        out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                    } else {
                        out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                    }
                }
                nameEl.textContent = out;
                if (step >= STEPS) {
                    _clearInterval(intId);
                    nameEl.textContent = toText;
                    if (callback) callback();
                }
            }, 40);
        }

        function startNameLoop() {
            function cycle() {
                _setTimeout(function () {
                    scrambleName(NAME_A, NAME_B, function () {
                        currentName = NAME_B;
                        _setTimeout(function () {
                            scrambleName(NAME_B, NAME_A, function () {
                                currentName = NAME_A;
                                cycle();
                            });
                        }, 1200);
                    });
                }, 5000);
            }
            cycle();
        }
        startNameLoop();

        return {
            show: function () {
                setTimeout(function () { wrap.classList.add('etass-visible'); }, 120);
            },
            addMessage: function (html, delay, onDone) {
                _setTimeout(function () {
                    var msg = document.createElement('div');
                    msg.className = 'etass-msg';
                    var bbl = document.createElement('div');
                    bbl.className = 'etass-msg-bbl';
                    msg.innerHTML = '<img class="etass-msg-av" src="' + ETASS_AVATAR + '" alt="" />';
                    msg.appendChild(bbl);
                    bbl.innerHTML = html;
                    if (typingEl && typingEl.parentNode) {
                        body.insertBefore(msg, typingEl);
                    } else {
                        body.appendChild(msg);
                    }
                    body.scrollTop = body.scrollHeight;
                    if (onDone) onDone();
                }, delay || 0);
            },
            addTyping: function () {
                typingEl = document.createElement('div');
                typingEl.className = 'etass-msg';
                typingEl.innerHTML =
                    '<img class="etass-msg-av" src="' + ETASS_AVATAR + '" alt="" />' +
                    '<div class="etass-msg-bbl etass-typing-bbl">' +
                        '<span class="etass-td"></span>' +
                        '<span class="etass-td"></span>' +
                        '<span class="etass-td"></span>' +
                    '</div>';
                body.appendChild(typingEl);
                body.scrollTop = body.scrollHeight;
            },
            removeTyping: function () {
                if (typingEl && typingEl.parentNode) {
                    typingEl.parentNode.removeChild(typingEl);
                    typingEl = null;
                }
            }
        };
    }

    var chatBot = createChatBot();
    E.chatBot = chatBot;

    // Mostra stato bot nella chat — ripristina stato aperto/chiuso
    var wasOpen = sessionStorage.getItem('etass-chat-open');
    chatBot.show();
    if (botEnabled) {
        chatBot.addMessage('🟢 <b>Bot abilitato</b> — automazione attiva.', 300);
    } else {
        chatBot.addMessage('🔴 <b>Bot disabilitato</b> — automazione non attiva.', 300);
    }
    // Se era chiuso OPPURE è la prima visita con bot disabilitato → minimizza
    if (wasOpen === 'false' || (wasOpen === null && !botEnabled)) {
        var chatWrap = document.querySelector('#etass-chat');
        if (chatWrap) chatWrap.classList.add('etass-minimized');
    }

})();
