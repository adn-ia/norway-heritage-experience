// Cloudflare Web Analytics — cookieless, anonyme, RGPD-friendly.
// ▶ Pour ACTIVER : coller le token du domaine (Cloudflare → Web Analytics → ton site → token) entre les guillemets.
//   Vide = désactivé (rien ne charge, aucun suivi).
(function(){
  var TOKEN = (window.HConf && HConf.cloudflare) || "";   // token par pays via heritage.config.js ; vide = désactivé (aucun beacon)
  if(!TOKEN) return;
  var s=document.createElement('script'); s.defer=true;
  s.src='https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({token:TOKEN}));
  document.head.appendChild(s);
})();
