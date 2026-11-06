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
import { SCROLL_SHARE } from "./use-overflow";

const WURZEL = "6891d4e0aec53f55e3a819ac";
const FAHRERHAUS = "6a58dd4eefeacc1239d9fd09";
const AUFBAU = "6a58dd4eefeacc1239d9fd10";
const ARBEITSPLATZ = "6a73580860fe1414378d4660";
const RUHE = "6a7358b8340cb013d7f29611";
const ORDNER = "69a142424125962a49b62566";
const LENKRAD = "6aa0161549d51f0f57864771";
const SITZE = "6a7357aca8480d7e2b6b9db2";

const entry = (id: string, title: string, extra: Partial<MenuEntry> = {}): MenuEntry => ({
  id,
  title,
  href: `/openlink/content/page/${id}`,
  external: false,
  hasChildren: false,
  hidden: false,
  ...extra,
});

/** Die Vorlage: „Fahrerhaus“ unter der Wurzel, darin „Fahrerarbeitsplatz“ mit Unterseiten. */
const menu: Record<string, MenuLevel> = {
  [WURZEL]: {
    entry: entry(WURZEL, "Hauptmenü", { href: null, hasChildren: true }),
    parentId: null,
    children: [
      entry(FAHRERHAUS, "Fahrerhaus", { hasChildren: true }),
      entry(AUFBAU, "Aufbau"),
      entry("6a58dd4eefeacc1239d9fd11", "Geheim", { hidden: true }),
    ],
  },
  [FAHRERHAUS]: {
    entry: entry(FAHRERHAUS, "Fahrerhaus", { hasChildren: true }),
    parentId: WURZEL,
    children: [
      entry(ARBEITSPLATZ, "Fahrerarbeitsplatz", { hasChildren: true }),
      entry(RUHE, "Ruhebereich"),
      entry("6a7359c6340cb013d7f2a76f", "Verborgen", { hidden: true }),
      entry(ORDNER, "Argumentation", { href: null, hasChildren: true }),
    ],
  },
  [ARBEITSPLATZ]: {
    entry: entry(ARBEITSPLATZ, "Fahrerarbeitsplatz", { hasChildren: true }),
    parentId: FAHRERHAUS,
    children: [
      entry(LENKRAD, "Lenkrad"),
      entry(SITZE, "Sitze", { hasChildren: true }),
      entry("6a7357aca8480d7e2b6b9db3", "Unterordner", { href: null, hasChildren: true }),
    ],
  },
  [ORDNER]: {
    entry: entry(ORDNER, "Argumentation", { href: null, hasChildren: true }),
    parentId: FAHRERHAUS,
    children: [],
  },
};

const loaderFor = (levels: Record<string, MenuLevel | null>) => jest.fn(async (id: string) => levels[id] ?? null);

const renderMenu = (props: Partial<React.ComponentProps<typeof NavigationMenu>> = {}) => {
  const loadLevel = (props.loadLevel ?? loaderFor(menu)) as jest.Mock<Promise<MenuLevel | null>, [string]>;
  const view = render(<NavigationMenu startId={FAHRERHAUS} currentId={null} loadLevel={loadLevel} {...props} />);
  return { ...view, loadLevel };
};

const arrow = (title: string): Promise<HTMLElement> =>
  screen.findByRole("button", { name: MESSAGES.openChildren(title) });

const dropdownOf = (title: string): Promise<HTMLElement> =>
  screen.findByRole("list", { name: MESSAGES.openChildren(title) });

