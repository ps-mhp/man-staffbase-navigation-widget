# navigation-widget

Staffbase-Custom-Widget „Navigation“: zeigt die Unterpunkte eines gewählten
Menüeintrags als blätterndes Menü — Titel öffnet die Seite, Pfeil blättert
eine Ebene tiefer, auf dem Telefon blättert ein Wischen nach rechts zurück.
Die Daten kommen aus `GET /api/menu/{id}` (`@shared/staffbase/menu`).

Entwickelt, gebaut und released wird es aus dem Meta-Repo
[`ps-mhp/man-staffbase-cms-extensions`](https://github.com/ps-mhp/man-staffbase-cms-extensions);
dieses Repo enthält nur Quellcode und das ausgelieferte Bundle unter `dist/`.

```bash
scripts/sync.sh navigation-widget
npm run build -- --env widget=navigation-widget
npm test -- src/widgets/navigation-widget
scripts/release.sh navigation-widget
```
