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

import { registerDocsExamples } from "@shared/docs/register-docs-examples";
import { fetchMenuLevel } from "@shared/staffbase/menu";

import { MENU_ID_ATTRIBUTE } from "./configuration-schema";

/**
 * Der Startpunkt fürs Live-Beispiel: der erste sichtbare Eintrag des
 * Hauptmenüs, der Unterpunkte hat — so lässt sich im Beispiel gleich
 * blättern. Gibt es keinen, das Hauptmenü selbst.
 */
export async function resolveExampleStartPoint(): Promise<string | null> {
  const root = await fetchMenuLevel();
  if (root === null) return null;
  const first = root.children.find((child) => child.hasChildren && !child.hidden);
  return first?.id ?? root.entry.id;
}

registerDocsExamples("navigation-widget", async (): Promise<Record<string, string>> => {
  const menuId = await resolveExampleStartPoint();
  return menuId === null ? {} : { [MENU_ID_ATTRIBUTE]: menuId };
});
