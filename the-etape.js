/* the-etape.js — LA MISE EN FORME D'UNE ÉTAPE, REPRISE DU ROAD TRIP DE FOSS.
   Consigne de Helmy : même rendu, mêmes fonctions. Hors Firebase — donc ni
   publication, ni commentaires, ni lien famille : la gamme ne s'en sert pas.

   Le CSS et la structure viennent de `RoadTrip-Generique/index.html`, repris tels
   quels (.photo · .ribbon · .num · .badge-type · .credit · .hdr-cta), avec les
   seules couleurs du road trip remplacées par celles de Heritage. Rien n'est
   réinventé : on réagence ce que le moteur produit déjà, sans y toucher. */
(function(){
  /* Un libellé vient de l'i18n, toujours. Pas de texte français en dur : une
     traduction manquante se corrige dans i18n/, elle ne se rattrape pas ici. */
  function T(cle){
    try{ var s = window.THEi18n && THEi18n.ui && THEi18n.ui(cle); return (s && s!==cle) ? s : ''; }
    catch(e){ return ''; }
  }

  function styler(){
    if(document.getElementById('the-etape-css')) return;
    var st = document.createElement('style'); st.id = 'the-etape-css';
    st.textContent =
      /* la carte d'étape laisse la photo toucher les bords */
      '.stop.et-mise{padding:0;overflow:hidden}' +
      '.stop.et-mise .the-carnet .cn-hero{display:none!important}' +
      /* le bandeau du carnet fait doublon : la photo vit désormais en tête d'étape */
      '.stop.et-mise > *:not(.photo){padding-left:16px;padding-right:16px}' +
      '.stop.et-mise > *:last-child{padding-bottom:15px}' +

      /* ——— repris du road trip, à l'identique ——— */
      '.stop .photo{position:relative;height:200px;background:#e8dcc4 center/cover no-repeat;display:flex;align-items:flex-end}' +
      '.stop .photo .credit{position:absolute;bottom:4px;right:6px;background:rgba(0,0,0,.45);color:#fff;font-size:10px;' +
        'padding:2px 6px;border-radius:4px;text-decoration:none}' +
      '.stop .photo .ribbon{position:relative;z-index:2;margin:0;padding:14px 16px;width:100%;' +
        'background:linear-gradient(transparent,rgba(28,20,12,.86));color:#fff}' +
      '.stop .ribbon .num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;' +
        'font-weight:700;font-size:14px;margin-right:8px;vertical-align:middle;background:#a8884f;color:#fff}' +
      '.stop .ribbon h3{font-family:\'Cormorant Garamond\',serif;font-weight:700;font-size:22px;margin:0;display:inline;color:#fff}' +
      '.stop .ribbon .sub{font-size:13.5px;color:#e6dcc8;margin-top:5px}' +
      '.stop .badge-type{font-size:11px;font-weight:700;letter-spacing:1px;padding:3px 9px;border-radius:20px;' +
        'color:#fff;margin-left:6px;vertical-align:middle;background:#8a6d3a}' +
      '.stop .hdr-cta{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:3;' +
        'background:rgba(255,253,248,.93);border:1px dashed #a8884f;color:#6b5230;border-radius:20px;' +
        'padding:11px 18px;min-height:44px;font:inherit;font-size:14px;cursor:pointer}' +
      '.stop .hdr-cta:hover{background:#fffdf8}' +
      /* la date, posée par the-dates.js, se lit sur le bandeau */
      '.stop .ribbon .the-date{margin:6px 0 0}' +
      '.stop .ribbon .the-date-b{background:rgba(255,253,248,.92);border-color:transparent;color:#4a3a26}' +
      '@media(max-width:520px){.stop .photo{height:170px}.stop .ribbon h3{font-size:20px}}';
    document.head.appendChild(st);
  }

  /* PAS DE CRÉDIT SUR LE CARRÉ D'EN-TÊTE.
     Le bandeau n'affiche jamais une photo de Wikimedia : il montre la photo que
     le voyageur a mise lui-même, ou rien. Le crédit du lieu, recopié là, laissait
     donc lire « Wikipedia · CC BY-SA » sur une photo personnelle. L'attribution
     reste sur les fiches (index.html), là où la photo sous licence s'affiche
     vraiment — l'obligation CC BY est tenue là et pas ailleurs. */

  function agencer(stop){
    if(stop.classList.contains('et-mise')) return;
    var head = stop.querySelector('.head'); if(!head) return;

    var idx = head.querySelector('.idx'),
        nm  = head.querySelector('.nm'),
        sub = head.querySelector('.sub'),
        bdg = head.querySelector('.badge');

    var photo = document.createElement('div'); photo.className = 'photo';
    var ribbon = document.createElement('div'); ribbon.className = 'ribbon';

    if(idx){ idx.classList.add('num'); ribbon.appendChild(idx); }
    if(nm){
      var h3 = document.createElement('h3'); h3.innerHTML = nm.innerHTML;
      ribbon.appendChild(h3);
      if(bdg){ bdg.classList.add('badge-type'); ribbon.appendChild(bdg); }
      nm.remove();
    }
    if(sub) ribbon.appendChild(sub);

    photo.appendChild(ribbon);

    stop.insertBefore(photo, stop.firstChild);
    head.remove();
    stop.classList.add('et-mise');
    remplir(stop);
  }

  /* la photo de l'étape vient du carnet ; sans elle, on invite à en poser une */
  function remplir(stop){
    var photo = stop.querySelector('.photo'); if(!photo) return;
    var carnet = stop.querySelector('.the-carnet');
    var src = carnet ? carnet.querySelector('.cn-hero') : null;
    var fond = src ? (src.style.backgroundImage || '') : '';

    if(fond && fond !== 'none'){
      photo.style.backgroundImage = fond;
      var v = photo.querySelector('.hdr-cta'); if(v) v.remove();
    } else if(!photo.querySelector('.hdr-cta')){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'hdr-cta';
      b.textContent = '📷 ' + T('carnet.photo.en.tete');
      /* CE BOUTON OUVRE LE SÉLECTEUR D'EN-TÊTE, PAS LE GESTIONNAIRE.
         Il retombait sur THECarnet.open() — la fenêtre des médias déjà rangés sous
         l'étape — au lieu d'ouvrir la photothèque de l'appareil. C'est la fenêtre
         que Helmy voyait revenir. panneauEnTete() offre Galerie et Photo comme
         vrais champs de fichier : le sélecteur natif s'ouvre, même sur une étape
         qui n'a encore aucune image. */
      b.onclick = function(){
        var place = carnet ? (carnet.getAttribute('data-place')||'') : '';
        var nom   = carnet ? (carnet.getAttribute('data-nom')||'') : '';
        if(!place || !window.THECarnet) return;
        if(THECarnet.panneauEnTete) THECarnet.panneauEnTete(place, nom);
        else if(THECarnet.enTete) THECarnet.enTete(place, nom);
      };
      photo.appendChild(b);
    }
  }

  function passer(){
    var l = document.querySelectorAll('.stop');
    for(var i=0;i<l.length;i++){ agencer(l[i]); remplir(l[i]); }
  }
  function demarrer(){
    styler(); passer();
    try{ new MutationObserver(function(){ passer(); })
      .observe(document.getElementById('stops') || document.body, {childList:true, subtree:true}); }catch(e){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
