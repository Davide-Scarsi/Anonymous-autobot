// ─────────────────────────────────────────────
//  MODULO VIDEO
//  Legge da window.__ETASS (chatBot, botEnabled, ANON, ecc.)
//  Espone start/stop su E.modules.video
// ─────────────────────────────────────────────
(function () {
    var E = window.__ETASS;
    var chatBot        = E.chatBot;
    var ANON_SRC       = E.ANON;

    // ── State tracking per toggle live ──
    var glitchRunning  = false;
    var skipGeneration = 0;   // contatore generazione: invalida tutte le chain precedenti
    var player         = null;
    var iframeEl       = null;
    var videoWrap      = null;
    var glitchBox      = null;
    var overlayStyleEl = null;
    var originalSetCurrentTime = null;
    var lastSeekedTo   = null;
    var seekTimestamp   = 0;

    function initVideo() {
        if (typeof Vimeo === 'undefined' || !Vimeo.Player) {
            setTimeout(initVideo, 100);
            return;
        }

        originalSetCurrentTime = Vimeo.Player.prototype.setCurrentTime;

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

        // Cerca specificamente l'iframe Vimeo (NON il primo iframe qualsiasi)
        function findVimeoIframe() {
            return document.querySelector('iframe[src*="player.vimeo.com"]')
                || document.querySelector('iframe[src*="vimeo.com/video"]')
                || document.querySelector('iframe[src*="vimeo"]');
        }
        iframeEl = findVimeoIframe();
        if (!iframeEl) {
            console.log('[Video] Iframe Vimeo non trovato, riprovo in 500ms...');
            setTimeout(initVideo, 500);
            return;
        }
        console.log('[Video] Iframe Vimeo trovato:', iframeEl.src);

        // ── Wrap iframe una sola volta (prima di creare il Player) ──
        // Il wrapper esiste sempre; blur + glitch si attivano solo con la classe .etass-video-active
        // IMPORTANTE: NON reparentare/muovere l'iframe nel DOM — farlo ricarica il contenuto
        // e rompe il canale postMessage del Vimeo Player SDK.
        overlayStyleEl = document.createElement('style');
        overlayStyleEl.textContent =
            '.etass-video-wrap{position:relative;}' +
            '.etass-video-wrap.etass-video-active iframe{filter:blur(8px);pointer-events:none;}' +
            '.etass-glitch-box{display:none;position:absolute;top:50%;left:50%;width:260px;height:260px;transform:translate(-50%,-50%);pointer-events:none;z-index:9999;}' +
            '.etass-video-active .etass-glitch-box{display:block;}' +
            '.etass-glitch-box img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;}' +
            '.etass-glitch-layer{will-change:clip-path,transform,opacity;}';
        document.head.appendChild(overlayStyleEl);

        // Usa il parent esistente dell'iframe come wrapper (nessun DOM move!)
        videoWrap = iframeEl.parentNode;
        videoWrap.classList.add('etass-video-wrap');

        // Glitch box (appesa come fratello dopo l'iframe, nascosta di default)
        glitchBox = document.createElement('div');
        glitchBox.className = 'etass-glitch-box';
        var layers = [];
        for (var li = 0; li < 3; li++) {
            var img = document.createElement('img');
            img.src = ANON_SRC;
            img.alt = '';
            img.className = 'etass-glitch-layer';
            if (li === 1) { img.style.mixBlendMode = 'multiply'; img.style.opacity = '0'; }
            if (li === 2) { img.style.mixBlendMode = 'multiply'; img.style.opacity = '0'; }
            glitchBox.appendChild(img);
            layers.push(img);
        }
        videoWrap.appendChild(glitchBox);

        // ── Glitch engine (gira solo quando glitchRunning == true) ──
        var STATE_IDLE = 0, STATE_BURST = 1;
        var state = STATE_IDLE;
        var burstEnd = 0;
        var nextBurst = Date.now() + 2000 + Math.random() * 3000;

        function randRange(a, b) { return a + Math.random() * (b - a); }

        function makeSlices(count) {
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
            if (!glitchRunning) {
                // Reset layers pulito quando il bot si ferma
                layers[0].style.clipPath = '';
                layers[0].style.transform = '';
                layers[0].style.filter = '';
                layers[1].style.opacity = '0';
                layers[2].style.opacity = '0';
                return;
            }

            var now = Date.now();

            if (state === STATE_IDLE) {
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
                    state = STATE_IDLE;
                    nextBurst = now + 1800 + Math.random() * 4000;
                    layers[0].style.clipPath = '';
                    layers[0].style.transform = '';
                    layers[0].style.filter = '';
                    layers[1].style.opacity = '0';
                    layers[2].style.opacity = '0';
                } else {
                    var numSlices = 3 + Math.floor(Math.random() * 5);
                    var slices = makeSlices(numSlices);

                    var pick = Math.floor(Math.random() * slices.length);
                    var sl = slices[pick];
                    var xShift = randRange(-20, 20);
                    layers[0].style.clipPath = 'inset(' + sl.top + '% 0 ' + (100 - sl.bottom) + '% 0)';
                    layers[0].style.transform = 'translateX(' + xShift + 'px)';

                    var pick2 = (pick + 1) % slices.length;
                    var sl2 = slices[pick2];
                    layers[1].style.opacity = '0.7';
                    layers[1].style.filter = 'sepia(1) saturate(20) hue-rotate(120deg) brightness(1.2)';
                    layers[1].style.clipPath = 'inset(' + sl2.top + '% 0 ' + (100 - sl2.bottom) + '% 0)';
                    layers[1].style.transform = 'translateX(' + randRange(-15, 15) + 'px)';

                    var pick3 = (pick + 2) % slices.length;
                    var sl3 = slices[pick3];
                    layers[2].style.opacity = '0.6';
                    layers[2].style.filter = 'sepia(1) saturate(20) hue-rotate(-30deg) brightness(1.1)';
                    layers[2].style.clipPath = 'inset(' + sl3.top + '% 0 ' + (100 - sl3.bottom) + '% 0)';
                    layers[2].style.transform = 'translateX(' + randRange(-18, 18) + 'px)';
                }
            }

            requestAnimationFrame(glitchFrame);
        }

        // ── Crea il Player DOPO aver wrappato l'iframe ──
        player = new Vimeo.Player(iframeEl);

        // ── Navigazione prossima lezione (sempre attivo) ──
        // Ricalcolato ogni volta perché il pulsante può apparire dopo il caricamento
        function getNextLessonUrl() {
            // 1) Cerca qualsiasi pulsante .ld-button con testo di navigazione
            var keywords = ['Prossima', 'Quiz', 'Successiv', 'Next', 'Continua', 'Avanti'];
            var allBtns = Array.from(document.querySelectorAll('a.ld-button[href]'));
            for (var i = 0; i < allBtns.length; i++) {
                var txt = allBtns[i].textContent;
                for (var k = 0; k < keywords.length; k++) {
                    if (txt.indexOf(keywords[k]) !== -1) {
                        return allBtns[i].href;
                    }
                }
            }
            // 2) Se non trovato con keyword, prendi il primo .ld-button con icona freccia
            var arrowBtn = document.querySelector('a.ld-button[href] .ld-icon-arrow-right');
            if (arrowBtn) {
                var link = arrowBtn.closest('a.ld-button');
                if (link && link.href) return link.href;
            }
            // 3) Fallback: cerca nella sidebar la lezione successiva
            var allLessons = Array.from(document.querySelectorAll('a.ld-lesson-item-preview-heading[href]'));
            var currentUrl = window.location.href.split('?')[0].replace(/\/$/, '');
            var currentIdx = allLessons.findIndex(function (a) {
                return a.href.replace(/\/$/, '') === currentUrl;
            });
            if (currentIdx !== -1 && currentIdx + 1 < allLessons.length) {
                return allLessons[currentIdx + 1].href;
            }
            return null;
        }

        // Log iniziale per debug
        console.log('[Video] Prossima lezione URL (init):', getNextLessonUrl());

        // Handler ended — estratto in funzione per ri-registrazione
        function onEnded() {
            if (!E.AUTO_SKIP_VIDEO) {
                console.log('[Video] ENDED — navigazione automatica disabilitata.');
                return;
            }
            console.log('[Video] ENDED — attendo completamento piattaforma...');
            setTimeout(function () {
                var nextUrl = getNextLessonUrl();
                if (nextUrl) {
                    console.log('[Video] Navigazione verso:', nextUrl);
                    window.location.href = nextUrl;
                } else {
                    console.warn('[Video] Prossima lezione non trovata — riprovo tra 3s...');
                    setTimeout(function () {
                        var retryUrl = getNextLessonUrl();
                        if (retryUrl) {
                            console.log('[Video] Navigazione (retry) verso:', retryUrl);
                            window.location.href = retryUrl;
                        } else {
                            console.warn('[Video] Prossima lezione non trovata dopo retry');
                        }
                    }, 3000);
                }
            }, 3000);
        }
        player.on('ended', onEnded);

        // ── START: abilita blur/glitch + skip ──────────────────
        function startBot() {
            skipGeneration++;
            var myGen = skipGeneration;
            glitchRunning = true;
            E.AUTO_SKIP_VIDEO = true;
            lastSeekedTo = null;
            seekTimestamp = 0;

            // Ri-cerca l'iframe Vimeo: la piattaforma potrebbe averlo sostituito
            var freshIframe = findVimeoIframe();
            var needReady = false;
            if (freshIframe && freshIframe !== iframeEl) {
                console.log('[Video] Iframe Vimeo cambiato — ricreo Player');
                // Aggiorna wrapper: rimuovi classe dal vecchio parent, aggiungi al nuovo
                videoWrap.classList.remove('etass-video-wrap', 'etass-video-active');
                iframeEl = freshIframe;
                videoWrap = iframeEl.parentNode;
                videoWrap.classList.add('etass-video-wrap');
                // Sposta glitch box nel nuovo parent
                videoWrap.appendChild(glitchBox);
                player = new Vimeo.Player(iframeEl);
                player.on('ended', onEnded);   // ri-registra handler perso
                needReady = true;
            } else {
                // Stesso iframe — riusa il Player esistente (postMessage già attivo)
                console.log('[Video] Stesso iframe — riuso Player esistente');
            }

            videoWrap.classList.add('etass-video-active');
            requestAnimationFrame(glitchFrame);

            chatBot.addMessage('Stiamo saltando tutti i video, attendere...', 600);

            // Attendi ready() solo se il Player è stato ricreato
            var readyGate = needReady
                ? vimeoCall(player.ready(), 4000, 'ready()')
                : Promise.resolve();
            readyGate.then(function () {
                if (myGen !== skipGeneration) return;
                trySkipVideo(0, myGen);
            });
        }

        // ── STOP: rimuovi blur/glitch, unmute ──────────────────
        function stopBot() {
            skipGeneration++;   // invalida tutte le chain in corso
            glitchRunning = false;
            E.AUTO_SKIP_VIDEO = false;

            videoWrap.classList.remove('etass-video-active');

            if (player) {
                player.setVolume(1).catch(function () {});
            }
            console.log('[Video] Bot fermato — overlay disattivato.');
        }

        // ── Helper: wrappa qualsiasi promise Vimeo con timeout ──
        // Se la promise non risolve/rifiuta entro `ms`, risolve con `fallback`
        function vimeoCall(promise, ms, label, fallback) {
            return new Promise(function (resolve) {
                var done = false;
                setTimeout(function () {
                    if (!done) {
                        done = true;
                        console.warn('[Video] ⏱ Timeout ' + ms + 'ms su ' + label + ' — procedo');
                        resolve(fallback);
                    }
                }, ms);
                promise.then(function (val) {
                    if (!done) { done = true; resolve(val); }
                }).catch(function (err) {
                    if (!done) {
                        done = true;
                        console.warn('[Video] ' + label + ' errore:', err.name || err, '— procedo');
                        resolve(fallback);
                    }
                });
            });
        }

        // ── Skip video (dentro initVideo per accesso a getNextLessonUrl) ──
        function trySkipVideo(prevAttempts, gen) {
            if (gen !== skipGeneration) return;
            var attempt = (prevAttempts || 0) + 1;
            var MAX_SKIP_RETRIES = 3;

            console.log('[Video] Tentativo skip #' + attempt + ' (gen ' + gen + ')...');

            // Fase 1: mute
            vimeoCall(player.setVolume(0), 2000, 'setVolume(0)').then(function () {
                if (gen !== skipGeneration) { console.log('[Video] gen stale @mute'); return; }
                console.log('[Video] Mute ok');

                // Fase 2: play (solo se in pausa)
                return vimeoCall(player.getPaused(), 2000, 'getPaused()', true);
            }).then(function (paused) {
                if (gen !== skipGeneration) return;
                if (paused === false) {
                    console.log('[Video] Già in play');
                    return;
                }
                console.log('[Video] In pausa — chiamo play()...');
                return vimeoCall(player.play(), 3000, 'play()').catch(function () {
                    console.warn('[Video] play() fallito — reset a 0 e riprovo');
                    return vimeoCall(originalSetCurrentTime.call(player, 0), 2000, 'setCurrentTime(0)', 0)
                        .then(function () { return vimeoCall(player.play(), 3000, 'play() retry'); });
                });
            }).then(function () {
                if (gen !== skipGeneration) return;
                console.log('[Video] Play step ok — attendo 500ms...');
                return new Promise(function (resolve) { setTimeout(resolve, 500); });

            // Fase 3: getDuration + seek a fine
            }).then(function () {
                if (gen !== skipGeneration) return;
                return vimeoCall(player.getDuration(), 2000, 'getDuration()', 0);
            }).then(function (duration) {
                if (gen !== skipGeneration) return;
                if (!duration || duration < 1) {
                    console.warn('[Video] Durata non valida:', duration);
                    throw new Error('durata non valida');
                }
                console.log('[Video] Durata:', duration, '— seek a', (duration - 1).toFixed(1));
                lastSeekedTo = duration - 1;
                seekTimestamp = Date.now() + 99999;
                return vimeoCall(
                    originalSetCurrentTime.call(player, duration - 1),
                    3000, 'setCurrentTime(' + (duration - 1).toFixed(1) + ')', duration - 1
                );
            }).then(function (seconds) {
                if (gen !== skipGeneration) return;
                console.log('[Video] Portato a:', seconds);
                // Assicura play dopo seek
                vimeoCall(player.play(), 2000, 'play() post-seek');

                // Fase 4: verifica dopo 1s
                setTimeout(function () {
                    if (gen !== skipGeneration) return;
                    vimeoCall(player.getCurrentTime(), 2000, 'getCurrentTime()', 0).then(function (t) {
                        return vimeoCall(player.getDuration(), 2000, 'getDuration() verify', 0).then(function (d) {
                            if (gen !== skipGeneration) return;
                            if (!d || t < d - 5) {
                                console.warn('[Video] Skip non riuscito (posizione: ' + (t||0).toFixed(1) + '/' + (d||0).toFixed(1) + ')');
                                if (attempt < MAX_SKIP_RETRIES) {
                                    chatBot.addMessage('⚠️ Skip fallito, riprovo... (' + attempt + '/' + MAX_SKIP_RETRIES + ')', 0);
                                    setTimeout(function () { trySkipVideo(attempt, gen); }, 1500);
                                } else {
                                    chatBot.addMessage('⚠️ Skip fallito dopo ' + MAX_SKIP_RETRIES + ' tentativi.', 0);
                                }
                            } else {
                                console.log('[Video] Skip confermato ✅');
                                vimeoCall(player.play(), 2000, 'play() finale');
                                // Fallback navigazione
                                setTimeout(function () {
                                    if (gen !== skipGeneration) return;
                                    var fallbackUrl = getNextLessonUrl();
                                    if (fallbackUrl) {
                                        console.log('[Video] Fallback — navigazione forzata verso:', fallbackUrl);
                                        window.location.href = fallbackUrl;
                                    } else {
                                        console.warn('[Video] Fallback — nessun URL trovato');
                                    }
                                }, 6000);
                            }
                        });
                    });
                }, 1000);
            }).catch(function (err) {
                if (gen !== skipGeneration) return;
                console.warn('[Video] Errore skip:', err);
                if (attempt < MAX_SKIP_RETRIES) {
                    chatBot.addMessage('⚠️ Errore skip, riprovo... (' + attempt + '/' + MAX_SKIP_RETRIES + ')', 0);
                    setTimeout(function () { trySkipVideo(attempt, gen); }, 1500);
                } else {
                    chatBot.addMessage('⚠️ Skip fallito dopo ' + MAX_SKIP_RETRIES + ' tentativi.', 0);
                }
            });
        }

        // ── Registra modulo per toggle live ──
        E.modules.video = { start: startBot, stop: stopBot };

        if (E.botEnabled) {
            startBot();
        } else {
            console.log('[Video] Bot disabilitato — video normale.');
        }
    }

    initVideo();

})();
