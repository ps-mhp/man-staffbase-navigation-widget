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

import React, { RefObject, useLayoutEffect } from "react";

import { MenuLevel } from "@shared/staffbase/menu";

import { DropdownRequest } from "./use-dropdown";
import { LevelLoader, LevelState, useMenuLevel } from "./use-menu-level";
import { EntryLink, MESSAGES, StatusMessage, dropdownEntries } from "./menu-parts";

export interface MenuDropdownProps {
  id: string;
  request: DropdownRequest;
  currentId: string | null;
  loadLevel: LevelLoader;
  loaded: Map<string, MenuLevel>;
  rootRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
}

/** Wo der Auslöser steht: der ganze Eintrag, nicht nur sein Pfeil. */
const anchorOf = (trigger: HTMLElement): HTMLElement =>
  trigger.closest<HTMLElement>(".man-nav__item, .man-nav__start") ?? trigger;

/**
 * Hebt das Dropdown in den Top Layer. Der Content Designer setzt jeden Block
 * in einen Kasten mit `overflow: hidden` (live gesehen 06.11.2026), der alles
 * unter der Leiste abschnitte; im Top Layer greift kein `overflow`,
 * `transform` oder `z-index` eines Vorfahren mehr. `manual`: Schließen regelt
 * `useDropdown`, nicht der Browser.
 */
function useTopLayer(panelRef: RefObject<HTMLDivElement | null>): void {
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel === null || typeof panel.showPopover !== "function") return;
    panel.setAttribute("popover", "manual");
    panel.showPopover();
  }, [panelRef]);
}

/**
 * Legt das Dropdown unter seinen Eintrag, in Koordinaten des Fensters
 * (`position: fixed`). Ragte es rechts aus der Leiste oder dem Fenster, rückt
 * es nach links. Neu gelegt, wenn die Seite scrollt, das Fenster sich ändert
 * oder der Inhalt geladen ist und das Dropdown breiter wird.
 */
function usePlacement(
  rootRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLDivElement | null>,
  trigger: HTMLElement,
  contentKey: unknown,
): void {
  useLayoutEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (root === null || panel === null) return;
    const place = (): void => {
      const bar = root.getBoundingClientRect();
      const anchor = anchorOf(trigger).getBoundingClientRect();
      const right = Math.min(bar.right, document.documentElement.clientWidth || bar.right);
      const left = Math.max(0, bar.left, Math.min(anchor.left, right - panel.offsetWidth));
      panel.style.left = `${left}px`;
      panel.style.top = `${anchor.bottom}px`;
    };
    place();

    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(place) : null;
    observer?.observe(panel);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
      observer?.disconnect();
    };
  }, [rootRef, panelRef, trigger, contentKey]);
}

interface DropdownBodyProps {
  state: LevelState;
  label: string;
  markId: string | null;
  currentId: string | null;
}

function DropdownBody({ state, label, markId, currentId }: DropdownBodyProps): React.JSX.Element | null {
  if (state.status !== "ready") return <StatusMessage state={state} />;
  const entries = dropdownEntries(state.level, markId);
  if (entries.length === 0) return <p className="man-nav__status">{MESSAGES.empty}</p>;
  return (
    <ul className="man-nav__menu" aria-label={label}>
      {entries.map((entry) => (
        <li key={entry.id} className="man-nav__menu-item">
          <EntryLink
            entry={entry}
            className="man-nav__menu-link"
            current={entry.id === currentId ? "page" : entry.id === markId ? "true" : undefined}
          />
        </li>
      ))}
    </ul>
  );
}

/** Das offene Dropdown. Sein Inhalt lädt beim ersten Öffnen, danach aus der Ablage. */
export function MenuDropdown({
  id,
  request,
  currentId,
  loadLevel,
  loaded,
  rootRef,
  panelRef,
}: MenuDropdownProps): React.JSX.Element {
  const state = useMenuLevel(request.levelId, loadLevel, loaded);
  useTopLayer(panelRef);
  usePlacement(rootRef, panelRef, request.trigger, state.status);

  return (
    <div id={id} className="man-nav__dropdown" ref={panelRef}>
      <DropdownBody state={state} label={request.label} markId={request.markId} currentId={currentId} />
    </div>
  );
}
