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
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MenuEntry, MenuLevel } from "@shared/staffbase/menu";

import { MESSAGES, NavigationMenu } from "./navigation-menu";
import { SWIPE_THRESHOLD } from "./use-swipe-back";

const FAHRERHAUS = "6a58dd4eefeacc1239d9fd09";
const ARBEITSPLATZ = "6a73580860fe1414378d4660";
const RUHE = "6a7358b8340cb013d7f29611";
const ORDNER = "69a142424125962a49b62566";
const LENKRAD = "6aa0161549d51f0f57864771";

const entry = (id: string, title: string, extra: Partial<MenuEntry> = {}): MenuEntry => ({
  id,
  title,
  href: `/openlink/content/page/${id}`,
  external: false,
  hasChildren: false,
  hidden: false,
  ...extra,
});

/** Die Vorlage: „Fahrerhaus“ mit „Fahrerarbeitsplatz“ und dessen Unterseiten. */
const menu: Record<string, MenuLevel> = {
  [FAHRERHAUS]: {
    entry: entry(FAHRERHAUS, "Fahrerhaus", { hasChildren: true }),
    children: [
      entry(ARBEITSPLATZ, "Fahrerarbeitsplatz", { hasChildren: true }),
      entry(RUHE, "Ruhebereich"),
      entry("6a7359c6340cb013d7f2a76f", "Verborgen", { hidden: true }),
      entry(ORDNER, "Argumentation", { href: null, hasChildren: true }),
    ],
  },
  [ARBEITSPLATZ]: {
    entry: entry(ARBEITSPLATZ, "Fahrerarbeitsplatz", { hasChildren: true }),
    children: [entry(LENKRAD, "Lenkrad"), entry("6a7357aca8480d7e2b6b9db2", "Sitze")],
  },
  [ORDNER]: {
    entry: entry(ORDNER, "Argumentation", { href: null, hasChildren: true }),
    children: [],
  },
};

const loaderFor = (levels: Record<string, MenuLevel | null>) =>
  jest.fn(async (id: string) => levels[id] ?? null);

const renderMenu = (props: Partial<React.ComponentProps<typeof NavigationMenu>> = {}) => {
  const loadLevel = (props.loadLevel ?? loaderFor(menu)) as jest.Mock<Promise<MenuLevel | null>, [string]>;
  const view = render(<NavigationMenu startId={FAHRERHAUS} heading={null} loadLevel={loadLevel} {...props} />);
  return { ...view, loadLevel };
};

const touch = (x: number, y = 100) => ({ touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] });

