/* the-adresse.js — DÉPART SAISI À LA MAIN, géocodé par OpenStreetMap (Nominatim).
   Raison d'être : on prépare son voyage AVANT de partir. Demander le GPS n'a alors
   aucun sens — et en revue Apple le refuse toujours, ce qui figeait l'écran.
   Règle posée par Helmy : soit la position vient d'une adresse OpenStreetMap,
   soit l'utilisateur appuie lui-même sur « Ma position (GPS) ». Jamais par défaut.

   Auto-porté : aucune dépendance à l'hôte. S'installe seul, se tait s'il ne trouve
   pas ses ancrages, n'écrase rien. Expose window.THEadresseDepart() -> Promise.
   Résout {coord:[lon,lat], label:"…"} ou null — JAMAIS en attente. */
(function(){
  /* Un libellé vient de l'i18n, toujours. Pas de texte français en dur : une
     traduction manquante se corrige dans i18n/, elle ne se rattrape pas ici. */
  function T(cle){
    try{ var s = window.THEi18n && THEi18n.ui && THEi18n.ui(cle); return (s && s!==cle) ? s : ''; }
    catch(e){ return ''; }
  }
  function iso(){
    try{ return String((window.HConf && (HConf.iso || HConf.pays_iso)) || '').toLowerCase(); }catch(e){ return ''; }
  }

  var sel, champ, msg, dernier = null;   // dernier résultat trouvé, pour ne pas re-chercher

  function dire(txt, erreur){
    if(!msg) return;
    msg.textContent = txt || '';
    msg.style.display = txt ? 'block' : 'none';
    msg.style.color = erreur ? '#a8442f' : '';
  }

  /* Géocodage. Toujours résolu : en cas d'échec, on rend null et on le dit. */
  function chercher(texte){
    var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=0'
            + '&q=' + encodeURIComponent(texte)
            + (iso() ? '&countrycodes=' + iso() : '');
    return new Promise(function(res){
      var fini = false;
      var garde = setTimeout(function(){ if(!fini){ fini=true; res(null); } }, 8000);
      fetch(url, { headers:{ 'Accept':'application/json' } })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(j){
          if(fini) return; fini = true; clearTimeout(garde);
          if(!j || !j.length){ res(null); return; }
          res({ coord:[parseFloat(j[0].lon), parseFloat(j[0].lat)],
                label:String(j[0].display_name||texte).split(',').slice(0,2).join(',').trim() });
        })
        .catch(function(){ if(!fini){ fini=true; clearTimeout(garde); res(null); } });
    });
  }

  /* Appelé par itineraire.html quand le départ vaut 'adr'. */
  window.THEadresseDepart = function(){
    var texte = (champ && champ.value || '').trim();
    if(!texte){
      dire(T('itin.adresse.vide'), true);
      if(champ) champ.focus();
      return Promise.resolve(null);
    }
    if(dernier && dernier.texte === texte) return Promise.resolve(dernier.res);
    dire(T('itin.adresse.recherche'), false);
    return chercher(texte).then(function(r){
      dernier = { texte:texte, res:r };
      dire(r ? '📍 ' + r.label
             : T('itin.adresse.introuvable'),
           !r);
      return r;
    });
  };

  function poser(){
    sel   = document.getElementById('origin');
    champ = document.getElementById('originAdr');
    msg   = document.getElementById('originAdrMsg');
    if(!sel || !champ) return false;                      // pas nos ancrages : on se tait

    if(!sel.querySelector('option[value="adr"]')){
      var o = document.createElement('option');
      o.value = 'adr';
      o.textContent = T('itin.depart.adresse');
      var gps = sel.querySelector('option[value="gps"]');
      if(gps && gps.nextSibling) sel.insertBefore(o, gps.nextSibling); else sel.appendChild(o);
    }
    champ.placeholder = T('itin.adresse.exemple');

    function refletSelection(){
      var estAdr = sel.value === 'adr';
      champ.style.display = estAdr ? 'block' : 'none';
      if(!estAdr) dire('');
      if(estAdr) setTimeout(function(){ try{ champ.focus(); }catch(e){} }, 40);
    }
    sel.addEventListener('change', refletSelection);
    champ.addEventListener('input', function(){ dernier = null; dire(''); });
    champ.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); window.THEadresseDepart(); } });
    refletSelection();
    return true;
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poser);
  else poser();
})();
