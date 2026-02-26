// ─────────────────────────────────────────────
//  MODULO VIDEO
//  Legge da window.__ETASS (chatBot, botEnabled, ANON, ecc.)
// ─────────────────────────────────────────────
(function () {
    var E = window.__ETASS;
    var botEnabled     = E.botEnabled;
    var AUTO_SKIP_VIDEO = E.AUTO_SKIP_VIDEO;
    var chatBot        = E.chatBot;
    var ANON_SRC       = E.ANON;

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

})();
