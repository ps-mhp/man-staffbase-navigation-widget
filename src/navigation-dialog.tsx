/*!
 * Copyright 2026, MHP Management und IT-Beratung GmbH and contributors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Was der Konfigurationsdialog zeigt: ein einziges Fenster am Feld
 * `navigation-config`, das alte Feld `menu-id` ausgeblendet.
 *
 * Das Fenster beginnt mit dem, was gilt: `navigation-config`, je Schlüssel
 * ergänzt um das alte Feld des eigenen Dialogs. Ist nichts geändert, bleibt
 * „Übernehmen“ gesperrt – Öffnen und Schließen verändert keinen Block. Erst
 * ein gewählter Startpunkt landet in `navigation-config`; das alte Feld
 * bleibt, wie es ist.
 */

import * as React from "react";
import { Menu } from "lucide-react";

import { FieldModalShellOptions, startFieldModalInjector } from "@shared/config-modal";

import { LEGACY_ATTRIBUTES, NAVIGATION_CONFIG_ATTRIBUTE } from "./configuration-schema";
import { readLegacyFromDialog, startHiddenFields } from "./legacy-fields";
import {
  NavigationConfig,
  mergeNavigationConfig,
  readNavigationConfig,
  serializeNavigationConfig,
} from "./navigation-config";
import { navigationChangesStatus, validateNavigationConfig } from "./start-point-rules";

/**
 * Der Editor kommt erst, wenn ein Dialog ihn zeigt: er baut auf
 * `@man/config-ui` und damit auf react-aria. Hier im Seitenbündel bleiben nur
 * Prüfung, Status und Hilfe – sie braucht der Rahmen, bevor der Editor da ist.
 */
const LazyNavigationEditor = React.lazy(() =>
  import("./navigation-editor").then((module) => ({ default: module.NavigationEditor })),
);

const LOADING = <p className="p-6 text-sm text-muted-foreground">Editor wird geladen …</p>;

const REOPEN_LABEL = "Startpunkt wählen";

/** Tasten und den Satz zu „Übernehmen“ ergänzt der Rahmen selbst. */
const HELP = (
  <ul className="flex list-disc flex-col gap-2 pl-5">
    <li>
      Links im Menü den <strong>Menüpunkt</strong> wählen, dessen Unterpunkte die Leiste zeigen soll. Wählbar sind
      Menüpunkte mit Unterpunkten; Seiten ohne Unterpunkte stehen nur zur Orientierung im Baum.
    </li>
    <li>Die Suche über dem Baum findet Menüpunkte nach ihrem Titel.</li>
    <li>Ein durchgestrichenes Auge kennzeichnet Menüpunkte, die im Menü verborgen sind.</li>
    <li>
      Fehlt ein Menüpunkt, unten links <strong>ID oder Adresse eingeben</strong> wählen und die komplette Adresse seiner
      Seite oder die 24-stellige ID einfügen.
    </li>
    <li>Desktop, Tablet und Mobil zeigen die Leiste in Gerätebreite, so wie die Seite sie zeigt.</li>
    <li>Titel, Reihenfolge und Sichtbarkeit der Einträge kommen aus dem Menü der App und werden dort gepflegt.</li>
  </ul>
);

/** Was der gemeinsame Rahmen von der Navigation wissen muss. Offengelegt für Tests. */
export const navigationEditorShell: FieldModalShellOptions<NavigationConfig> = {
  widgetName: "Navigation",
  title: REOPEN_LABEL,
  icon: Menu,
  preview: true,
  help: HELP,
  statusText: navigationChangesStatus,
  validate: validateNavigationConfig,
};

/**
 * Wartet auf den Konfigurationsdialog des Widgets, setzt das Fenster an die
 * Stelle von `navigation-config` und blendet das alte Feld aus – beides nur
 * im eigenen Dialog.
 *
 * @param root der zu beobachtende Teilbaum; standardmäßig das Dokument.
 * Offengelegt, damit Tests den Beobachter auf einen Container begrenzen.
 * @returns eine Funktion, die die Beobachtung beendet und alles abbaut.
 */
export function startNavigationDialog(root: ParentNode = document): () => void {
  const stopModal = startFieldModalInjector<NavigationConfig>({
    fieldKey: NAVIGATION_CONFIG_ATTRIBUTE,
    root,
    reopenLabel: REOPEN_LABEL,
    modalTestId: "navigation-editor-modal",
    reopenTestId: "navigation-editor-reopen",
    parse: (raw) => mergeNavigationConfig(readNavigationConfig(raw), readLegacyFromDialog(root)),
    serialize: serializeNavigationConfig,
    shell: navigationEditorShell,
    render: ({ value, onChange }) => (
      <React.Suspense fallback={LOADING}>
        <LazyNavigationEditor value={value} onChange={onChange} />
      </React.Suspense>
    ),
  });
  const stopHiding = startHiddenFields(LEGACY_ATTRIBUTES, NAVIGATION_CONFIG_ATTRIBUTE, root);
  return () => {
    stopModal();
    stopHiding();
  };
}
