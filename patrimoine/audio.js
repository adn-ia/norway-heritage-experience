/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — narration audio (sous-app autonome).
   MP3 INCLUS (gratuit). Convention de fichier PROPRE à la sous-app :
     voix/<id>-<lang>.mp3   (id = identifiant INP ; lang = langue courante)
   Le bouton d'écoute n'apparaît QUE si le MP3 existe (les fichiers voix sont
   produits au fil de l'enrichissement des récits). Un seul lecteur à la fois.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  function lang(){ return window.PATi18n ? PATi18n.lang() : 'fr'; }
  function url(id){ return 'voix/' + encodeURIComponent(id) + '-' + lang() + '.mp3'; }
  var cur = null;
  function stop(){ if(cur){ try{ cur.a.pause(); }catch(e){} if(cur.btn) cur.btn.classList.remove('on'); cur=null; } }
  function play(btn, id){
    if(cur && cur.btn===btn){ stop(); return; }
    stop();
    var a = new Audio(url(id)); cur = { a:a, btn:btn }; btn.classList.add('on');
    a.play().catch(function(){ stop(); });
    a.addEventListener('ended', stop);
    a.addEventListener('error', stop);
  }
  window.PATAudio = {
    // Ajoute un bouton lecture dans `slot` SI un MP3 existe pour ce site.
    mount: function(slot, id, label){
      if(!slot || id==null || id==='') return;
      try{
        fetch(url(id), { method:'HEAD' }).then(function(r){
          if(!r.ok) return;
          var b = document.createElement('button');
          b.className = 'fa-btn'; b.type='button'; b.textContent = '🔊 ' + label;
          b.addEventListener('click', function(){ play(b, id); });
          slot.appendChild(b);
        }).catch(function(){});
      }catch(e){}
    },
    stop: stop
  };
})();
