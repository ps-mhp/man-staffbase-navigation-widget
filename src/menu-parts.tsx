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

import React from "react";

import { MenuEntry } from "@shared/staffbase/menu";

import { LevelState } from "./use-menu-level";

export const MESSAGES = {
  noStartPoint: "Bitte in den Einstellungen einen Startpunkt im Menü wählen.",
  loading: "Wird geladen …",
  failed: "Das Menü konnte nicht geladen werden.",
  retry: "Erneut versuchen",
  empty: "Hier gibt es keine weiteren Einträge.",
  newTab: " (öffnet in neuem Tab)",
  openChildren: (title: string): string => `Unterpunkte von ${title}`,
  openSiblings: (title: string): string => `Weitere Einträge neben ${title}`,
  scrollBack: "Vorherige Einträge zeigen",
  scrollForward: "Weitere Einträge zeigen",
  fallbackLabel: "Navigation",
} as const;

type ChevronDirection = "left" | "right" | "down";

const CHEVRON_PATHS: Record<ChevronDirection, string> = {
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  down: "M5 9l7 7 7-7",
};

export const Chevron = ({ direction }: { direction: ChevronDirection }): React.JSX.Element => (
  <svg className="man-nav__chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path d={CHEVRON_PATHS[direction]} />
  </svg>
);

interface EntryLinkProps {
  /** Ein Eintrag mit Ziel (`href !== null`). */
  entry: MenuEntry;
  className: string;
  current?: "page" | "true";
}

/** Ein Verweis auf die Seite eines Eintrags; fremde Adressen öffnen in einem neuen Tab. */
export function EntryLink({ entry, className, current }: EntryLinkProps): React.JSX.Element {
  return (
    <a
      className={className}
      href={entry.href ?? undefined}
      aria-current={current}
      target={entry.external ? "_blank" : undefined}
      rel={entry.external ? "noopener noreferrer" : undefined}
    >
      <span className="man-nav__title">{entry.title}</span>
      {entry.external && <span className="man-nav__sr-only">{MESSAGES.newTab}</span>}
    </a>
  );
}

/** Lädt noch oder ist gescheitert — in der Leiste wie im Dropdown. */
export function StatusMessage({ state }: { state: LevelState }): React.JSX.Element | null {
  if (state.status === "loading") {
    return (
      <p className="man-nav__status man-nav__status--loading" role="status">
        {MESSAGES.loading}
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <div className="man-nav__status" role="alert">
        <p className="man-nav__message">{MESSAGES.failed}</p>
        <button type="button" className="man-nav__retry" onClick={state.retry}>
          {MESSAGES.retry}
        </button>
      </div>
    );
  }
  return null;
}
