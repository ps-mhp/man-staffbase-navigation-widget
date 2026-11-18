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

import { UiSchema } from "@rjsf/utils";
import { JSONSchema7 } from "json-schema";

/** Muss dem Tag entsprechen, unter dem `index.tsx` das Widget anmeldet. */
export const NAVIGATION_WIDGET_TAG = "navigation-widget";

// Die Namen der Konfiguration.
//
// Jeder muss an drei Stellen gleich heißen: als Schlüssel im Schema, weil der
// Host einen Wert wörtlich unter ihm speichert; als beim Host angemeldetes
// Attribut, weil er ein unbekanntes verwirft; und in `widgets.json`.

/**
 * Die ganze Konfiguration in einem Feld – siehe `navigation-config.ts`. Der
 * Name trägt das Widget: Editoren hängen sich über `root_<Attribut>` ein,
 * ohne das Widget zu kennen, und `menu-id` führt auch das Hotspot-Widget.
 */
export const NAVIGATION_CONFIG_ATTRIBUTE = "navigation-config";

/**
 * Der Menüeintrag, den die Navigation links zeigt; rechts daneben stehen
 * seine Unterpunkte. Das einzelne Feld bis 0.2.0-rc.6: es steht weiter im
 * Schema, damit der Dialog seinen Wert führt und ältere Blöcke ihn behalten,
 * ist im eigenen Dialog aber ausgeblendet (`legacy-fields.ts`).
 */
export const MENU_ID_ATTRIBUTE = "menu-id";

/** Die Felder älterer Fassungen, die das Fenster beim ersten Öffnen liest. */
export const LEGACY_ATTRIBUTES = [MENU_ID_ATTRIBUTE] as const;

/**
 * Zu sehen ist nur `navigation-config`: an seine Stelle tritt der Knopf zum
 * Fenster „Startpunkt wählen“ (`navigation-dialog.tsx`).
 *
 * @see https://rjsf-team.github.io/react-jsonschema-form/docs/
 */
export const configurationSchema: JSONSchema7 = {
  properties: {
    [NAVIGATION_CONFIG_ATTRIBUTE]: {
      type: "string",
      title: "Navigation",
      default: "",
    },
    [MENU_ID_ATTRIBUTE]: {
      type: "string",
      title: "Startpunkt im Menü",
    },
  },
};

/** Alle Attribute, in der Reihenfolge des Schemas: das neue zuerst, dann das alte. */
export const ALL_ATTRIBUTES: string[] = Object.keys(configurationSchema.properties ?? {});

/**
 * @see https://rjsf-team.github.io/react-jsonschema-form/docs/api-reference/uiSchema
 */
export const uiSchema: UiSchema = {
  [NAVIGATION_CONFIG_ATTRIBUTE]: {
    "ui:help":
      "Der Startpunkt wird im Fenster „Startpunkt wählen“ gepflegt; das Textfeld dahinter ist die Rohfassung.",
  },
};
