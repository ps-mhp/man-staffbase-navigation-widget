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

import { MenuEntry, MenuLevel } from "@shared/staffbase/menu";

import { DropdownRequest } from "./use-dropdown";
import { LevelLoader, LevelState, useMenuLevel } from "./use-menu-level";
import { EntryLink, MESSAGES, StatusMessage } from "./menu-parts";

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
 * Legt das Dropdown unter seinen Eintrag, gemessen relativ zur Leiste. Ragte
 * es rechts hinaus, rückt es nach links, bis es in die Leiste passt.
 */
function usePlacement(
  rootRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLDivElement | null>,
  trigger: HTMLElement,
): void {
  useLayoutEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (root === null || panel === null) return;
    // `left`/`top` zählen ab der Innenkante, nicht ab dem Rand der Leiste.
    const bar = root.getBoundingClientRect();
    const anchor = anchorOf(trigger).getBoundingClientRect();
    const left = Math.max(0, Math.min(anchor.left - bar.left - root.clientLeft, root.clientWidth - panel.offsetWidth));
    panel.style.left = `${left}px`;
    panel.style.top = `${anchor.bottom - bar.top - root.clientTop}px`;
  });
}

/**
 * Genau eine Ebene: ein Eintrag mit eigenen Kindern erscheint hier als
 * einfacher Verweis. Ein reiner Ordner führte nirgendwohin und fehlt.
 */
const shown = (level: MenuLevel, markId: string | null): MenuEntry[] =>
  level.children.filter((child) => child.id === markId || (!child.hidden && child.href !== null));

interface DropdownBodyProps {
  state: LevelState;
  label: string;
  markId: string | null;
  currentId: string | null;
}

function DropdownBody({ state, label, markId, currentId }: DropdownBodyProps): React.JSX.Element | null {
  if (state.status !== "ready") return <StatusMessage state={state} />;
  const entries = shown(state.level, markId);
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
  usePlacement(rootRef, panelRef, request.trigger);

  return (
    <div id={id} className="man-nav__dropdown" ref={panelRef}>
      <DropdownBody state={state} label={request.label} markId={request.markId} currentId={currentId} />
    </div>
  );
}
