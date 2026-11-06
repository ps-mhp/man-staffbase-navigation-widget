# Navigation

Die Navigation holt einen Ausschnitt des Staffbase-Menüs auf eine Seite: Sie
wählen einen Menüpunkt als Startpunkt, und das Widget zeigt ihn als
horizontale Leiste — links der Startpunkt, rechts daneben seine Unterpunkte.
Hat ein Eintrag selbst Unterpunkte, öffnet ein Pfeil sie als Dropdown, ohne
die Seite zu verlassen.

Typische Anlässe: eine Bereichsnavigation oben auf den Seiten eines Themas,
eine Themenübersicht auf einer Einstiegsseite, der Sprung zwischen
Nachbarbereichen.

## Was Leser:innen sehen

```
[Startpunkt ⌄] | [Unterpunkt 1 ⌄] [Unterpunkt 2] [Unterpunkt 3 ⌄] …   [‹ ›]
```

- Links der **Startpunkt**. Ein Klick auf seinen Titel öffnet seine Seite.
  Der **Pfeil** daneben öffnet seine Geschwister — die anderen Menüpunkte
  auf derselben Ebene, der Startpunkt selbst ist darin hervorgehoben. Steht
  der Startpunkt ganz oben im Menü oder neben ihm nichts Sichtbares, gibt es
  keinen Pfeil.
- Ein senkrechter **Strich** trennt den Startpunkt von seinen Unterpunkten.
- Rechts die **Unterpunkte** des Startpunkts, in einer Zeile und in der
  Reihenfolge des Menüs.
- Ein Klick auf einen **Titel** öffnet die Seite selbst, ein Klick auf den
  **Pfeil** daneben ein Dropdown mit den Unterpunkten dieses Eintrags. Den
  Pfeil gibt es nur, wenn es dort etwas Sichtbares zu öffnen gibt. Das
  Dropdown zeigt genau eine Ebene; tiefere Einträge erscheinen dort als
  einfache Verweise.
- Passen nicht alle Unterpunkte in die Breite, erscheinen rechts zwei Knöpfe
  **‹ ›**, mit denen sich die Leiste weiterschieben lässt. Auf dem Telefon
  geht das auch mit dem Finger.
- Ein Dropdown schließt mit **Escape**, mit einem Klick daneben und sobald
  die Leiste gescrollt wird.

Ein Ordner, der nur andere Einträge enthält und keine eigene Seite hat,
öffnet sein Dropdown beim Klick auf den ganzen Eintrag.

## Wichtig zu wissen

- Das Widget **kopiert nichts**. Es liest das Menü bei jedem Aufruf neu:
  Ändert sich das Menü, ändert sich auch die Navigation.
- **Berechtigungen bleiben bestehen.** Jede Person sieht nur die
  Menüpunkte, die sie auch im Menü der App sieht.
- Menüpunkte, die im Menü auf **„Nicht sichtbar“** stehen, zeigt die
  Navigation ebenfalls nicht.
- Die **Titel** der Menüpunkte erscheinen in der Sprache der lesenden Person,
  so wie im Menü der App.

## Was Sie im CMS-Editor sehen

Im Editor erscheint das Widget so wie auf der veröffentlichten Seite; die
Dropdowns lassen sich dort auch öffnen. Ein Klick auf einen Titel verlässt dabei
den Editor — zum Ausprobieren besser die Vorschau verwenden.
