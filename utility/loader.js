// -----MAIN -----//
window.__ETASS_BRANCH = 'main';
fetch('https://raw.githubusercontent.com/Davide-Scarsi/Anonymous-autobot/' + window.__ETASS_BRANCH + '/Anonymous-autobot.js?t=' + Date.now())
  .then(r => r.text())
  .then(code => eval(code))
  .catch(e => console.error('[Loader] Errore:', e));


// ----- DEV -----//
window.__ETASS_BRANCH = 'dev';
fetch('https://raw.githubusercontent.com/Davide-Scarsi/Anonymous-autobot/' + window.__ETASS_BRANCH + '/Anonymous-autobot.js?t=' + Date.now())
  .then(r => r.text())
  .then(code => eval(code))
  .catch(e => console.error('[Loader] Errore:', e));

