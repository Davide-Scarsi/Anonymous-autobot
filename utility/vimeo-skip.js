(function () {

    function init() {
        if (typeof Vimeo === 'undefined' || !Vimeo.Player) {
            setTimeout(init, 100);
            return;
        }

        // ── Blocca il reset del seek ──────────────────────────
        var originalSetCurrentTime = Vimeo.Player.prototype.setCurrentTime;
        var lastSeekedTo = null;
        var seekTimestamp = 0;

        var originalOn = Vimeo.Player.prototype.on;
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
            var msSinceSeek = Date.now() - seekTimestamp;
            if (lastSeekedTo !== null && seconds < lastSeekedTo && msSinceSeek < 600) {
                console.log('[Skip] Reset bloccato:', seconds, '→ tenuto a', lastSeekedTo);
                return Promise.resolve(lastSeekedTo);
            }
            return originalSetCurrentTime.call(this, seconds);
        };

        console.log('[Skip] Protezione seek disabilitata ✅');

        // ── Porta il video a 1 secondo dalla fine ─────────────
        var iframe = document.querySelector('iframe');
        if (!iframe) {
            console.warn('[Skip] Nessun iframe trovato');
            return;
        }

        var player = new Vimeo.Player(iframe);

        player.ready()
            .then(function () { return player.play(); })
            .then(function () { return new Promise(function (r) { setTimeout(r, 300); }); })
            .then(function () { return player.getDuration(); })
            .then(function (duration) {
                var target = duration - 1;
                lastSeekedTo = target;
                seekTimestamp = Date.now() + 99999;
                console.log('[Skip] Durata:', duration, '→ salto a', target);
                return originalSetCurrentTime.call(new Vimeo.Player(iframe), target);
            })
            .then(function (t) {
                console.log('[Skip] Posizionato a:', t, '✅');
            })
            .catch(function (err) {
                console.warn('[Skip] Errore:', err);
            });
    }

    init();

})();
