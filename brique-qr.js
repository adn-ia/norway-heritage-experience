/* ============================================================
   BRIQUE SOCLE — « Donner un itinéraire par QR »        (auto-portée)
   ------------------------------------------------------------
   Un itinéraire se donne à un ami : il scanne, il reçoit SA copie, il y met
   ses photos et modifie ce qu'il veut. Rien n'est partagé au sens d'un
   compte commun — il n'y a ni serveur ni synchronisation, et il n'en faut
   pas : le code porte l'itinéraire LUI-MÊME, et l'adresse qu'il contient
   ouvre l'application (ou propose de l'installer) chez celui qui scanne.

   • Auto-portée : embarque son encodeur QR et tous ses libellés. Aucune
     dépendance à l'hôte, aucun réseau, aucune bibliothèque extérieure.
   • Générique : ne nomme aucun pays, ne lit aucune donnée de pays.
   • i18n auto-portée : langue décidée par l'hôte (localStorage 'the_lang'),
     repli anglais si la langue manque dans SA donnée.
   • LIMITE ASSUMÉE ET DITE : un QR ne tient qu'une quantité finie. Au-delà
     d'une certaine longueur d'itinéraire, le code devient trop dense pour se
     scanner d'un écran à l'autre. La brique le mesure et le DIT, au lieu
     d'afficher un code que personne n'arrivera à lire.

   Usage :  HQR.ouvrir({ url:'https://…', titre:'Cap Bon', etapes:6 })
   ============================================================ */
