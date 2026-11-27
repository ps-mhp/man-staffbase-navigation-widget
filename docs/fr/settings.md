# Paramètres

La navigation comporte deux paramètres : le point de départ et **Sticky**. Les deux
sont gérés dans la fenêtre **Sélectionner le point de départ**. Dans la boîte de dialogue des paramètres elle-même, seul le
bouton permettant de l'ouvrir est présent.

| Paramètre | Description |
| --- | --- |
| Point de départ dans le menu (arborescence à gauche) | L'élément de menu affiché dans la barre de gauche ; ses sous-éléments apparaissent à droite. Obligatoire. L'arborescence affiche le menu de l'application : des dossiers indiquant le nombre de leurs sous-éléments, des pages, ainsi que des éléments de menu masqués dans le menu, signalés par un œil barré. Seuls les éléments de menu comportant des sous-éléments peuvent être sélectionnés ; les pages sans sous-éléments servent uniquement à l’orientation. Le champ de recherche situé au-dessus permet de trouver des éléments de menu en fonction de leur titre. Le point de départ sélectionné est mis en surbrillance et porte la mention « Point de départ » dans sa ligne inférieure. |
| Saisir l’ID ou l’adresse | En bas à gauche. Nécessaire uniquement si l’option de menu manque dans l’arborescence ou si le menu ne se charge pas : saisissez l’adresse complète de la page ou l’ID à 24 chiffres, puis cliquez sur **Définir comme point de départ**. Le widget lit lui-même l’ID. |
| Sticky (à droite, comportement) | Par défaut : activé. Lorsque la barre atteint le menu principal lors du défilement, elle reste en place en dessous au lieu de sortir de l’écran — la navigation reste ainsi accessible même en bas de la page. Désactivé : la barre défile avec la page. Dans le Studio et dans l’aperçu de la fenêtre, elle reste toujours à sa place. |

L’ordre, le titre et la visibilité des entrées proviennent du menu de l’application
et y sont gérés, et non dans le widget.

## Remarques

- **Appliquer** n’est possible que si une modification a été effectuée et qu’un
  point de départ a été sélectionné. Sinon, la barre d’état en haut indique ce qui manque.
- **Appliquer** enregistre les modifications dans la boîte de dialogue des paramètres ; celles-ci ne sont validées qu’en cliquant sur
  **Enregistrer**.
- En haut se trouvent les vues **Éditeur**, **Ordinateur de bureau**, **Tablette** et
  **Mobile**. L’éditeur affiche le point de départ sélectionné avec son chemin d’accès dans le menu
  et son identifiant, ainsi que la barre en dessous. Les vues Ordinateur de bureau, Tablette et Mobile affichent la
  barre à la largeur de l’appareil, telle qu’elle s’affiche sur la page — il n’est pas possible de cliquer dessus
  dans l’aperçu. L’arborescence reste affichée à côté.
- Les commandes Annuler et Répéter se trouvent en haut de la fenêtre (⌘/Ctrl Z ou
  ⇧⌘/Ctrl Z).
- Les navigations configurées avant l’ouverture de la fenêtre conservent leur
  point de départ. La fenêtre l’affiche à son ouverture ; rien ne change tant qu’
  un autre point de départ n’est pas sélectionné et validé.
