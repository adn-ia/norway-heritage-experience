/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — formulaire de contribution (sous-app autonome).
   Nominatif (nom + email OBLIGATOIRES). Envoie le signalement (repli) par
   email (config.notifyEmail). Le feed public + commentaires + modération =
   Firebase de la sous-app (étape suivante). Aucune dépendance externe.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  var CFG = window.PAT || {};
  function T(k,v){ return window.PATi18n ? PATi18n.uiT(k,v) : k; }
  function $(id){ return document.getElementById(id); }
  function val(id){ return ($(id) && $(id).value || '').trim(); }
  function okMail(e){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }

  function buildEtat(){
    var opts = [
      ['', 'patrimoine.contrib.etat.choisir'],
      ['Bon', 'patrimoine.etat.bon'],
      ['Moyen', 'patrimoine.etat.moyen'],
      ['Mauvais', 'patrimoine.etat.mauvais'],
      ['Détruit', 'patrimoine.etat.detruit'],
      ['Disparu', 'patrimoine.etat.disparu']
    ];
    $('fEtat').innerHTML = opts.map(function(o){
      return '<option value="'+o[0]+'">'+T(o[1])+'</option>';
    }).join('');
  }

  var PRE = { siteId:'', gov:'' };   // contribution reliée à une fiche existante (sinon vide = site absent)
  function prefill(){
    try{
      var p = new URLSearchParams(location.search);
      if(p.get('nom')) $('fSite').value = p.get('nom');
      if(p.get('etat')) $('fEtat').value = p.get('etat');
      PRE.siteId = p.get('site') || '';
      PRE.gov    = p.get('gov')  || '';
      // Contexte : on améliore une fiche existante → bandeau + on ne renomme pas le site.
      if(PRE.siteId){
        var ctx = $('ctx');
        if(ctx){ ctx.textContent = T('patrimoine.contrib.ctx', { site: (p.get('nom')||'') }); ctx.hidden = false; }
        if($('fSite')) $('fSite').setAttribute('readonly','readonly');
      }
    }catch(e){}
  }

  function submit(e){
    e.preventDefault();
    var prenom = val('fPrenom'), nom = val('fNom'), mail = val('fMail'), obs = val('fObs');
    if(!prenom || !nom || !obs || !okMail(mail)){ $('msg').style.color=''; $('msg').textContent = T('patrimoine.contrib.requis'); return; }
    var data = {
      site: val('fSite') || '', gov: PRE.gov, siteId: PRE.siteId,
      etat: $('fEtat').value || '',
      obs: obs, photoUrl: val('fPhoto') || '', photoCredit: val('fCredit') || '',
      rightsOk: !!($('fRights') && $('fRights').checked),
      prenom: prenom, nom: nom, email: mail
    };
    var btn = $('send');
    // Firebase configuré → feed partagé (soumission → stockée → affichée sur les 3 entités)
    if(window.PatFB && PatFB.ready){
      if(btn) btn.classList.add('off');
      $('msg').style.color=''; $('msg').textContent = T('patrimoine.contrib.envoi');
      PatFB.addSubmission(data).then(function(){
        $('msg').style.color = '#5c7a52'; $('msg').textContent = T('patrimoine.contrib.envoye');
        $('form').reset(); buildEtat();
        if(btn) btn.classList.remove('off');
      }).catch(function(){
        $('msg').style.color=''; $('msg').textContent = T('patrimoine.contrib.erreur');
        if(btn) btn.classList.remove('off');
      });
      return;
    }
    // Repli : mailto (tant que Firebase n'est pas configuré)
    var to = (CFG.notifyEmail||'').trim();
    if(!to){ $('msg').textContent = T('patrimoine.contrib.vide'); return; }
    var site = data.site || '—';
    var etat = $('fEtat').value ? T('patrimoine.etat.'+slug($('fEtat').value)) : '—';
    var subj = T('patrimoine.contrib.mail.sujet', { site: site });
    var body = T('patrimoine.contrib.mail.corps', { site:site, etat:etat, obs:obs, photo:(data.photoUrl||'—'), nom:nom, email:mail });
    location.href = 'mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
  }
  function slug(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }

  function start(){
    buildEtat(); prefill();
    // Bouton actif si Firebase OU mailto dispo ; désactivé seulement si aucun des deux.
    var fbOff = !(window.PatFB && PatFB.ready);
    var mailOff = !(CFG.notifyEmail||'').trim();
    if(fbOff && mailOff){
      var b=$('send'); if(b){ b.classList.add('off'); }
      $('msg').textContent = T('patrimoine.contrib.vide');
    }
    $('form').addEventListener('submit', submit);
  }

  if(window.PATi18n){ PATi18n.boot().then(start); }
  else { document.addEventListener('DOMContentLoaded', start); }
})();
