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

import React, { useCallback, useLayoutEffect, useRef, useState } from "react";

import { useHotStyle } from "@shared/hot-style";
import { MenuEntry, MenuLevel, fetchMenuLevel, readMenuId } from "@shared/staffbase/menu";

import navigationCss from "./styles/navigation-menu.scss";
import { LevelLoader, LevelState, useMenuLevel } from "./use-menu-level";
import { useSwipeBack } from "./use-swipe-back";

export const MESSAGES = {
  noStartPoint: "Bitte in den Einstellungen einen Startpunkt im Menü wählen.",
  loading: "Wird geladen …",
  failed: "Das Menü konnte nicht geladen werden.",
  retry: "Erneut versuchen",
  empty: "Hier gibt es keine weiteren Einträge.",
  back: "Zurück: ",
  newTab: " (öffnet in neuem Tab)",
  openChildren: (title: string): string => `Unterpunkte von ${title}`,
  fallbackLabel: "Navigation",
} as const;

/** Eine Ebene, in die geblättert wurde. Der Titel steht schon da, bevor sie geladen ist. */
interface Crumb {
  id: string;
  title: string;
}

type Direction = "none" | "forward" | "back";

/** Wohin der Fokus nach dem Blättern gehört — nur, wenn jemand geblättert hat. */
type FocusTarget = { kind: "back" } | { kind: "entry"; id: string };

export interface NavigationMenuProps {
  /** `null`, solange kein Startpunkt gewählt ist. */
  startId: string | null;
  /** Steht über der ersten Ebene; ohne sie der Titel des Startpunkts. */
  heading: string | null;
  /**
   * Der Menüeintrag der Seite, auf der das Widget steht — seine Zeile ist
   * hinterlegt. Ohne Angabe aus der Adresse gelesen (`/content/page/{id}`).
   */
  currentId?: string | null;
  /** Nur für Tests. */
  loadLevel?: LevelLoader;
}

/**
 * Die Leseadresse einer Seite trägt die ID ihres Menüeintrags, dieselbe, unter
 * der die Navigation ihn führt (geprüft 06.10.2026: `/content/page/{menuId}`).
 */
const currentMenuId = (): string | null => readMenuId(window.location.pathname);

const Chevron = ({ direction }: { direction: "left" | "right" }): React.JSX.Element => (
  <svg className="man-nav__chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path d={direction === "right" ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"} />
  </svg>
);

interface MenuRowProps {
  entry: MenuEntry;
  /** Die Seite, auf der das Widget steht. */
  current: boolean;
  onOpen: (entry: MenuEntry) => void;
}

/**
 * Eine Zeile: der Titel führt auf die Seite, der Pfeil eine Ebene tiefer.
 * Ein reiner Ordner hat keine Seite — bei ihm blättert die ganze Zeile.
 */
function MenuRow({ entry, current, onOpen }: MenuRowProps): React.JSX.Element {
  const itemClass = current ? "man-nav__item man-nav__item--current" : "man-nav__item";
  if (entry.href === null) {
    return (
      <li className={itemClass}>
        <button type="button" className="man-nav__row" data-entry-id={entry.id} onClick={() => onOpen(entry)}>
          <span className="man-nav__title">{entry.title}</span>
          <Chevron direction="right" />
        </button>
      </li>
    );
  }
  return (
    <li className={itemClass}>
      <a
        className="man-nav__link"
        href={entry.href}
        aria-current={current ? "page" : undefined}
        target={entry.external ? "_blank" : undefined}
        rel={entry.external ? "noopener noreferrer" : undefined}
      >
        <span className="man-nav__title">{entry.title}</span>
        {entry.external && <span className="man-nav__sr-only">{MESSAGES.newTab}</span>}
      </a>
      {entry.hasChildren && (
        <button
          type="button"
          className="man-nav__open"
          data-entry-id={entry.id}
          aria-label={MESSAGES.openChildren(entry.title)}
          onClick={() => onOpen(entry)}
        >
          <Chevron direction="right" />
        </button>
      )}
    </li>
  );
}

interface LevelBodyProps {
  state: LevelState;
  currentId: string | null;
  onOpen: (entry: MenuEntry) => void;
}

function LevelBody({ state, currentId, onOpen }: LevelBodyProps): React.JSX.Element {
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
  const visible = state.level.children.filter((child) => !child.hidden);
  if (visible.length === 0) return <p className="man-nav__status">{MESSAGES.empty}</p>;
  return (
    <ul className="man-nav__list">
      {visible.map((entry) => (
        <MenuRow key={entry.id} entry={entry} current={entry.id === currentId} onOpen={onOpen} />
      ))}
    </ul>
  );
}

