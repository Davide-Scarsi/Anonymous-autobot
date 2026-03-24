// ─────────────────────────────────────────────────────────────────────────────
//  VIMEO VIDEO DOWNLOADER v5 — yt-dlp + ffmpeg
//  Incolla nella console del browser (F12 → Console) sulla pagina del corso.
//  Genera un comando PowerShell che:
//    1. Scarica yt-dlp.exe (se non presente)
//    2. Scarica ffmpeg.exe (se non presente) — SERVE PER L'AUDIO
//    3. Scarica il video CON AUDIO in MP4
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    'use strict';

    var CSS = {
        panel: 'position:fixed;top:20px;right:20px;z-index:999999;background:#1a1a2e;color:#e0e0e0;padding:20px 22px;border-radius:10px;font-family:monospace;font-size:13px;box-shadow:0 4px 24px rgba(0,0,0,0.6);max-width:520px;min-width:340px;',
        btn:   'display:block;width:100%;margin-top:8px;padding:12px 14px;color:#fff;border:none;border-radius:5px;cursor:pointer;font-family:monospace;font-size:12px;text-align:center;box-sizing:border-box;',
        input: 'width:100%;margin-top:6px;padding:6px;font-size:10px;background:#0f3460;color:#fff;border:1px solid #e94560;border-radius:4px;box-sizing:border-box;word-break:break-all;'
    };

    // ── Trova iframe Vimeo ──
    var iframe = document.querySelector('iframe[src*="player.vimeo.com"]')
        || document.querySelector('iframe[src*="vimeo.com/video"]')
        || document.querySelector('iframe[src*="vimeo"]');

    if (!iframe) { alert('[Download] Nessun iframe Vimeo trovato.'); return; }

    var iframeSrc = iframe.src;
    if (iframeSrc.startsWith('//')) iframeSrc = 'https:' + iframeSrc;
    var vidMatch = iframeSrc.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    var videoId  = vidMatch ? vidMatch[1] : 'video';

    // Prova a prendere il titolo dalla pagina
    var pageTitle = document.title.replace(/[<>:"/\\|?*]+/g, '_').replace(/\s+/g, '_').substring(0, 60) || ('video_' + videoId);

    // ── Costruisci i comandi ──
    var referer   = location.href;
    var outputName = pageTitle + '.mp4';

    // Comando SETUP: scarica yt-dlp e ffmpeg se non presenti
    var setupCmd = [
        '$dir = "C:\\TeamSystem Software\\vimeo-dl"',
        'New-Item -ItemType Directory -Force -Path $dir | Out-Null',
        'Set-Location $dir',
        '',
        '# Scarica yt-dlp se non presente',
        'if (-not (Test-Path .\\yt-dlp.exe)) {',
        '    Write-Host "Scaricando yt-dlp..." -ForegroundColor Yellow',
        '    Invoke-WebRequest "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile yt-dlp.exe',
        '    Write-Host "yt-dlp scaricato!" -ForegroundColor Green',
        '} else { Write-Host "yt-dlp gia presente" -ForegroundColor Green }',
        '',
        '# Scarica ffmpeg se non presente (NECESSARIO per audio+video)',
        'if (-not (Test-Path .\\ffmpeg.exe)) {',
        '    Write-Host "Scaricando ffmpeg (serve per audio)..." -ForegroundColor Yellow',
        '    Invoke-WebRequest "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -OutFile ffmpeg.zip',
        '    Expand-Archive ffmpeg.zip -DestinationPath ffmpeg_temp -Force',
        '    Copy-Item ffmpeg_temp\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe .\\ffmpeg.exe',
        '    Remove-Item ffmpeg.zip, ffmpeg_temp -Recurse -Force',
        '    Write-Host "ffmpeg scaricato!" -ForegroundColor Green',
        '} else { Write-Host "ffmpeg gia presente" -ForegroundColor Green }',
        '',
        'Write-Host ""',
        'Write-Host "=== SETUP COMPLETATO ===" -ForegroundColor Cyan',
        'Write-Host "Ora copia e incolla il COMANDO DOWNLOAD dalla pagina del corso." -ForegroundColor White'
    ].join('\n');

    // Comando DOWNLOAD: scarica il video con audio
    var dlCmd = [
        'Set-Location "C:\\TeamSystem Software\\vimeo-dl"',
        '.\\yt-dlp.exe -f "bv*+ba/b" --merge-output-format mp4 --ffmpeg-location . --referer "' + referer + '" "' + iframeSrc + '" -o "' + outputName + '"'
    ].join('; ');

    // Comando ALL-IN-ONE: setup + download tutto insieme
    var allInOne = [
        '$dir = "C:\\TeamSystem Software\\vimeo-dl"',
        'New-Item -ItemType Directory -Force -Path $dir | Out-Null',
        'Set-Location $dir',
        'if (-not (Test-Path .\\yt-dlp.exe)) { Invoke-WebRequest "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile yt-dlp.exe }',
        'if (-not (Test-Path .\\ffmpeg.exe)) { Invoke-WebRequest "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -OutFile ffmpeg.zip; Expand-Archive ffmpeg.zip -DestinationPath ffmpeg_temp -Force; Copy-Item ffmpeg_temp\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe .\\ffmpeg.exe; Remove-Item ffmpeg.zip, ffmpeg_temp -Recurse -Force }',
        '.\\yt-dlp.exe -f "bv*+ba/b" --merge-output-format mp4 --ffmpeg-location . --referer "' + referer + '" "' + iframeSrc + '" -o "' + outputName + '"'
    ].join('; ');

    // ── Crea panel UI ──
    var panel = document.createElement('div');
    panel.style.cssText = CSS.panel;
    panel.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<b style="color:#e94560;">🎬 Video Downloader</b>' +
            '<span id="etass-close" style="cursor:pointer;font-size:18px;color:#888;">✖</span>' +
        '</div>' +

        '<div style="margin-top:10px;padding:10px;background:#16213e;border-radius:6px;">' +
            '<div style="color:#e94560;font-weight:bold;margin-bottom:4px;">📋 Video: ' + videoId + '</div>' +
            '<div style="color:#aaa;font-size:11px;">' + pageTitle + '</div>' +
        '</div>' +

        // ALL-IN-ONE
        '<div style="margin-top:14px;">' +
            '<div style="color:#16c47f;font-weight:bold;">⚡ Tutto in un comando</div>' +
            '<div style="color:#aaa;font-size:11px;margin-top:2px;">Scarica tools + video con audio. Primo uso ~30sec, poi istantaneo.</div>' +
            '<button id="etass-copy-all" style="' + CSS.btn + 'background:#16c47f;font-size:14px;">📋 COPIA COMANDO (PowerShell)</button>' +
        '</div>' +

        // Istruzioni
        '<div style="margin-top:14px;padding:10px;background:#16213e;border-radius:6px;font-size:11px;color:#aaa;">' +
            '<b style="color:#e0e0e0;">Come usare:</b><br>' +
            '1. Clicca il pulsante verde qui sopra<br>' +
            '2. Apri <b>PowerShell</b> (Win+X → Terminal)<br>' +
            '3. <b>Incolla</b> (Ctrl+V) e premi <b>Invio</b><br>' +
            '4. Il video si salva in <b>C:\\TeamSystem Software\\vimeo-dl\\</b><br>' +
            '<br><span style="color:#e94560;">⚠️ Include ffmpeg = video CON audio</span>' +
        '</div>' +

        // Separatore comandi separati
        '<details style="margin-top:12px;">' +
            '<summary style="color:#888;cursor:pointer;font-size:11px;">▸ Comandi separati (avanzato)</summary>' +
            '<div style="margin-top:8px;">' +
                '<div style="color:#aaa;font-size:11px;">1. Setup (solo prima volta):</div>' +
                '<button id="etass-copy-setup" style="' + CSS.btn + 'background:#6c5ce7;font-size:11px;">📋 Copia Setup</button>' +
                '<div style="color:#aaa;font-size:11px;margin-top:8px;">2. Download:</div>' +
                '<button id="etass-copy-dl" style="' + CSS.btn + 'background:#e94560;font-size:11px;">📋 Copia Download</button>' +
            '</div>' +
        '</details>';

    document.body.appendChild(panel);

    // ── Event handlers ──
    document.getElementById('etass-close').onclick = function () { panel.remove(); };

    function copyAndFeedback(btnId, text) {
        document.getElementById(btnId).onclick = function () {
            var btn = document.getElementById(btnId);
            navigator.clipboard.writeText(text).then(function () {
                var orig = btn.textContent;
                btn.textContent = '✅ Copiato! Incolla in PowerShell';
                btn.style.background = '#16c47f';
                setTimeout(function () { btn.textContent = orig; btn.style.background = ''; }, 3000);
            });
        };
    }

    copyAndFeedback('etass-copy-all', allInOne);
    copyAndFeedback('etass-copy-setup', setupCmd);
    copyAndFeedback('etass-copy-dl', dlCmd);

    console.log('[DL] Panel attivo.');
    console.log('[DL] Video:', iframeSrc);
    console.log('[DL] All-in-one command:', allInOne);

})();
