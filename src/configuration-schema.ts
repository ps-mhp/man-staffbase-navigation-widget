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

/**
 * Der Menüeintrag, ab dem die Navigation blättert.
 *
 * Drei Stellen müssen sich über den Namen einig sein: der Schlüssel im Schema,
 * weil der Host einen Wert wörtlich unter ihm speichert; das beim Host
 * angemeldete Attribut, weil er ein unbekanntes verwirft; und `widgets.json`.
 */
export const MENU_ID_ATTRIBUTE = "menu-id";

/**
 * Die Überschrift über der ersten Ebene. Nicht `title`: das ist ein globales
 * HTML-Attribut, und der Browser zeigte es als Tooltip über dem ganzen Widget.
 */
export const HEADING_ATTRIBUTE = "heading";

/**
 * @see https://rjsf-team.github.io/react-jsonschema-form/docs/
 */
export const configurationSchema: JSONSchema7 = {
  properties: {
    [MENU_ID_ATTRIBUTE]: {
      type: "string",
      title: "Startpunkt im Menü",
    },
    [HEADING_ATTRIBUTE]: {
      type: "string",
      title: "Überschrift",
    },
  },
};

/**
 * @see https://rjsf-team.github.io/react-jsonschema-form/docs/api-reference/uiSchema
 */
export const uiSchema: UiSchema = {
  [MENU_ID_ATTRIBUTE]: {
    "ui:help":
      "Den Menüpunkt wählen, dessen Unterpunkte die Navigation zeigt. Fehlt er in der Liste, " +
      "„Andere Menü-ID eingeben …“ wählen und die Adresse der Seite einfügen.",
  },
  [HEADING_ATTRIBUTE]: {
    "ui:help": "Steht über der ersten Ebene. Leer lassen, um den Titel des Startpunkts zu zeigen.",
  },
};