/**
 * Das blätternde Menü: eine Ebene zur Zeit, vor per Pfeil, zurück per Knopf
 * in der Kopfzeile oder — auf dem Telefon — per Wischen nach rechts.
 */
export function NavigationMenu({
  startId,
  heading,
  currentId = currentMenuId(),
  loadLevel = fetchMenuLevel,
}: NavigationMenuProps): React.JSX.Element {
  const liveCss = useHotStyle(navigationCss, "navigation-widget", "styles/navigation-menu.scss");

  if (startId === null) {
    return (
      <div className="man-nav">
        <style>{liveCss}</style>
        <p className="man-nav__status">{MESSAGES.noStartPoint}</p>
      </div>
    );
  }
  // Der Schlüssel setzt das Blättern zurück, wenn die Redaktion einen anderen Startpunkt wählt.
  return (
    <NavigationLevels
      key={startId}
      css={liveCss}
      startId={startId}
      heading={heading}
      currentId={currentId}
      loadLevel={loadLevel}
    />
  );
}

interface NavigationLevelsProps {
  css: string;
  startId: string;
  heading: string | null;
  currentId: string | null;
  loadLevel: LevelLoader;
}

function NavigationLevels({ css, startId, heading, currentId, loadLevel }: NavigationLevelsProps): React.JSX.Element {
  const [trail, setTrail] = useState<Crumb[]>([]);
  const [direction, setDirection] = useState<Direction>("none");
  const rootRef = useRef<HTMLElement>(null);
  const focusTarget = useRef<FocusTarget | null>(null);

  const [loaded] = useState(() => new Map<string, MenuLevel>());

  const current = trail.length > 0 ? trail[trail.length - 1] : null;
  const state = useMenuLevel(current?.id ?? startId, loadLevel, loaded);
  // Tiefer als die erste Ebene kommt niemand, ohne dass sie geladen war.
  const startTitle = loaded.get(startId)?.entry.title ?? null;

  const open = useCallback((entry: MenuEntry) => {
    focusTarget.current = { kind: "back" };
    setDirection("forward");
    setTrail((previous) => [...previous, { id: entry.id, title: entry.title }]);
  }, []);

  const back = useCallback(() => {
    if (current === null) return;
    focusTarget.current = { kind: "entry", id: current.id };
    setDirection("back");
    setTrail((previous) => previous.slice(0, -1));
  }, [current]);

  useSwipeBack(rootRef, current !== null, back);

  // Wer blättert, landet mit dem Fokus auf der neuen Ebene — vorwärts auf dem
  // Zurück-Knopf, zurück auf dem Pfeil, über den er gekommen ist. Sonst stünde
  // der Fokus auf einem Element, das es nicht mehr gibt, und begänne wieder
  // oben auf der Seite.
  useLayoutEffect(() => {
    const target = focusTarget.current;
    const root = rootRef.current;
    if (target === null || root === null) return;
    // Die ID ist eine geprüfte Staffbase-ID (`fetchMenuLevel`), im Selektor also harmlos.
    const selector = target.kind === "back" ? ".man-nav__back" : `[data-entry-id="${target.id}"]`;
    const element = root.querySelector<HTMLElement>(selector);
    if (element === null) return;
    element.focus();
    focusTarget.current = null;
  });

  const headingText = heading ?? startTitle;
  // Ohne Startpunkt-Titel und ohne Überschrift bliebe die Navigation namenlos.
  const label = headingText ?? MESSAGES.fallbackLabel;

  return (
    <nav className="man-nav" aria-label={label} ref={rootRef}>
      <style>{css}</style>
      <div key={`${trail.length}:${current?.id ?? startId}`} className={`man-nav__panel man-nav__panel--${direction}`}>
        {/* Überschrift nur, wo es eine gibt: eine leere wäre für Screenreader ein
            Loch. Tiefer ist die Kopfzeile ein Knopf, keine Überschrift — sonst
            landete die Überschriften-Navigation auf einem Knopf. */}
        <div className="man-nav__header">
          {current === null ? (
            headingText === null ? (
              <span className="man-nav__heading" aria-hidden="true">
                {"\u00a0"}
              </span>
            ) : (
              <span className="man-nav__heading" role="heading" aria-level={2}>
                {headingText}
              </span>
            )
          ) : (
            <button type="button" className="man-nav__back" onClick={back}>
              <Chevron direction="left" />
              <span className="man-nav__heading">
                <span className="man-nav__sr-only">{MESSAGES.back}</span>
                {current.title}
              </span>
            </button>
          )}
        </div>
        <LevelBody state={state} currentId={currentId} onOpen={open} />
      </div>
    </nav>
  );
}