describe("NavigationMenu", () => {
  it("zeigt links den Startpunkt als Verweis und rechts seine Unterpunkte", async () => {
    renderMenu();

    expect(await screen.findByRole("link", { name: "Fahrerhaus" })).toHaveAttribute(
      "href",
      `/openlink/content/page/${FAHRERHAUS}`,
    );
    const nav = screen.getByRole("navigation", { name: "Fahrerhaus" });
    const bar = within(nav).getAllByRole("list")[0];
    expect(within(bar).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Fahrerarbeitsplatz",
      "Ruhebereich",
      "Argumentation",
    ]);
    expect(nav.querySelector(".man-nav__divider")).toHaveAttribute("aria-hidden", "true");
  });

  it("zeigt einen Startpunkt ohne eigene Seite als Text", async () => {
    renderMenu({ startId: ORDNER, loadLevel: loaderFor({ ...menu, [ORDNER]: { ...menu[ORDNER], children: [entry(RUHE, "Ruhebereich")] } }) });

    await screen.findByRole("link", { name: "Ruhebereich" });
    expect(screen.getByText("Argumentation")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Argumentation" })).not.toBeInTheDocument();
  });

  it("öffnet am Startpunkt die Geschwister und markiert ihn darin", async () => {
    const user = userEvent.setup();
    renderMenu();

    const button = await screen.findByRole("button", { name: MESSAGES.openSiblings("Fahrerhaus") });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    const dropdown = await screen.findByRole("list", { name: MESSAGES.openSiblings("Fahrerhaus") });
    expect(button).toHaveAttribute("aria-controls", dropdown.parentElement!.id);
    expect(within(dropdown).getAllByRole("link").map((link) => link.textContent)).toEqual(["Fahrerhaus", "Aufbau"]);
    expect(within(dropdown).getByRole("link", { name: "Fahrerhaus" })).toHaveAttribute("aria-current", "true");
  });

  it("gibt der Wurzel keinen Pfeil", async () => {
    const { loadLevel } = renderMenu({ startId: WURZEL });

    await screen.findByRole("link", { name: "Fahrerhaus" });
    expect(screen.queryByRole("button", { name: MESSAGES.openSiblings("Hauptmenü") })).not.toBeInTheDocument();
    // Kein Elternteil gefragt — nur der Startpunkt und, für die Pfeile, sein Unterpunkt mit Kindern.
    expect(loadLevel.mock.calls.map(([id]) => id)).toEqual([WURZEL, FAHRERHAUS]);
  });

  it("gibt dem Startpunkt keinen Pfeil, wenn neben ihm nichts Sichtbares steht", async () => {
    renderMenu({
      loadLevel: loaderFor({
        ...menu,
        [WURZEL]: { ...menu[WURZEL], children: [menu[WURZEL].children[0], menu[WURZEL].children[2]] },
      }),
    });

    await screen.findByRole("link", { name: "Ruhebereich" });
    await act(async () => undefined);
    expect(screen.queryByRole("button", { name: MESSAGES.openSiblings("Fahrerhaus") })).not.toBeInTheDocument();
  });

  it("zeigt verborgene Unterpunkte nicht", async () => {
    renderMenu();

    await screen.findByRole("link", { name: "Ruhebereich" });
    expect(screen.queryByText("Verborgen")).not.toBeInTheDocument();
  });

  it("unterstreicht die Seite, auf der das Widget steht", async () => {
    renderMenu({ currentId: RUHE });

    const current = await screen.findByRole("link", { name: "Ruhebereich" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.closest("li")).toHaveClass("man-nav__item--current");
    const other = screen.getByRole("link", { name: "Fahrerarbeitsplatz" });
    expect(other).not.toHaveAttribute("aria-current");
    expect(other.closest("li")).not.toHaveClass("man-nav__item--current");
  });

  it("unterstreicht auch den Startpunkt, wenn das Widget auf seiner Seite steht", async () => {
    renderMenu({ currentId: FAHRERHAUS });

    const start = await screen.findByRole("link", { name: "Fahrerhaus" });
    expect(start).toHaveAttribute("aria-current", "page");
    expect(start.closest(".man-nav__start")).toHaveClass("man-nav__item--current");
  });

  // Live gesehen am 06.11.2026: „childrenIds“ zählt auch verborgene Kinder mit.
  it("gibt einem Unterpunkt keinen Pfeil, wenn er nichts Sichtbares enthält", async () => {
    renderMenu({
      loadLevel: loaderFor({
        ...menu,
        [FAHRERHAUS]: {
          ...menu[FAHRERHAUS],
          children: menu[FAHRERHAUS].children.map((child) => (child.id === RUHE ? { ...child, hasChildren: true } : child)),
        },
        [RUHE]: {
          entry: entry(RUHE, "Ruhebereich", { hasChildren: true }),
          parentId: FAHRERHAUS,
          children: [entry(LENKRAD, "Verborgen", { hidden: true }), entry(SITZE, "Ordner", { href: null, hasChildren: true })],
        },
      }),
    });

    expect(await arrow("Fahrerarbeitsplatz")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: MESSAGES.openChildren("Ruhebereich") })).not.toBeInTheDocument();
  });

  it("zeigt einen reinen Ordner ohne sichtbare Unterpunkte als Text", async () => {
    renderMenu();

    await arrow("Fahrerarbeitsplatz");
    expect(screen.getByText("Argumentation")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Argumentation" })).not.toBeInTheDocument();
  });

  it("liest die aktuelle Seite aus der Adresse", async () => {
    window.history.pushState({}, "", `/content/page/${RUHE}`);
    try {
      render(<NavigationMenu startId={FAHRERHAUS} loadLevel={loaderFor(menu)} />);

      expect(await screen.findByRole("link", { name: "Ruhebereich" })).toHaveAttribute("aria-current", "page");
    } finally {
      window.history.pushState({}, "", "/");
    }
  });

  it("teilt einen Unterpunkt: der Titel führt zur Seite, der Pfeil öffnet eine Ebene", async () => {
    const user = userEvent.setup();
    renderMenu({ currentId: LENKRAD });

    expect(await screen.findByRole("link", { name: "Fahrerarbeitsplatz" })).toHaveAttribute(
      "href",
      `/openlink/content/page/${ARBEITSPLATZ}`,
    );
    expect(screen.queryByRole("button", { name: MESSAGES.openChildren("Ruhebereich") })).not.toBeInTheDocument();
    await user.click(await arrow("Fahrerarbeitsplatz"));

    const dropdown = await dropdownOf("Fahrerarbeitsplatz");
    // Eine Ebene: „Sitze“ hat selbst Kinder und bleibt ein einfacher Verweis; der Ordner fehlt.
    expect(within(dropdown).getAllByRole("link").map((link) => link.textContent)).toEqual(["Lenkrad", "Sitze"]);
    expect(within(dropdown).queryByRole("button")).not.toBeInTheDocument();
    expect(within(dropdown).getByRole("link", { name: "Lenkrad" })).toHaveAttribute("aria-current", "page");
  });

  it("öffnet bei einem reinen Ordner das Dropdown mit dem ganzen Eintrag", async () => {
    const user = userEvent.setup();
    renderMenu({ loadLevel: loaderFor({ ...menu, [ORDNER]: { ...menu[ORDNER], children: [entry(LENKRAD, "Lenkrad")] } }) });

    const folder = await screen.findByRole("button", { name: "Argumentation" });
    await user.click(folder);

    expect(folder).toHaveAttribute("aria-expanded", "true");
    expect(await dropdownOf("Argumentation")).toHaveTextContent("Lenkrad");
  });

  it("zeigt den Pfeil erst, wenn feststeht, dass es Unterpunkte gibt, und lädt sie nur einmal", async () => {
    const user = userEvent.setup();
    let resolve: (level: MenuLevel) => void = () => undefined;
    const base = loaderFor(menu);
    const loadLevel = jest.fn((id: string) =>
      id === ARBEITSPLATZ ? new Promise<MenuLevel | null>((done) => (resolve = done)) : base(id),
    );
    renderMenu({ loadLevel });

    await screen.findByRole("link", { name: "Fahrerarbeitsplatz" });
    expect(screen.queryByRole("button", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") })).not.toBeInTheDocument();

    await act(async () => resolve(menu[ARBEITSPLATZ]));
    const button = await arrow("Fahrerarbeitsplatz");
    await user.click(button);
    expect(await dropdownOf("Fahrerarbeitsplatz")).toBeInTheDocument();
    await user.click(button);
    await user.click(button);

    expect(await dropdownOf("Fahrerarbeitsplatz")).toBeInTheDocument();
    expect(loadLevel.mock.calls.filter(([id]) => id === ARBEITSPLATZ)).toHaveLength(1);
  });

  it("lässt den Pfeil stehen, wenn die Unterpunkte nicht zu laden waren, und meldet es im Dropdown", async () => {
    const user = userEvent.setup();
    let fail = true;
    const loadLevel = jest.fn(async (id: string) => (id === ARBEITSPLATZ && fail ? null : (menu[id] ?? null)));
    renderMenu({ loadLevel });

    await user.click(await arrow("Fahrerarbeitsplatz"));
    expect(await screen.findByRole("alert")).toHaveTextContent(MESSAGES.failed);

    fail = false;
    await user.click(screen.getByRole("button", { name: MESSAGES.retry }));

    expect(await dropdownOf("Fahrerarbeitsplatz")).toBeInTheDocument();
  });

  it("schließt bei Escape und gibt den Fokus an den Pfeil zurück", async () => {
    const user = userEvent.setup();
    renderMenu();

    const button = await arrow("Fahrerarbeitsplatz");
    await user.click(button);
    await dropdownOf("Fahrerarbeitsplatz");
    await user.tab();
    expect(screen.getByRole("link", { name: "Lenkrad" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("list", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("führt per Tab durch das Dropdown und danach zum nächsten Eintrag der Leiste", async () => {
    const user = userEvent.setup();
    renderMenu();

    const button = await arrow("Fahrerarbeitsplatz");
    await user.click(button);
    await dropdownOf("Fahrerarbeitsplatz");

    await user.tab();
    expect(screen.getByRole("link", { name: "Lenkrad" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(button).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("link", { name: "Sitze" })).toHaveFocus();
    await user.tab();

    expect(screen.getByRole("link", { name: "Ruhebereich" })).toHaveFocus();
    expect(screen.queryByRole("list", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") })).not.toBeInTheDocument();
  });

  it("hält höchstens ein Dropdown offen", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(await arrow("Fahrerarbeitsplatz"));
    await dropdownOf("Fahrerarbeitsplatz");
    await user.click(screen.getByRole("button", { name: MESSAGES.openSiblings("Fahrerhaus") }));

    await screen.findByRole("list", { name: MESSAGES.openSiblings("Fahrerhaus") });
    expect(screen.queryByRole("list", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("schließt bei einem Klick daneben, beim Scrollen der Leiste und bei neuer Fenstergröße", async () => {
    const user = userEvent.setup();
    const { container } = renderMenu();
    const button = await arrow("Fahrerarbeitsplatz");
    const isOpen = (): boolean => button.getAttribute("aria-expanded") === "true";

    await user.click(button);
    await user.click(document.body);
    expect(isOpen()).toBe(false);

    // Ein Scroll-Ereignis ohne Bewegung (Scroll-Anker, Fokus) lässt es offen.
    await user.click(button);
    const scroller = container.querySelector(".man-nav__scroller")!;
    fireEvent.scroll(scroller);
    expect(isOpen()).toBe(true);
    Object.defineProperty(scroller, "scrollLeft", { configurable: true, value: 50 });
    fireEvent.scroll(scroller);
    expect(isOpen()).toBe(false);

    await user.click(button);
    const width = window.innerWidth;
    try {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width - 100 });
      fireEvent(window, new Event("resize"));
      expect(isOpen()).toBe(false);
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    }
  });

  it("öffnet eine fremde Adresse in einem neuen Tab", async () => {
    renderMenu({
      loadLevel: loaderFor({
        ...menu,
        [FAHRERHAUS]: { ...menu[FAHRERHAUS], children: [entry(RUHE, "MAN", { href: "https://www.man.eu/", external: true })] },
      }),
    });

    const link = await screen.findByRole("link", { name: `MAN${MESSAGES.newTab}` });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("zeigt einen Startpunkt ohne sichtbare Unterpunkte allein, ohne Trennstrich", async () => {
    const { container } = renderMenu({
      loadLevel: loaderFor({ ...menu, [FAHRERHAUS]: { ...menu[FAHRERHAUS], children: [] } }),
    });

    await screen.findByRole("link", { name: "Fahrerhaus" });
    expect(container.querySelector(".man-nav__divider")).toBeNull();
    expect(container.querySelector(".man-nav__scroller")).toBeNull();
  });

  it("meldet einen Fehler beim Startpunkt und fragt auf Wunsch neu", async () => {
    const user = userEvent.setup();
    const base = loaderFor(menu);
    const loadLevel = jest.fn().mockResolvedValueOnce(null).mockImplementation(base);
    renderMenu({ loadLevel });

    expect(await screen.findByRole("alert")).toHaveTextContent(MESSAGES.failed);
    expect(screen.getByRole("navigation", { name: MESSAGES.fallbackLabel })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: MESSAGES.retry }));

    expect(await screen.findByRole("link", { name: "Ruhebereich" })).toBeInTheDocument();
  });

  it("zeigt ohne Startpunkt einen Hinweis statt einer Anfrage", () => {
    const { loadLevel } = renderMenu({ startId: null });

    expect(screen.getByText(MESSAGES.noStartPoint)).toBeInTheDocument();
    expect(loadLevel).not.toHaveBeenCalled();
  });

  it("schließt das Dropdown, wenn die Redaktion den Startpunkt wechselt", async () => {
    const user = userEvent.setup();
    const loadLevel = loaderFor(menu);
    const { rerender } = renderMenu({ loadLevel });

    await user.click(await arrow("Fahrerarbeitsplatz"));
    await dropdownOf("Fahrerarbeitsplatz");

    rerender(<NavigationMenu startId={ARBEITSPLATZ} currentId={null} loadLevel={loadLevel} />);

    expect(await screen.findByRole("link", { name: "Lenkrad" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") })).not.toBeInTheDocument();
  });

  // Der Content Designer setzt jeden Block in einen eigenen Shadow Root; am
  // `document` kommt jedes Ereignis von dort mit dem Wirt als Ziel an.
  it("bedient das Dropdown auch in einem Shadow Root", async () => {
    const user = userEvent.setup();
    const host = document.createElement("div");
    document.body.append(host);
    const container = host.attachShadow({ mode: "open" }).appendChild(document.createElement("div"));
    try {
      render(<NavigationMenu startId={FAHRERHAUS} currentId={null} loadLevel={loaderFor(menu)} />, { container });
      const view = within(container);
      const button = await view.findByRole("button", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") });

      await user.click(button);
      const dropdown = await view.findByRole("list", { name: MESSAGES.openChildren("Fahrerarbeitsplatz") });
      await user.click(within(dropdown).getByRole("link", { name: "Lenkrad" }).querySelector("span")!);
      expect(button).toHaveAttribute("aria-expanded", "true");

      await user.click(button);
      expect(button).toHaveAttribute("aria-expanded", "false");

      await user.click(button);
      button.focus();
      await user.tab();
      expect(host.shadowRoot!.activeElement).toBe(view.getByRole("link", { name: "Lenkrad" }));
    } finally {
      host.remove();
    }
  });

  it("nennt den Pfeil am Startpunkt nach den Geschwistern, nicht nach Unterpunkten", async () => {
    renderMenu();

    expect(await screen.findByRole("button", { name: MESSAGES.openSiblings("Fahrerhaus") })).toBeInTheDocument();
  });

  it("gibt dem Startpunkt keinen Pfeil, wenn neben ihm nur reine Ordner stehen", async () => {
    renderMenu({
      loadLevel: loaderFor({
        ...menu,
        [WURZEL]: { ...menu[WURZEL], children: [menu[WURZEL].children[0], entry(AUFBAU, "Aufbau", { href: null, hasChildren: true })] },
      }),
    });

    await screen.findByRole("link", { name: "Ruhebereich" });
    await act(async () => undefined);
    expect(screen.queryByRole("button", { name: MESSAGES.openSiblings("Fahrerhaus") })).not.toBeInTheDocument();
  });

  it("verweist nur bei offenem Dropdown per aria-controls darauf", async () => {
    const user = userEvent.setup();
    renderMenu();

    const button = await arrow("Fahrerarbeitsplatz");
    expect(button).not.toHaveAttribute("aria-controls");
    await user.click(button);

    expect(document.getElementById(button.getAttribute("aria-controls")!)).not.toBeNull();
  });

  it("bleibt offen, wenn sich nur die Höhe des Fensters ändert", async () => {
    const user = userEvent.setup();
    renderMenu();
    const button = await arrow("Fahrerarbeitsplatz");
    await user.click(button);

    fireEvent(window, new Event("resize"));
    expect(button).toHaveAttribute("aria-expanded", "true");

    const width = window.innerWidth;
    try {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width + 100 });
      fireEvent(window, new Event("resize"));
      expect(button).toHaveAttribute("aria-expanded", "false");
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    }
  });

  describe("Overflow", () => {
    const geometry = { scrollWidth: 0, clientWidth: 400 };
    const scrollLeft = new WeakMap<Element, number>();
    const originals = (["scrollWidth", "clientWidth", "scrollLeft"] as const).map(
      (name) => [name, Object.getOwnPropertyDescriptor(Element.prototype, name)] as const,
    );
    const scrollBy = jest.fn();

    const isScroller = (element: Element): boolean => element.classList.contains("man-nav__scroller");

    beforeEach(() => {
      scrollBy.mockReset();
      Object.defineProperty(Element.prototype, "scrollWidth", {
        configurable: true,
        get(this: Element) {
          return isScroller(this) ? geometry.scrollWidth : 0;
        },
      });
      Object.defineProperty(Element.prototype, "clientWidth", {
        configurable: true,
        get(this: Element) {
          return isScroller(this) ? geometry.clientWidth : 0;
        },
      });
      Object.defineProperty(Element.prototype, "scrollLeft", {
        configurable: true,
        get(this: Element) {
          return scrollLeft.get(this) ?? 0;
        },
        set(this: Element, value: number) {
          scrollLeft.set(this, value);
        },
      });
      (Element.prototype as unknown as { scrollBy: unknown }).scrollBy = scrollBy;
    });

    afterEach(() => {
      for (const [name, descriptor] of originals) {
        if (descriptor === undefined) delete (Element.prototype as unknown as Record<string, unknown>)[name];
        else Object.defineProperty(Element.prototype, name, descriptor);
      }
      delete (Element.prototype as unknown as { scrollBy?: unknown }).scrollBy;
    });

    it("zeigt keine Knöpfe, solange alles hineinpasst", async () => {
      geometry.scrollWidth = 400;
      renderMenu();

      await screen.findByRole("link", { name: "Ruhebereich" });
      expect(screen.queryByRole("button", { name: MESSAGES.scrollForward })).not.toBeInTheDocument();
    });

    it("zeigt ‹ ›, wenn die Unterpunkte breiter sind, und sperrt sie am Rand", async () => {
      geometry.scrollWidth = 1000;
      const user = userEvent.setup();
      const { container } = renderMenu();

      const forward = await screen.findByRole("button", { name: MESSAGES.scrollForward });
      const back = screen.getByRole("button", { name: MESSAGES.scrollBack });
      expect(back).toHaveAttribute("aria-disabled", "true");
      expect(forward).toHaveAttribute("aria-disabled", "false");

      await user.click(forward);
      expect(scrollBy).toHaveBeenCalledWith({ left: 400 * SCROLL_SHARE, behavior: "smooth" });

      const scroller = container.querySelector(".man-nav__scroller")!;
      scroller.scrollLeft = 600;
      fireEvent.scroll(scroller);

      expect(back).toHaveAttribute("aria-disabled", "false");
      // Gesperrt, aber fokussierbar: wer per Tastatur bis zum Rand drückt, behält seinen Platz.
      expect(forward).toHaveAttribute("aria-disabled", "true");
      forward.focus();
      scrollBy.mockClear();
      await user.click(forward);
      expect(scrollBy).not.toHaveBeenCalled();
      expect(forward).toHaveFocus();

      await user.click(back);
      expect(scrollBy).toHaveBeenLastCalledWith({ left: -400 * SCROLL_SHARE, behavior: "smooth" });
    });
  });
});