describe("NavigationMenu", () => {
  it("zeigt die Unterpunkte des Startpunkts unter dessen Titel", async () => {
    renderMenu();

    expect(await screen.findByRole("link", { name: "Fahrerarbeitsplatz" })).toHaveAttribute(
      "href",
      `/openlink/content/page/${ARBEITSPLATZ}`,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Fahrerhaus");
    expect(screen.getByRole("navigation", { name: "Fahrerhaus" })).toBeInTheDocument();
  });

  it("nimmt die eingetragene Überschrift statt des Titels", async () => {
    renderMenu({ heading: "Weiterführende Links" });

    await screen.findByRole("link", { name: "Ruhebereich" });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Weiterführende Links");
  });

  it("zeigt verborgene Einträge nicht", async () => {
    renderMenu();

    await screen.findByRole("link", { name: "Ruhebereich" });
    expect(screen.queryByText("Verborgen")).not.toBeInTheDocument();
  });

  it("gibt nur Einträgen mit Unterpunkten einen Pfeil", async () => {
    renderMenu();

    await screen.findByRole("link", { name: "Ruhebereich" });
    expect(screen.getByRole("button", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: MESSAGES.openChildren("Ruhebereich") })).not.toBeInTheDocument();
  });

  it("blättert per Pfeil eine Ebene tiefer und per Kopfzeile zurück", async () => {
    const user = userEvent.setup();
    renderMenu({ heading: "Weiterführende Links" });

    await user.click(await screen.findByRole("button", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") }));

    expect(await screen.findByRole("link", { name: "Lenkrad" })).toBeInTheDocument();
    const back = screen.getByRole("button", { name: `${MESSAGES.back}Fahrerarbeitsplatz` });
    expect(back).toHaveFocus();
    expect(screen.queryByRole("link", { name: "Ruhebereich" })).not.toBeInTheDocument();

    await user.click(back);

    expect(await screen.findByRole("link", { name: "Ruhebereich" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Weiterführende Links");
    // Der Fokus steht wieder dort, wo der Weg hinein begann.
    expect(screen.getByRole("button", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") })).toHaveFocus();
  });

  it("lädt eine besuchte Ebene beim Zurückblättern nicht neu", async () => {
    const user = userEvent.setup();
    const { loadLevel } = renderMenu();

    await user.click(await screen.findByRole("button", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") }));
    await screen.findByRole("link", { name: "Lenkrad" });
    await user.click(screen.getByRole("button", { name: `${MESSAGES.back}Fahrerarbeitsplatz` }));

    expect(screen.getByRole("link", { name: "Ruhebereich" })).toBeInTheDocument();
    expect(loadLevel.mock.calls.map(([id]) => id).filter((id) => id === FAHRERHAUS)).toHaveLength(1);
  });

  it("blättert bei einem reinen Ordner mit der ganzen Zeile", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole("button", { name: "Argumentation" }));

    expect(await screen.findByText(MESSAGES.empty)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${MESSAGES.back}Argumentation` })).toBeInTheDocument();
  });

  it("öffnet eine fremde Adresse in einem neuen Tab", async () => {
    renderMenu({
      loadLevel: loaderFor({
        [FAHRERHAUS]: { ...menu[FAHRERHAUS], children: [entry(RUHE, "MAN", { href: "https://www.man.eu/", external: true })] },
      }),
    });

    const link = await screen.findByRole("link", { name: `MAN${MESSAGES.newTab}` });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("meldet einen Fehler und fragt auf Wunsch neu", async () => {
    const user = userEvent.setup();
    const loadLevel = jest.fn().mockResolvedValueOnce(null).mockResolvedValue(menu[FAHRERHAUS]);
    renderMenu({ loadLevel });

    expect(await screen.findByRole("alert")).toHaveTextContent(MESSAGES.failed);
    await user.click(screen.getByRole("button", { name: MESSAGES.retry }));

    expect(await screen.findByRole("link", { name: "Ruhebereich" })).toBeInTheDocument();
  });

  it("macht die Kopfzeile tieferer Ebenen nicht zur Überschrift", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole("button", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") }));
    await screen.findByRole("link", { name: "Lenkrad" });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("zeigt keine leere Überschrift, solange der Titel noch fehlt", () => {
    renderMenu({ loadLevel: jest.fn(() => new Promise<MenuLevel | null>(() => undefined)) });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: MESSAGES.fallbackLabel })).toBeInTheDocument();
  });

  it("öffnet nach einem Fehler beim erneuten Besuch nicht gleich wieder den alten Fehler", async () => {
    const user = userEvent.setup();
    let failArbeitsplatz = true;
    const loadLevel = jest.fn(async (id: string) => {
      if (id === ARBEITSPLATZ && failArbeitsplatz) return null;
      return menu[id] ?? null;
    });
    renderMenu({ loadLevel });

    await user.click(await screen.findByRole("button", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: `${MESSAGES.back}Fahrerarbeitsplatz` }));

    failArbeitsplatz = false;
    await user.click(await screen.findByRole("button", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Lenkrad" })).toBeInTheDocument();
  });

  it("zeigt ohne Startpunkt einen Hinweis statt einer Anfrage", () => {
    const { loadLevel } = renderMenu({ startId: null });

    expect(screen.getByText(MESSAGES.noStartPoint)).toBeInTheDocument();
    expect(loadLevel).not.toHaveBeenCalled();
  });

  it("beginnt wieder oben, wenn die Redaktion den Startpunkt wechselt", async () => {
    const user = userEvent.setup();
    const loadLevel = loaderFor(menu);
    const { rerender } = renderMenu({ loadLevel });

    await user.click(await screen.findByRole("button", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") }));
    await screen.findByRole("link", { name: "Lenkrad" });

    rerender(<NavigationMenu startId={ARBEITSPLATZ} heading={null} loadLevel={loadLevel} />);

    expect(await screen.findByRole("link", { name: "Lenkrad" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Zurück/ })).not.toBeInTheDocument();
  });

  describe("Wischen", () => {
    const openArbeitsplatz = async (): Promise<HTMLElement> => {
      renderMenu();
      fireEvent.click(await screen.findByRole("button", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") }));
      await screen.findByRole("link", { name: "Lenkrad" });
      return screen.getByRole("navigation");
    };

    it("blättert nach einem Wisch nach rechts zurück", async () => {
      const nav = await openArbeitsplatz();

      act(() => {
        fireEvent.touchStart(nav, touch(20));
        fireEvent.touchMove(nav, touch(40));
        fireEvent.touchMove(nav, touch(20 + SWIPE_THRESHOLD + 10));
        fireEvent.touchEnd(nav, touch(20 + SWIPE_THRESHOLD + 10));
      });

      expect(await screen.findByRole("link", { name: "Ruhebereich" })).toBeInTheDocument();
    });

    it("bleibt bei einem kurzen Wisch, einem nach links und beim Scrollen", async () => {
      const nav = await openArbeitsplatz();

      act(() => {
        fireEvent.touchStart(nav, touch(20));
        fireEvent.touchMove(nav, touch(40));
        fireEvent.touchEnd(nav, touch(20 + SWIPE_THRESHOLD - 10));

        fireEvent.touchStart(nav, touch(200));
        fireEvent.touchMove(nav, touch(100));
        fireEvent.touchEnd(nav, touch(100));

        fireEvent.touchStart(nav, touch(20, 100));
        fireEvent.touchMove(nav, touch(30, 300));
        fireEvent.touchMove(nav, touch(20 + SWIPE_THRESHOLD + 10, 320));
        fireEvent.touchEnd(nav, touch(20 + SWIPE_THRESHOLD + 10, 320));
      });

      expect(screen.getByRole("link", { name: "Lenkrad" })).toBeInTheDocument();
    });

    it("lässt die Ebene dem Finger folgen und gibt sie danach frei", async () => {
      const nav = await openArbeitsplatz();

      act(() => {
        fireEvent.touchStart(nav, touch(20));
        fireEvent.touchMove(nav, touch(50));
      });
      expect(nav.style.getPropertyValue("--man-nav-drag")).toBe("30px");
      expect(nav).toHaveClass("man-nav--dragging");

      act(() => {
        fireEvent.touchEnd(nav, touch(50));
      });
      expect(nav.style.getPropertyValue("--man-nav-drag")).toBe("");
      expect(nav).not.toHaveClass("man-nav--dragging");
    });

    it("gibt die Ebene frei, sobald ein zweiter Finger dazukommt", async () => {
      const nav = await openArbeitsplatz();

      act(() => {
        fireEvent.touchStart(nav, touch(20));
        fireEvent.touchMove(nav, touch(60));
        fireEvent.touchStart(nav, { touches: [{ clientX: 60, clientY: 100 }, { clientX: 200, clientY: 100 }] });
      });

      expect(nav.style.getPropertyValue("--man-nav-drag")).toBe("");
      expect(nav).not.toHaveClass("man-nav--dragging");
    });

    it("tut auf der ersten Ebene nichts", async () => {
      renderMenu();
      const nav = await screen.findByRole("navigation");
      await screen.findByRole("link", { name: "Ruhebereich" });

      act(() => {
        fireEvent.touchStart(nav, touch(20));
        fireEvent.touchMove(nav, touch(50));
      });

      expect(nav).not.toHaveClass("man-nav--dragging");
      expect(within(nav).getByRole("link", { name: "Ruhebereich" })).toBeInTheDocument();
    });
  });
});
