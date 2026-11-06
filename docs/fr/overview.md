# Navigation

La navigation affiche un extrait du menu Staffbase sur une page : vous
sélectionnez un élément du menu comme point de départ, et le widget l'affiche sous forme de
barre horizontale — à gauche, le point de départ ; à droite, ses sous-rubriques.
Si une entrée comporte elle-même des sous-rubriques, une flèche les ouvre sous forme de menu déroulant, sans
quitter la page.

Cas d'utilisation typiques : une navigation par rubriques en haut des pages d'un thème,
un aperçu des thèmes sur une page d'accueil, le passage d'une
rubrique à l'autre.

## Ce que voient les lecteurs et lectrices

```
[Point de départ ⌄] | [Sous-rubrique 1 ⌄] [Sous-rubrique 2] [Sous-rubrique 3 ⌄] …   [‹ ›]
```

- À gauche, le **point de départ**. Un clic sur son titre ouvre sa page.
  La **flèche** à côté ouvre ses « frères et sœurs » — les autres éléments de menu
  du même niveau ; le point de départ lui-même y est mis en évidence. Si
  le point de départ se trouve tout en haut du menu ou s’il n’y a rien de visible à côté de lui, il n’y a
  pas de flèche.
- Un **trait** vertical sépare le point de départ de ses sous-rubriques.
- À droite, les **sous-rubriques** du point de départ, alignées sur une seule ligne et dans l’
  ordre du menu.
- Un clic sur un **titre** ouvre la page correspondante ; un clic sur la
  **flèche** à côté ouvre un menu déroulant contenant les sous-éléments de cet élément. La
  flèche n’apparaît que s’il y a quelque chose de visible à ouvrir à cet endroit. Le
  menu déroulant n’affiche qu’un seul niveau ; les entrées plus profondes y apparaissent sous forme de
  simples liens.
- Si tous les sous-éléments ne tiennent pas dans la largeur, deux boutons
  **‹ ›** apparaissent à droite, permettant de faire défiler la barre. Sur le téléphone,
  cela fonctionne également avec le doigt.
- Un menu déroulant se ferme avec la touche **Échap**, en cliquant à côté de celui-ci ou dès que
  la barre est fait défiler.

Un dossier qui ne contient que d’autres entrées et qui ne dispose pas de sa propre page
ouvre son menu déroulant lorsque l’on clique sur l’entrée dans son ensemble.

## À savoir

- Le widget **ne copie rien**. Il relit le menu à chaque ouverture :
  si le menu change, la navigation change également.
- **Les autorisations sont conservées.** Chaque utilisateur ne voit que les
  éléments de menu qu’elle voit également dans le menu de l’application.
- Les éléments de menu marqués comme **« Non visibles »** dans le menu ne sont
  pas non plus affichés dans la navigation.
- Les **titres** des éléments de menu s’affichent dans la langue de la personne qui les lit,
  tout comme dans le menu de l’application.

## Ce que vous voyez dans l’éditeur CMS

Dans l’éditeur, le widget s’affiche tel qu’il apparaît sur la page publiée ; les
menus déroulants peuvent également y être ouverts. Un clic sur un titre fait quitter
l’éditeur — pour tester, il est préférable d’utiliser l’aperçu.
