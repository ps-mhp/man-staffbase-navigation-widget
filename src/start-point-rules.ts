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
 * Was der Rahmen über den Startpunkt wissen muss, bevor der Editor geladen
 * ist: ob er sich übernehmen lässt und was am Status steht.
 *
 * Liegt im Seitenbündel, nicht beim nachgeladenen Editor; darum nur reine
 * Funktionen, nichts aus `@man/config-ui` außer Typen.
 */

import type { ValidationIssue } from "@man/config-ui/shell/shell-context";
import { readMenuId } from "@shared/staffbase/menu";

import { NavigationConfig, resolveSticky } from "./navigation-config";

/** Kennung der Meldung; der Editor zeigt sie am Startpunkt. */
export const START_POINT_ISSUE = "start-point";

export const START_POINT_MESSAGES = {
  missing: "Startpunkt fehlt – links im Menü einen Menüpunkt wählen oder eine ID eintragen.",
  unreadable: "Darin steht keine Menü-ID – die 24-stellige ID oder die Adresse der Seite eintragen.",
} as const;

/** Prüft einen eingetragenen Startpunkt: eine ID oder eine Adresse, die auf einer endet. */
export function validateStartPoint(raw: string): ValidationIssue[] {
  if (raw.trim() === "") return [{ id: START_POINT_ISSUE, message: START_POINT_MESSAGES.missing }];
  if (readMenuId(raw) === null) return [{ id: START_POINT_ISSUE, message: START_POINT_MESSAGES.unreadable }];
  return [];
}

/** Ohne Startpunkt zeigte die Seite nur den Hinweis an die Redaktion. */
export function validateNavigationConfig(config: NavigationConfig): ValidationIssue[] {
  return validateStartPoint(config.menuId ?? "");
}

/** Was am Status im Kopf steht, solange etwas nicht übernommen ist. */
export function navigationChangesStatus(draft: NavigationConfig, saved: NavigationConfig): string | undefined {
  const before = saved.menuId ?? "";
  const after = draft.menuId ?? "";
  if (after !== before) return after.trim() === "" ? "Startpunkt entfernt" : "Startpunkt geändert";
  if (resolveSticky(draft) !== resolveSticky(saved)) return "Sticky geändert";
  return undefined;
}
