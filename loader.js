fetch('https://raw.githubusercontent.com/Davide-Scarsi/Anonymous-autobot/main/Anonymous-autobot.js?t=' + Date.now())
  .then(r => r.text())
  .then(code => eval(code))
  .catch(e => console.error('[Loader] Errore:', e));
