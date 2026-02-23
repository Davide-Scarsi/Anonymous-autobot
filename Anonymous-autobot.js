(function () {

    // ─────────────────────────────────────────────
    //  CONFIGURAZIONE
    // ─────────────────────────────────────────────
    var botEnabled = sessionStorage.getItem('etass-bot-enabled') === 'true';
    var AUTO_PRESS_START_BTN = botEnabled;
    var AUTO_SKIP_VIDEO = botEnabled;

    // Salva riferimenti nativi PRIMA che il sito li sovrascriva
    var _setInterval = window.setInterval.bind(window);
    var _clearInterval = window.clearInterval.bind(window);
    var _setTimeout = window.setTimeout.bind(window);

    var hasVideo = !!document.querySelector('iframe[src*="vimeo"], iframe[data-vimeo-id], iframe[src*="player.vimeo"]');
    var hasQuiz  = !!document.querySelector('.wpProQuiz_list, #wpProQuiz_604, [id^="wpProQuiz_"]');

    console.log('[Etass] Video:', hasVideo, '| Quiz:', hasQuiz);

    // ─────────────────────────────────────────────
    //  CHATBOT GRAFICO
    // ─────────────────────────────────────────────
    var ETASS_AVATAR = 'https://raw.githubusercontent.com/Davide-Scarsi/Anonymous-autobot/main/img/Avatar.png';

    function createChatBot() {
        var style = document.createElement('style');
        style.textContent = [
            '#etass-chat{position:fixed;bottom:24px;right:24px;width:320px;background:#f5f7fa;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.22);display:flex;flex-direction:column;font-family:"Segoe UI",Arial,sans-serif;z-index:2147483647;overflow:hidden;transform:translateY(calc(100% + 32px));opacity:0;transition:transform .5s cubic-bezier(.22,1,.36,1),opacity .5s,width .35s cubic-bezier(.22,1,.36,1),height .35s cubic-bezier(.22,1,.36,1),border-radius .35s;}',
            '#etass-chat.etass-visible{transform:translateY(0);opacity:1;}',
            '#etass-chat.etass-minimized{width:68px;height:68px;border-radius:50%;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.28);}',
            '#etass-chat-header{display:flex;align-items:center;gap:10px;padding:13px 16px;background:#fff;border-bottom:1px solid #e0e4ea;cursor:pointer;user-select:none;}',
            '#etass-chat.etass-minimized #etass-chat-header{padding:5px;border-bottom:none;justify-content:center;background:#fff;width:68px;height:68px;box-sizing:border-box;}',
            '#etass-chat.etass-minimized .etass-hinfo,#etass-chat.etass-minimized .etass-dot-online{display:none;}',
            '#etass-chat.etass-minimized #etass-chat-body{display:none;}',
            '#etass-chat-header .etass-header-av{width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #e0e4ea;background:#fff;}',
            '#etass-chat.etass-minimized #etass-chat-header .etass-header-av{width:58px;height:58px;border:3px solid #e0e4ea;}',
            '#etass-chat-header .etass-hinfo{display:flex;flex-direction:column;min-width:0;}',
            '#etass-chat-header .etass-hname{color:#1a1a2e;font-size:13.5px;font-weight:700;letter-spacing:.3px;}',
            '#etass-chat-header .etass-hsub{color:#999;font-size:11px;}',
            '#etass-chat-header .etass-dot-online{margin-left:auto;width:9px;height:9px;flex-shrink:0;background:#4caf50;border-radius:50%;box-shadow:0 0 6px #4caf50;}',
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
            '#etass-chat-footer{display:flex;align-items:center;justify-content:flex-end;padding:8px 12px;background:#fff;border-top:1px solid #e0e4ea;}',
            '#etass-chat.etass-minimized #etass-chat-footer{display:none;}',
            '#etass-gear-btn{background:none;border:none;cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:background .2s;}',
            '#etass-gear-btn:hover{background:#eef0f5;}',
            '#etass-gear-btn svg{width:20px;height:20px;fill:#888;transition:fill .2s;}',
            '#etass-gear-btn:hover svg{fill:#555;}',
            '#etass-settings{display:none;padding:10px 14px;background:#fff;border-top:1px solid #e0e4ea;}',
            '#etass-settings.etass-settings-open{display:flex;align-items:center;justify-content:space-between;}',
            '#etass-settings .etass-opt-label{font-size:12.5px;color:#2c2c3e;font-weight:500;}',
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
                '<span class="etass-dot-online"></span>' +
            '</div>' +
            '<div id="etass-chat-body"></div>' +
            '<div id="etass-settings">' +
                '<span class="etass-opt-label">Abilita bot</span>' +
                '<label class="etass-switch">' +
                    '<input type="checkbox" id="etass-toggle-bot"' + (botEnabled ? ' checked' : '') + ' />' +
                    '<span class="etass-slider"></span>' +
                '</label>' +
            '</div>' +
            '<div id="etass-chat-footer">' +
                '<button id="etass-gear-btn" title="Impostazioni">' +
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
        toggleInput.addEventListener('change', function () {
            sessionStorage.setItem('etass-bot-enabled', toggleInput.checked ? 'true' : 'false');
            location.reload();
        });
        // Evita che click sul settings propaghi all'header
        settingsPanel.addEventListener('click', function (e) { e.stopPropagation(); });

        // Toggle minimizza/espandi cliccando l'header
        var header = wrap.querySelector('#etass-chat-header');
        header.addEventListener('click', function () {
            wrap.classList.toggle('etass-minimized');
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
                // Mostra ANONYMOUS dopo 5s
                _setTimeout(function () {
                    scrambleName(NAME_A, NAME_B, function () {
                        currentName = NAME_B;
                        // Torna a Etass AI dopo 1.2s
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
                    // Se il typing è visibile, inserisci il messaggio PRIMA di esso
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

    // Mostra stato bot nella chat
    chatBot.show();
    if (botEnabled) {
        chatBot.addMessage('🟢 <b>Bot abilitato</b> — automazione attiva.', 300);
    } else {
        chatBot.addMessage('🔴 <b>Bot disabilitato</b> — automazione non attiva.', 300);
        // Se disattivo, parti collassato
        var chatWrap = document.querySelector('#etass-chat');
        if (chatWrap) chatWrap.classList.add('etass-minimized');
    }

    // ─────────────────────────────────────────────
    //  MODALITÀ VIDEO
    // ─────────────────────────────────────────────
    if (hasVideo) {

        function initVideo() {
            if (typeof Vimeo === 'undefined' || !Vimeo.Player) {
                setTimeout(initVideo, 100);
                return;
            }

            const originalSetCurrentTime = Vimeo.Player.prototype.setCurrentTime;
            let lastSeekedTo = null;
            let seekTimestamp = 0;

            const originalOn = Vimeo.Player.prototype.on;
            Vimeo.Player.prototype.on = function (event, callback) {
                if (event === 'seeked') {
                    originalOn.call(this, 'seeked', function (e) {
                        lastSeekedTo = e.seconds;
                        seekTimestamp = Date.now();
                    });
                }
                return originalOn.call(this, event, callback);
            };

            Vimeo.Player.prototype.setCurrentTime = function (seconds) {
                const msSinceSeek = Date.now() - seekTimestamp;
                if (lastSeekedTo !== null && seconds < lastSeekedTo && msSinceSeek < 600) {
                    console.log('[Video] Reset bloccato:', seconds, '→ tenuto a', lastSeekedTo);
                    return Promise.resolve(lastSeekedTo);
                }
                return originalSetCurrentTime.call(this, seconds);
            };

            console.log('[Video] Attivo — restrizione seek disabilitata');

            const iframe = document.querySelector('iframe');
            if (!iframe) return;

            // ── Blur + overlay + mute SOLO se bot abilitato ──────────
            if (botEnabled) {
            // ── Blur + overlay Anonymous sul video ──────────────────
            (function applyVideoOverlay() {
                var iframeStyle = document.createElement('style');
                iframeStyle.textContent =
                    '.etass-video-wrap{position:relative;display:block;width:100%;height:100%;}' +
                    '.etass-video-wrap iframe{filter:blur(8px);pointer-events:none;display:block;width:100%;height:100%;}' +
                    '.etass-glitch-box{position:absolute;top:50%;left:50%;width:260px;height:260px;transform:translate(-50%,-50%);pointer-events:none;z-index:9999;}' +
                    '.etass-glitch-box img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;}' +
                    '.etass-glitch-layer{will-change:clip-path,transform,opacity;}';
                document.head.appendChild(iframeStyle);

                var parent = iframe.parentNode;
                var wrap = document.createElement('div');
                wrap.className = 'etass-video-wrap';
                wrap.style.cssText = 'width:' + (iframe.offsetWidth || '100%') + (typeof iframe.offsetWidth === 'number' ? 'px' : '') + ';height:' + (iframe.offsetHeight || '100%') + (typeof iframe.offsetHeight === 'number' ? 'px' : '') + ';';
                parent.insertBefore(wrap, iframe);
                wrap.appendChild(iframe);

                var ANON_SRC = 'https://raw.githubusercontent.com/Davide-Scarsi/Anonymous-autobot/main/img/Anonymous.png';

                // Crea il container glitch con 3 layer (base + 2 copie RGB)
                var box = document.createElement('div');
                box.className = 'etass-glitch-box';

                var layers = [];
                for (var li = 0; li < 3; li++) {
                    var img = document.createElement('img');
                    img.src = ANON_SRC;
                    img.alt = '';
                    img.className = 'etass-glitch-layer';
                    if (li === 1) { img.style.mixBlendMode = 'multiply'; img.style.opacity = '0'; }
                    if (li === 2) { img.style.mixBlendMode = 'multiply'; img.style.opacity = '0'; }
                    box.appendChild(img);
                    layers.push(img);
                }
                wrap.appendChild(box);

                // ── JS glitch engine ──
                var STATE_IDLE = 0, STATE_BURST = 1;
                var state = STATE_IDLE;
                var burstEnd = 0;
                var nextBurst = Date.now() + 2000 + Math.random() * 3000;

                function randRange(a, b) { return a + Math.random() * (b - a); }

                function makeSlices(count) {
                    // Genera "count" bande orizzontali casuali che coprono il 100% dell'altezza
                    var slices = [];
                    var pts = [0];
                    for (var s = 0; s < count - 1; s++) pts.push(Math.random() * 100);
                    pts.push(100);
                    pts.sort(function (a, b) { return a - b; });
                    for (var s = 0; s < pts.length - 1; s++) {
                        slices.push({ top: pts[s], bottom: pts[s + 1] });
                    }
                    return slices;
                }

                function glitchFrame() {
                    var now = Date.now();

                    if (state === STATE_IDLE) {
                        // Reset
                        layers[0].style.clipPath = '';
                        layers[0].style.transform = '';
                        layers[0].style.filter = '';
                        layers[1].style.opacity = '0';
                        layers[2].style.opacity = '0';

                        if (now >= nextBurst) {
                            state = STATE_BURST;
                            burstEnd = now + 120 + Math.random() * 350;
                        }
                    }

                    if (state === STATE_BURST) {
                        if (now > burstEnd) {
                            // Fine burst
                            state = STATE_IDLE;
                            nextBurst = now + 1800 + Math.random() * 4000;
                            layers[0].style.clipPath = '';
                            layers[0].style.transform = '';
                            layers[0].style.filter = '';
                            layers[1].style.opacity = '0';
                            layers[2].style.opacity = '0';
                        } else {
                            // Slice principale — spezza l'immagine base in bande con offset orizzontale
                            var numSlices = 3 + Math.floor(Math.random() * 5);
                            var slices = makeSlices(numSlices);

                            // Applica al layer base un clip casuale su UNA slice per farla "scattare"
                            var pick = Math.floor(Math.random() * slices.length);
                            var sl = slices[pick];
                            var xShift = randRange(-20, 20);
                            layers[0].style.clipPath = 'inset(' + sl.top + '% 0 ' + (100 - sl.bottom) + '% 0)';
                            layers[0].style.transform = 'translateX(' + xShift + 'px)';

                            // Layer 1: ciano spostato — diversa slice
                            var pick2 = (pick + 1) % slices.length;
                            var sl2 = slices[pick2];
                            layers[1].style.opacity = '0.7';
                            layers[1].style.filter = 'sepia(1) saturate(20) hue-rotate(120deg) brightness(1.2)';
                            layers[1].style.clipPath = 'inset(' + sl2.top + '% 0 ' + (100 - sl2.bottom) + '% 0)';
                            layers[1].style.transform = 'translateX(' + randRange(-15, 15) + 'px)';

                            // Layer 2: rosso spostato — altra slice ancora
                            var pick3 = (pick + 2) % slices.length;
                            var sl3 = slices[pick3];
                            layers[2].style.opacity = '0.6';
                            layers[2].style.filter = 'sepia(1) saturate(20) hue-rotate(-30deg) brightness(1.1)';
                            layers[2].style.clipPath = 'inset(' + sl3.top + '% 0 ' + (100 - sl3.bottom) + '% 0)';
                            layers[2].style.transform = 'translateX(' + randRange(-18, 18) + 'px)';

                            // Ogni ~40ms cambia le slice del burst per dare l'effetto "tremolio"
                        }
                    }

                    requestAnimationFrame(glitchFrame);
                }
                requestAnimationFrame(glitchFrame);
            })();
            // ────────────────────────────────────────────────────────

            } // fine if (botEnabled) per blur/overlay

            const player = new Vimeo.Player(iframe);

            // Forza il video a muto solo se bot abilitato
            if (botEnabled) {
                player.setVolume(0).catch(function () {});
            }

            function getNextLessonUrl() {
                const nextBtn = Array.from(document.querySelectorAll('a.ld-button')).find(function (a) {
                    return a.textContent.includes('Prossima');
                });
                if (nextBtn && nextBtn.href) return nextBtn.href;

                const allLessons = Array.from(document.querySelectorAll('a.ld-lesson-item-preview-heading[href]'));
                const currentUrl = window.location.href.split('?')[0].replace(/\/$/, '');
                const currentIdx = allLessons.findIndex(function (a) {
                    return a.href.replace(/\/$/, '') === currentUrl;
                });
                if (currentIdx !== -1 && currentIdx + 1 < allLessons.length) {
                    return allLessons[currentIdx + 1].href;
                }
                return null;
            }

            const nextLessonUrl = getNextLessonUrl();
            console.log('[Video] Prossima lezione URL:', nextLessonUrl);

            player.on('ended', function () {
                if (!AUTO_SKIP_VIDEO) {
                    console.log('[Video] ENDED — navigazione automatica disabilitata.');
                    return;
                }
                console.log('[Video] ENDED — attendo completamento piattaforma...');
                setTimeout(function () {
                    if (nextLessonUrl) {
                        console.log('[Video] Navigazione verso:', nextLessonUrl);
                        window.location.href = nextLessonUrl;
                    } else {
                        console.warn('[Video] Prossima lezione non trovata');
                    }
                }, 3000);
            });

            if (!botEnabled) {
                console.log('[Video] Bot disabilitato — video normale.');
                return;
            }

            chatBot.addMessage('Stiamo saltando tutti i video, attendere...', 600);

            if (!AUTO_SKIP_VIDEO) {
                console.log('[Video] Salto automatico disabilitato (AUTO_SKIP_VIDEO = false).');
                return;
            }

            player.ready().then(function () {
                return player.play();
            }).then(function () {
                return new Promise(function (resolve) { setTimeout(resolve, 300); });
            }).then(function () {
                return player.getDuration();
            }).then(function (duration) {
                lastSeekedTo = duration - 1;
                seekTimestamp = Date.now() + 99999;
                return originalSetCurrentTime.call(new Vimeo.Player(iframe), duration - 1);
            }).then(function (seconds) {
                console.log('[Video] Portato a:', seconds);
            }).catch(function (err) {
                console.warn('[Video] Errore:', err);
            });
        }

        initVideo();
    }

    // ─────────────────────────────────────────────
    //  MODALITÀ QUIZ
    // ─────────────────────────────────────────────
    if (hasQuiz) {

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
                    chatBot.addMessage('💡 ' + (result.explanation || 'Nessuna spiegazione disponibile.') + '<br><br><i>Clicca su "Successivo" per continuare.</i>', 900);
                }
            } else {
                console.warn('[Quiz] Lettera non valida:', result.letter);
            }
        }

        // Risolve solo la domanda corrente visibile, senza toccare i bottoni
        async function autoSolveAll() {
            console.log('[Quiz] Avvio risoluzione domanda corrente...');
            await new Promise(function (r) { setTimeout(r, 600); });

            const visibleItem = getVisibleQuestion();

            if (!visibleItem) {
                console.log('[Quiz] Nessuna domanda visibile.');
                return;
            }

            await solveCurrentQuestion();

            // Dopo che l'utente chiude l'alert e clicca Successivo,
            // polling per rilevare cambio domanda
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
            // Cerca il bottone "Inizio Quiz" e premilo automaticamente
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

            // Polling per rilevare quando la prima domanda diventa visibile
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
    }

})();
