# navigation-widget

Staffbase-Custom-Widget „Navigation“: zeigt die Unterpunkte eines gewählten
Startpunkts als horizontale Leiste — links der Startpunkt (Pfeil: seine
Geschwister), rechts seine Unterpunkte (Titel öffnet die Seite, Pfeil ein
Dropdown mit der nächsten Ebene), bei Platzmangel waagerecht scrollbar mit ‹ ›.
Die Daten kommen aus `GET /api/menu/{id}` (`@shared/staffbase/menu`).

Konfiguriert wird im Vollbild-Fenster „Startpunkt wählen“ aus
`@man/config-ui` (`src/navigation-dialog.tsx`, Editor nachgeladen): links das
Menü als Baum mit Suche und „ID oder Adresse eingeben“, daneben die echte
Leiste als Vorschau. Gespeichert wird im Attribut `navigation-config`
(JSON, `src/navigation-config.ts`); das alte Feld `menu-id` gilt je
Schlüssel weiter und ist im Dialog ausgeblendet (`src/legacy-fields.ts`).

Entwickelt, gebaut und released wird es aus dem Meta-Repo
[`ps-mhp/man-staffbase-cms-extensions`](https://github.com/ps-mhp/man-staffbase-cms-extensions);
dieses Repo enthält nur Quellcode und das ausgelieferte Bundle unter `dist/`.

```bash
scripts/sync.sh navigation-widget
npm run build -- --env widget=navigation-widget
npm test -- src/widgets/navigation-widget
scripts/release.sh navigation-widget
```
