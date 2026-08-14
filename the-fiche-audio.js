/* the-fiche-audio.js — bouton « 🔊 Écouter » par fiche (voix narrée à la demande).
   MULTILINGUE : lit voix/fiches/<vkey>-<lang>.mp3 selon la langue courante (the_lang),
   un seul à la fois, chargé au clic (JAMAIS précaché).
   Usage : insérer  THEFicheAudio.html(vkey, label)  dans le rendu d'une fiche qui a un texte.
   À inclure : <script src="the-fiche-audio.js" defer></script>. */
(function(){
  var CUR = null, CURKEY = null, CURBTN = null;

  function curLang(){ try{ return localStorage.getItem('the_lang') || 'fr'; }catch(e){ return 'fr'; } }
  function label(b){ return b.getAttribute('data-label') || 'Écouter'; }
  function paint(b, state){ // state: 'idle' | 'play' | 'load' | 'off'
    b.classList.remove('on','loading','fa-off');
    if(state==='play'){ b.classList.add('on'); b.innerHTML = '⏸ ' + label(b); }
    else if(state==='load'){ b.classList.add('loading'); b.innerHTML = '⏳ ' + label(b); }
    else if(state==='off'){ b.classList.add('fa-off'); b.disabled = true; b.innerHTML = '🔇 ' + ((window.uiT&&uiT('fiche.audio.indispo'))||'—'); }
    else { b.innerHTML = '🔊 ' + label(b); }
  }
  function stopCur(){
    if(CUR){ try{ CUR.pause(); }catch(e){} }
    if(CURBTN){ paint(CURBTN,'idle'); }
    CUR = CURKEY = CURBTN = null;
  }
  function play(btn){
    var k = btn.getAttribute('data-vkey'); if(!k) return;
    var uid = k + '|' + curLang();
    if(CURKEY === uid){ stopCur(); return; }         // re-clic sur la même fiche -> STOP
    stopCur();
    var a = new Audio('voix/fiches/' + encodeURIComponent(k) + '-' + curLang() + '.mp3');
    CUR = a; CURKEY = uid; CURBTN = btn; paint(btn,'load');
    a.addEventListener('ended', function(){ stopCur(); });
    a.addEventListener('error', function(){ if(CURKEY === uid){ paint(btn,'off'); CUR = CURKEY = CURBTN = null; } });
    a.play().then(function(){ if(CURKEY === uid) paint(btn,'play'); })
            .catch(function(){ if(CURKEY === uid){ paint(btn,'off'); CUR = CURKEY = CURBTN = null; } });
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('.fa-btn') : null;
    if(b){ e.preventDefault(); e.stopPropagation(); play(b); }
  });
  window.addEventListener('pagehide', stopCur);

  var css = '.fa-btn{display:inline-flex;align-items:center;gap:5px;border:1px solid #a8884f;background:#fff;color:#2b2318;'
    + 'border-radius:16px;padding:5px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;margin-top:8px}'
    + '.fa-btn.on{background:#a8884f;color:#fff}.fa-btn.loading{opacity:.7}'
    + '.fa-btn.fa-off{opacity:.5;border-style:dashed;cursor:default}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function esc(s){ return String(s==null?'':s).replace(/"/g,'&quot;'); }
  window.THEFicheAudio = {
    html: function(vkey, lab){ if(!vkey) return ''; return '<button class="fa-btn" type="button" data-vkey="'+esc(vkey)+'"'
      + (lab ? ' data-label="'+esc(lab)+'"' : '') + '>🔊 ' + (lab || 'Écouter') + '</button>'; },
    stop: stopCur
  };
})();
