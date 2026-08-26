/* the-retour.js — LE CHEMIN DU RETOUR, quand une page en ouvre une autre.
   « Voir sur la grande carte » emmenait sur index.html?route=… sans jamais offrir
   de revenir : l'itinéraire était sauvegardé, le drapeau de retour posé, mais aucun
   bouton ne le déclenchait. Dans une application installée il n'y a pas de bouton
   « précédent » : on restait sur la carte, l'itinéraire hors d'atteinte.

   Ce module pose le bouton manquant. Il ne s'affiche QUE si l'on vient vraiment
   d'ailleurs — jamais en entrée directe. Auto-porté, aucune dépendance à l'hôte. */
(function(){
  /* Un libellé vient de l'i18n, toujours. Pas de texte français en dur : une
     traduction manquante se corrige dans i18n/, elle ne se rattrape pas ici. */
  function T(cle){
    try{ var s = window.THEi18n && THEi18n.ui && THEi18n.ui(cle); return (s && s!==cle) ? s : ''; }
    catch(e){ return ''; }
  }
  function param(n){ try{ return new URLSearchParams(location.search).get(n); }catch(e){ return null; } }
  function drapeau(){ try{ return sessionStorage.getItem('the_return'); }catch(e){ return null; } }

  /* D'où vient-on, et où renvoie-t-on ? Rien d'inventé : on lit ce que la page
     d'origine a laissé derrière elle. */
  function destination(){
    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if(page === 'index.html' || page === '') {
      if(param('route') || drapeau()) return { url:'itineraire.html', txt:T('retour.itineraire') };
      if(param('from') === 'itineraire') return { url:'itineraire.html', txt:T('retour.itineraire') };
    }
    return null;
  }

  function poser(){
    var d = destination(); if(!d) return;
    if(document.getElementById('the-retour')) return;

    var s = document.createElement('style');
    s.textContent =
      '#the-retour{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));' +
        'z-index:3500;background:#2b2318;color:#f6f0e4;border:none;border-radius:22px;' +
        'padding:12px 20px;font:15px/1.4 Georgia,serif;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.35)}' +
      '#the-retour:hover{background:#3a2f20}';
    document.head.appendChild(s);

    var b = document.createElement('button');
    b.id = 'the-retour'; b.type = 'button'; b.textContent = d.txt;
    b.onclick = function(){ location.href = d.url; };
    document.body.appendChild(b);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poser);
  else poser();
})();
