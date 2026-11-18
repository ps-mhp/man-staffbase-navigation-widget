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
 * Die Leiste mit dem Entwurf: die echte Leseansicht (`NavigationMenu`), keine
 * Nachbildung – Startpunkt, Pfeile, Trennstrich und ‹ › bei Platzmangel sehen
 * aus wie auf der Seite, samt „wird geladen“ und Fehlermeldung.
 *
 * Ohne Seiteneffekte: `inert`, also kein Klick, der das Studio verlässt, und
 * kein Dropdown; kein Eingriff in einen Abschnitt (`fitSection={false}`);
 * keine Seite als „aktuell“ markiert – die Adresse des Studios ist nicht die
 * der Seite. Die Ebenen kommen aus derselben seitenweiten Ablage wie der
 * Baum links (`fetchMenuLevel`).
 *
 * Grenze: Der Gerätrahmen ist kein iframe. Medienabfragen der Leseansicht
 * fragen das Fenster des Studios; ob ‹ › erscheinen, misst die Leiste aber an
 * ihrer eigenen Breite, und die stimmt.
 */

import * as React from "react";

import { readMenuId } from "@shared/staffbase/menu";

import type { NavigationConfig } from "./navigation-config";
import { NavigationMenu } from "./navigation-menu";
import type { LevelLoader } from "./use-menu-level";

export interface NavigationPreviewProps {
  config: NavigationConfig;
  /**
   * Titel des Startpunkts, soweit bekannt. In den Geräteansichten steht
   * darunter angedeutet die Seite, damit man die Leiste an ihrem Platz sieht.
   */
  pageTitle?: string;
  /** Mit Seite darunter (Geräteansichten) oder nur die Leiste (Editor). */
  withPage?: boolean;
  /** Woher die Ebenen kommen; offengelegt für Tests. */
  loadLevel?: LevelLoader;
}

/** Die Seite unter der Leiste, nur angedeutet: Überschrift und Platzhalter. */
function PagePlaceholder({ title }: { title: string }): React.ReactElement {
  return (
    <div aria-hidden className="flex flex-col gap-4 px-10 py-8" data-testid="navigation-preview-page">
      <p className="text-[30px] leading-[1.15] font-bold text-foreground">{title}</p>
      <p className="text-[15px] text-muted-foreground">[Einleitung der Seite {title}.]</p>
    </div>
  );
}

export function NavigationPreview({
  config,
  pageTitle,
  withPage = true,
  loadLevel,
}: NavigationPreviewProps): React.ReactElement {
  const startId = readMenuId(config.menuId);
  return (
    <div inert data-testid="navigation-preview" className={withPage ? "min-h-[420px]" : undefined}>
      <NavigationMenu
        startId={startId}
        currentId={null}
        fitSection={false}
        {...(loadLevel === undefined ? {} : { loadLevel })}
      />
      {withPage && startId !== null && <PagePlaceholder title={pageTitle ?? "Seite"} />}
    </div>
  );
}