(function () {
  "use strict";

  /* ---- Encodeur QR, mode octet, niveaux L et M, versions 1 à 40 --------------
     Les deux tables ci-dessous (découpage en blocs Reed-Solomon, positions des
     motifs d'alignement) sont EXTRAITES d'une implémentation de référence, pas
     recopiées à la main : une seule valeur fausse rendrait le code illisible. */
  var RS = {
    L: [[[1,26,19]],[[1,44,34]],[[1,70,55]],[[1,100,80]],[[1,134,108]],[[2,86,68]],[[2,98,78]],[[2,121,97]],[[2,146,116]],[[2,86,68],[2,87,69]],[[4,101,81]],[[2,116,92],[2,117,93]],[[4,133,107]],[[3,145,115],[1,146,116]],[[5,109,87],[1,110,88]],[[5,122,98],[1,123,99]],[[1,135,107],[5,136,108]],[[5,150,120],[1,151,121]],[[3,141,113],[4,142,114]],[[3,135,107],[5,136,108]],[[4,144,116],[4,145,117]],[[2,139,111],[7,140,112]],[[4,151,121],[5,152,122]],[[6,147,117],[4,148,118]],[[8,132,106],[4,133,107]],[[10,142,114],[2,143,115]],[[8,152,122],[4,153,123]],[[3,147,117],[10,148,118]],[[7,146,116],[7,147,117]],[[5,145,115],[10,146,116]],[[13,145,115],[3,146,116]],[[17,145,115]],[[17,145,115],[1,146,116]],[[13,145,115],[6,146,116]],[[12,151,121],[7,152,122]],[[6,151,121],[14,152,122]],[[17,152,122],[4,153,123]],[[4,152,122],[18,153,123]],[[20,147,117],[4,148,118]],[[19,148,118],[6,149,119]]],
    M: [[[1,26,16]],[[1,44,28]],[[1,70,44]],[[2,50,32]],[[2,67,43]],[[4,43,27]],[[4,49,31]],[[2,60,38],[2,61,39]],[[3,58,36],[2,59,37]],[[4,69,43],[1,70,44]],[[1,80,50],[4,81,51]],[[6,58,36],[2,59,37]],[[8,59,37],[1,60,38]],[[4,64,40],[5,65,41]],[[5,65,41],[5,66,42]],[[7,73,45],[3,74,46]],[[10,74,46],[1,75,47]],[[9,69,43],[4,70,44]],[[3,70,44],[11,71,45]],[[3,67,41],[13,68,42]],[[17,68,42]],[[17,74,46]],[[4,75,47],[14,76,48]],[[6,73,45],[14,74,46]],[[8,75,47],[13,76,48]],[[19,74,46],[4,75,47]],[[22,73,45],[3,74,46]],[[3,73,45],[23,74,46]],[[21,73,45],[7,74,46]],[[19,75,47],[10,76,48]],[[2,74,46],[29,75,47]],[[10,74,46],[23,75,47]],[[14,74,46],[21,75,47]],[[14,74,46],[23,75,47]],[[12,75,47],[26,76,48]],[[6,75,47],[34,76,48]],[[29,74,46],[14,75,47]],[[13,74,46],[32,75,47]],[[40,75,47],[7,76,48]],[[18,75,47],[31,76,48]]]
  };
  var ALIGN = [[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]];

  /* Corps fini GF(256), polynôme primitif 0x11d — celui de la norme QR. */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function(){ var x=1; for(var i=0;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&0x100) x^=0x11d; }
               for(var j=255;j<512;j++) EXP[j]=EXP[j-255]; })();
  function mul(a,b){ return (a===0||b===0) ? 0 : EXP[LOG[a]+LOG[b]]; }

  function genPoly(n){                         // polynôme générateur de degré n
    var g=[1];
    for(var i=0;i<n;i++){
      var nv=new Array(g.length+1).fill(0);
      for(var j=0;j<g.length;j++){ nv[j]^=mul(g[j],1); nv[j+1]^=mul(g[j],EXP[i]); }
      g=nv;
    }
    return g;
  }
  function ecBytes(data, n){                   // octets de correction d'un bloc
    var g=genPoly(n), res=data.slice().concat(new Array(n).fill(0));
    for(var i=0;i<data.length;i++){
      var c=res[i]; if(!c) continue;
      for(var j=0;j<g.length;j++) res[i+j]^=mul(g[j],c);
    }
    return res.slice(data.length);
  }

  function utf8(s){
    var out=[], e=encodeURIComponent(s);
    for(var i=0;i<e.length;i++){
      if(e[i]==='%'){ out.push(parseInt(e.substr(i+1,2),16)); i+=2; }
      else out.push(e.charCodeAt(i));
    }
    return out;
  }

  function capacite(v, ec){                    // octets de DONNÉES disponibles
    var t=RS[ec][v-1], n=0;
    for(var i=0;i<t.length;i++) n+=t[i][0]*t[i][2];
    return n;
  }

  function motsDeCode(octets, v, ec){
    var lenBits = v<10 ? 8 : 16, bits=[];
    function push(val,len){ for(var i=len-1;i>=0;i--) bits.push((val>>i)&1); }
    push(4,4);                                 // 0100 = mode octet
    push(octets.length, lenBits);
    for(var i=0;i<octets.length;i++) push(octets[i],8);
    var capBits=capacite(v,ec)*8;
    for(var t=0;t<4 && bits.length<capBits;t++) bits.push(0);      // terminateur
    while(bits.length%8) bits.push(0);
    var mots=[];
    for(var k=0;k<bits.length;k+=8){
      var o=0; for(var j=0;j<8;j++) o=(o<<1)|bits[k+j];
      mots.push(o);
    }
    var pad=[0xEC,0x11], p=0;
    while(mots.length<capacite(v,ec)) mots.push(pad[p++%2]);

    /* Blocs, correction, puis ENTRELACEMENT : c'est l'entrelacement raté qui
       produit un code d'apparence normale et pourtant illisible. */
    var blocs=[], ecb=[], pos=0, ecLen=0, t2=RS[ec][v-1];
    for(var gi=0; gi<t2.length; gi++){
      var nb=t2[gi][0], total=t2[gi][1], data=t2[gi][2];
      ecLen = total-data;
      for(var bi=0; bi<nb; bi++){
        var d=mots.slice(pos,pos+data); pos+=data;
        blocs.push(d); ecb.push(ecBytes(d, ecLen));
      }
    }
    var maxD=0; for(var a=0;a<blocs.length;a++) maxD=Math.max(maxD,blocs[a].length);
    var sortie=[];
    for(var c=0;c<maxD;c++) for(var b=0;b<blocs.length;b++) if(c<blocs[b].length) sortie.push(blocs[b][c]);
    for(var c2=0;c2<ecLen;c2++) for(var b2=0;b2<ecb.length;b2++) if(c2<ecb[b2].length) sortie.push(ecb[b2][c2]);
    return sortie;
  }

  /* --- Trame ---------------------------------------------------------------
     Convention : null = case libre (donnée à venir), 2 = case réservée au
     format ou à la version. Tout le reste (0/1) est un motif fixe. */
  function poserMotifs(m, v){
    var n=m.length, i, j, k;
    function finder(r,c){
      for(i=-1;i<=7;i++) for(j=-1;j<=7;j++){
        var y=r+i, x=c+j; if(y<0||x<0||y>=n||x>=n) continue;
        var d=(i>=0&&i<=6&&(j===0||j===6)) || (j>=0&&j<=6&&(i===0||i===6)) || (i>=2&&i<=4&&j>=2&&j<=4);
        m[y][x]=d?1:0;
      }
    }
    finder(0,0); finder(0,n-7); finder(n-7,0);
    for(i=8;i<n-8;i++){ var d2=(i%2===0)?1:0; m[6][i]=d2; m[i][6]=d2; }         // timing
    var pos=ALIGN[v-1];
    for(var a=0;a<pos.length;a++) for(var b=0;b<pos.length;b++){
      var r=pos[a], c=pos[b];
      if((r<=7&&c<=7)||(r<=7&&c>=n-8)||(r>=n-8&&c<=7)) continue;               // sous un finder
      for(var y=-2;y<=2;y++) for(var x=-2;x<=2;x++)
        m[r+y][c+x] = (Math.abs(y)===2||Math.abs(x)===2||(y===0&&x===0)) ? 1 : 0;
    }
    for(k=0;k<9;k++){ if(m[8][k]===null) m[8][k]=2; if(m[k][8]===null) m[k][8]=2; }
    for(k=0;k<8;k++){ if(m[8][n-1-k]===null) m[8][n-1-k]=2; if(m[n-1-k][8]===null) m[n-1-k][8]=2; }
    m[n-8][8]=2;                                                               // module noir obligatoire
    if(v>=7) for(i=0;i<6;i++) for(j=0;j<3;j++){ m[i][n-11+j]=2; m[n-11+j][i]=2; }
  }

  function masque(i,j,k){
    switch(k){
      case 0: return (i+j)%2===0;
      case 1: return i%2===0;
      case 2: return j%3===0;
      case 3: return (i+j)%3===0;
      case 4: return (Math.floor(i/2)+Math.floor(j/3))%2===0;
      case 5: return ((i*j)%2)+((i*j)%3)===0;
      case 6: return (((i*j)%2)+((i*j)%3))%2===0;
      default:return (((i+j)%2)+((i*j)%3))%2===0;
    }
  }

  /* Remplissage en zigzag, masque appliqué au vol : seules les cases LIBRES
     reçoivent une donnée, donc seules elles sont masquées. */
  function poserDonnees(m, mots, k){
    var n=m.length, inc=-1, row=n-1, bitIndex=7, byteIndex=0;
    for(var col=n-1; col>0; col-=2){
      if(col===6) col--;                       // la colonne de timing ne porte rien
      while(true){
        for(var c=0;c<2;c++){
          if(m[row][col-c]===null){
            var sombre = byteIndex<mots.length ? ((mots[byteIndex]>>>bitIndex)&1)===1 : false;
            if(masque(row, col-c, k)) sombre=!sombre;
            m[row][col-c]= sombre?1:0;
            bitIndex--; if(bitIndex===-1){ byteIndex++; bitIndex=7; }
          }
        }
        row+=inc;
        if(row<0 || row>=n){ row-=inc; inc=-inc; break; }
      }
    }
  }

  var G15=0x537, G15_MASK=0x5412, G18=0x1f25;
  function bch(v, g){
    var gb=0, x=g; while(x){ gb++; x>>=1; }
    var t=v<<(gb-1);
    while(true){ var tb=0, y=t; while(y){ tb++; y>>=1; } if(tb<gb) break; t ^= g<<(tb-gb); }
    return (v<<(gb-1))|t;
  }
  function poserFormat(m, ec, k){
    var n=m.length, val=bch((({L:1,M:0,Q:3,H:2})[ec]<<3)|k, G15)^G15_MASK, i;
    for(i=0;i<15;i++){
      var b=(val>>i)&1;
      if(i<6) m[i][8]=b; else if(i<8) m[i+1][8]=b; else m[n-15+i][8]=b;
    }
    for(i=0;i<15;i++){
      var b2=(val>>i)&1;
      if(i<8) m[8][n-1-i]=b2; else if(i<9) m[8][15-i]=b2; else m[8][14-i]=b2;
    }
    m[n-8][8]=1;
  }
  function poserVersion(m, v){
    if(v<7) return;
    var n=m.length, val=bch(v,G18);
    for(var i=0;i<18;i++){
      var b=(val>>i)&1;
      m[Math.floor(i/3)][n-11+(i%3)]=b;
      m[n-11+(i%3)][Math.floor(i/3)]=b;
    }
  }

  function penalite(m){
    var n=m.length, p=0, i, j, k;
    for(i=0;i<n;i++){                          // 1 — suites de 5 modules ou plus
      var cr=1, cc=1;
      for(j=1;j<n;j++){
        cr = (m[i][j]===m[i][j-1]) ? cr+1 : 1; if(cr===5) p+=3; else if(cr>5) p+=1;
        cc = (m[j][i]===m[j-1][i]) ? cc+1 : 1; if(cc===5) p+=3; else if(cc>5) p+=1;
      }
    }
    for(i=0;i<n-1;i++) for(j=0;j<n-1;j++){     // 2 — blocs 2×2 uniformes
      var v=m[i][j];
      if(v===m[i][j+1] && v===m[i+1][j] && v===m[i+1][j+1]) p+=3;
    }
    var A=[1,0,1,1,1,0,1,0,0,0,0], B=[0,0,0,0,1,0,1,1,1,0,1];
    function suite(get){                       // 3 — faux motif de repérage
      for(var a=0;a<n;a++) for(var b=0;b+10<n;b++){
        var okA=true, okB=true;
        for(var c=0;c<11;c++){ var val=get(a,b+c); if(val!==A[c]) okA=false; if(val!==B[c]) okB=false; }
        if(okA) p+=40; if(okB) p+=40;
      }
    }
    suite(function(a,b){ return m[a][b]; });
    suite(function(a,b){ return m[b][a]; });
    var noirs=0;                               // 4 — écart à 50 % de sombre
    for(i=0;i<n;i++) for(j=0;j<n;j++) if(m[i][j]) noirs++;
    p += Math.floor(Math.abs(noirs*100/(n*n)-50)/5)*10;
    return p;
  }

  /* Rend la trame d'un texte, ou null s'il ne tient dans aucune version. */
  function trame(texte, ecVoulu){
    var oct=utf8(texte), ordre = ecVoulu ? [ecVoulu] : ['M','L'];
    for(var e=0;e<ordre.length;e++){
      var ec=ordre[e];
      for(var v=1;v<=40;v++){
        var lenBits = v<10 ? 8 : 16;
        if(capacite(v,ec)*8 < 4+lenBits+8*oct.length) continue;
        var n=17+4*v, base=[];
        for(var r=0;r<n;r++) base.push(new Array(n).fill(null));
        poserMotifs(base, v);
        var mots=motsDeCode(oct, v, ec);
        var best=null, bestP=Infinity, bestK=0;
        for(var k=0;k<8;k++){                  // les huit masques, on garde le moins pénalisé
          var m=[]; for(var y=0;y<n;y++) m.push(base[y].slice());
          poserDonnees(m, mots, k);
          poserFormat(m, ec, k); poserVersion(m, v);
          var p=penalite(m);
          if(p<bestP){ bestP=p; best=m; bestK=k; }
        }
        return { size:n, version:v, ec:ec, mask:bestK, matrice:best,
                 get:function(r,c){ return best[r][c]===1; } };
      }
    }
    return null;
  }

  /* ---- Données de langue -------------------------------------------------- */
  var I18N=null, LOADING=null;
  /* la langue de la PAGE avant l'anglais : sans cela, un premier visiteur
     français voyait cette brique en anglais. */
  function langue(){ var l='';
    try{ l=(localStorage.getItem('the_lang')||'').slice(0,2); }catch(e){}
    if(!l){ try{ l=(document.documentElement.lang||'').slice(0,2); }catch(e){} }
    return l || 'en'; }
  function load(){
    if(LOADING) return LOADING;
    LOADING = fetch('brique-qr.data.json',{cache:'no-cache'})
      .then(function(r){ return r.json(); })
      .then(function(j){ I18N=j||{}; })
      .catch(function(){ I18N={}; });
    return LOADING;
  }
  function L(k){ var d=(I18N && (I18N[langue()]||I18N.en))||{}; return d[k]||''; }

  /* ---- Dessin ------------------------------------------------------------- */
  function dessiner(cv, t, cote){
    var q=4, n=t.size, px=Math.max(2, Math.floor(cote/(n+2*q))), taille=(n+2*q)*px;
    cv.width=taille; cv.height=taille;
    cv.style.width='100%'; cv.style.maxWidth=taille+'px'; cv.style.height='auto';
    var g=cv.getContext('2d');
    /* Fond blanc franc et modules noirs : un lecteur a besoin de contraste, on
       ne colorise donc JAMAIS un QR aux teintes de l'application. */
    g.fillStyle='#fff'; g.fillRect(0,0,taille,taille);
    g.fillStyle='#000';
    for(var r=0;r<n;r++) for(var c=0;c<n;c++)
      if(t.matrice[r][c]===1) g.fillRect((c+q)*px,(r+q)*px,px,px);
  }

  /* ---- Fenêtre ------------------------------------------------------------ */
  function styles(){
    if(document.getElementById('hqr-css')) return;
    var s=document.createElement('style'); s.id='hqr-css';
    s.textContent =
      '.hqr-fond{position:fixed;inset:0;background:rgba(28,24,18,.62);display:flex;align-items:center;justify-content:center;z-index:9999;padding:18px}'+
      '.hqr-boite{background:#fffdf8;border-radius:14px;max-width:420px;width:100%;max-height:92vh;overflow:auto;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.3)}'+
      '.hqr-tete{display:flex;align-items:flex-start;gap:10px;margin-bottom:4px}'+
      '.hqr-tete h3{margin:0;font-size:18px;color:#4b3f2a;flex:1;font-weight:600}'+
      '.hqr-x{background:none;border:none;font-size:26px;line-height:1;cursor:pointer;color:#8a7c66;padding:0 4px}'+
      '.hqr-nom{font-size:15px;color:#6b5a39;margin:2px 0 14px}'+
      '.hqr-cv{display:block;margin:0 auto;border-radius:6px}'+
      '.hqr-dit{font-size:14px;line-height:1.65;color:#6b5a39;margin:14px 0 0}'+
      '.hqr-alerte{font-size:14px;line-height:1.6;color:#7a4a2a;background:#fbf2ec;border:1px dashed #e0cdb8;border-radius:8px;padding:10px 12px;margin:14px 0 0}'+
      '.hqr-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}'+
      '.hqr-b{border:1px solid #e3d8c4;background:#fff;border-radius:8px;padding:9px 14px;font:inherit;font-size:14px;cursor:pointer;color:#6b5a39}';
    document.head.appendChild(s);
  }

  function fermer(){ var f=document.querySelector('.hqr-fond'); if(f&&f.parentNode) f.parentNode.removeChild(f); }

  function ouvrir(opts){
    opts=opts||{};
    var url=String(opts.url||''); if(!url) return;
    load().then(function(){
      styles(); fermer();
      var t=trame(url,null);

      var fond=document.createElement('div'); fond.className='hqr-fond';
      var boite=document.createElement('div'); boite.className='hqr-boite';
      fond.appendChild(boite);

      var tete=document.createElement('div'); tete.className='hqr-tete';
      var h=document.createElement('h3'); h.textContent=L('titre'); tete.appendChild(h);
      var x=document.createElement('button'); x.type='button'; x.className='hqr-x';
      x.setAttribute('aria-label', L('fermer')); x.textContent='×'; x.onclick=fermer;
      tete.appendChild(x); boite.appendChild(tete);

      if(opts.titre){ var nm=document.createElement('div'); nm.className='hqr-nom';
        nm.textContent=opts.titre; boite.appendChild(nm); }

      if(t){
        var cv=document.createElement('canvas'); cv.className='hqr-cv';
        dessiner(cv, t, 320); boite.appendChild(cv);
        var dit=document.createElement('p'); dit.className='hqr-dit'; dit.textContent=L('explique');
        boite.appendChild(dit);
        /* Un code trop dense se scanne mal d'un écran à l'autre : on préfère le
           dire que laisser quelqu'un s'acharner sur un code illisible. */
        if(t.version>14){ var al=document.createElement('div'); al.className='hqr-alerte';
          al.textContent=L('dense'); boite.appendChild(al); }
      } else {
        var ko=document.createElement('div'); ko.className='hqr-alerte';
        ko.textContent=L('trop.long'); boite.appendChild(ko);
      }

      var act=document.createElement('div'); act.className='hqr-actions';
      var cop=document.createElement('button'); cop.type='button'; cop.className='hqr-b';
      cop.textContent=L('copier');
      cop.onclick=function(){
        if(navigator.clipboard && navigator.clipboard.writeText)
          navigator.clipboard.writeText(url).then(function(){ cop.textContent=L('copie'); },
                                                  function(){ prompt(L('copier'), url); });
        else prompt(L('copier'), url);
      };
      act.appendChild(cop);
      if(navigator.share){
        var env=document.createElement('button'); env.type='button'; env.className='hqr-b';
        env.textContent=L('envoyer');
        env.onclick=function(){ navigator.share({title:opts.titre||'', url:url}).catch(function(){}); };
        act.appendChild(env);
      }
      boite.appendChild(act);

      fond.addEventListener('click', function(e){ if(e.target===fond) fermer(); });
      document.body.appendChild(fond);
    });
  }

  window.HQR = { ouvrir:ouvrir, fermer:fermer, trame:trame };
})();
