GABARIT (Android TWA / Digital Asset Links). PAR-APP — à remplir au clonage puis déployer
à https://<domaine>/.well-known/assetlinks.json :
  __PACKAGE_NAME__            ex. com.thresholdanalytics.heritage.<pays>
  __SHA256_PWABUILDER__       empreinte SHA-256 du certificat PWABuilder
  __SHA256_PLAY_APP_SIGNING__ empreinte SHA-256 de Google Play App Signing (Play Console
                              → App integrity → App signing). GARDER LES DEUX, sinon la TWA
                              affiche la barre Chrome en prod.
(iOS : si besoin d'universal links, ajouter aussi apple-app-site-association ici.)
