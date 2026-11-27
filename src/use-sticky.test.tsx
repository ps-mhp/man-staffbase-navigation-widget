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

import React, { useRef } from "react";
import { act, render } from "@testing-library/react";

import { measureChromeHeight } from "@shared/staffbase-chrome";

import { STUCK_CLASS, STUCK_Z_INDEX, shouldStick, useSticky } from "./use-sticky";

jest.mock("@shared/staffbase-chrome", () => ({ measureChromeHeight: jest.fn(() => 64) }));

const chrome = jest.mocked(measureChromeHeight);

/** jsdom rechnet kein Layout: Lage von Platzhalter und Leiste von Hand. */
let slotTop = 200;
let barShift = { x: 0, y: 0 };

function rect(top: number, left: number, width: number, height: number): DOMRect {
  return { top, left, width, height, bottom: top + height, right: left + width, x: left, y: top } as DOMRect;
}

function Harness({ enabled }: { enabled: boolean }): React.JSX.Element {
  const slotRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  useSticky(slotRef, barRef, enabled);
  return (
    <div data-testid="slot" ref={slotRef}>
      <nav data-testid="bar" ref={barRef} />
    </div>
  );
}

function mount(enabled = true): { slot: HTMLElement; bar: HTMLElement; unmount: () => void } {
  const view = render(<Harness enabled={enabled} />);
  const slot = view.getByTestId("slot");
  const bar = view.getByTestId("bar");
  slot.getBoundingClientRect = () => rect(slotTop, 100, 800, 44);
  bar.getBoundingClientRect = () => {
    const top = parseFloat(bar.style.top || "0") + barShift.y;
    const left = parseFloat(bar.style.left || "0") + barShift.x;
    return rect(top, left, 800, 44);
  };
  Object.defineProperty(bar, "offsetHeight", { configurable: true, get: () => 44 });
  return { slot, bar, unmount: view.unmount };
}

function scrollTo(top: number): void {
  slotTop = top;
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

beforeEach(() => {
  slotTop = 200;
  barShift = { x: 0, y: 0 };
  chrome.mockReturnValue(64);
  window.history.replaceState(null, "", "/content/page/6a73580860fe1414378d4660");
});

describe("shouldStick", () => {
  it("klebt, sobald der Platz unter die Kopfzeile rückt", () => {
    expect(shouldStick(65, 64)).toBe(false);
    expect(shouldStick(64, 64)).toBe(false);
    expect(shouldStick(63, 64)).toBe(true);
  });
});

describe("useSticky", () => {
  it("klebt die Leiste unter die Kopfzeile und hält ihren Platz frei", () => {
    const { slot, bar } = mount();
    expect(bar).not.toHaveClass(STUCK_CLASS);

    scrollTo(-500);
    expect(bar).toHaveClass(STUCK_CLASS);
    expect(bar.style.top).toBe("64px");
    expect(bar.style.left).toBe("100px");
    expect(bar.style.width).toBe("800px");
    expect(slot.style.height).toBe("44px");
  });

  // Vorgabe 27.11.2026: die Linie endet nicht an der Flucht der Leiste.
  it("spannt Fläche und Linie über die ganze Fensterbreite", () => {
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 1280 });
    const { bar } = mount();
    scrollTo(-500);
    expect(bar.style.getPropertyValue("--man-nav-band-left")).toBe("-100px");
    expect(bar.style.getPropertyValue("--man-nav-band-width")).toBe("1280px");

    scrollTo(120);
    expect(bar.style.getPropertyValue("--man-nav-band-left")).toBe("");
  });

  // Pflicht: bis ans Ende der Seite – nicht nur bis zum Ende des Abschnitts.
  it("bleibt kleben, wie weit auch gescrollt wird, und folgt der Kopfzeile", () => {
    const { bar } = mount();
    scrollTo(-500);
    chrome.mockReturnValue(0);
    scrollTo(-20000);
    expect(bar).toHaveClass(STUCK_CLASS);
    expect(bar.style.top).toBe("0px");
  });

  it("löst die Leiste, wenn ihr Platz wieder unter der Kopfzeile auftaucht", () => {
    const { slot, bar } = mount();
    scrollTo(-500);
    scrollTo(120);
    expect(bar).not.toHaveClass(STUCK_CLASS);
    expect(bar.style.top).toBe("");
    expect(slot.style.height).toBe("");
  });

  it("rechnet einen verschobenen Bezugskasten heraus", () => {
    const { bar } = mount();
    barShift = { x: 30, y: 10 };
    scrollTo(-500);
    expect(bar.style.top).toBe("54px");
    expect(bar.style.left).toBe("70px");
  });

  // Altes Staffbase-UI: der Bezugskasten rollt mit der Seite.
  it("folgt einem mitrollenden Bezugskasten bei jedem Scrollen", () => {
    const { bar } = mount();
    scrollTo(-500);
    barShift = { x: 0, y: -300 };
    scrollTo(-800);
    expect(bar.style.top).toBe("364px");
    expect(bar.getBoundingClientRect().top).toBe(64);
  });

  // Altes Staffbase-UI: `#content` trägt `transform: matrix(1, 0, 0, 1, 0, 0)`.
  it("schaltet wirkungslose Transformationen der Vorfahren nur beim Ankleben ab", () => {
    const { slot } = mount();
    const content = slot.parentElement as HTMLElement;
    content.style.transform = "matrix(1, 0, 0, 1, 0, 0)";
    const rotated = content.parentElement as HTMLElement;
    rotated.style.transform = "rotate(1deg)";

    scrollTo(-500);
    expect(content.style.transform).toBe("none");
    expect(content.style.getPropertyPriority("transform")).toBe("important");
    expect(rotated.style.transform).toBe("rotate(1deg)");

    scrollTo(120);
    expect(content.style.transform).toBe("matrix(1, 0, 0, 1, 0, 0)");
    expect(content.style.getPropertyPriority("transform")).toBe("");
  });

  // Altes Staffbase-UI: Hüllen mit `position: relative; z-index: 1`, die
  // folgenden Blöcke malten über die Leiste.
  it("hebt Stapelkontexte der Vorfahren nur beim Ankleben an", () => {
    const { slot } = mount();
    const wrapper = slot.parentElement as HTMLElement;
    wrapper.style.position = "relative";
    wrapper.style.zIndex = "1";
    const high = wrapper.parentElement as HTMLElement;
    high.style.position = "relative";
    high.style.zIndex = "100";

    scrollTo(-500);
    expect(wrapper.style.zIndex).toBe(String(STUCK_Z_INDEX));
    expect(high.style.zIndex).toBe("100");

    scrollTo(120);
    expect(wrapper.style.zIndex).toBe("1");
    expect(wrapper.style.getPropertyPriority("z-index")).toBe("");
  });

  it("klebt nicht, wenn Sticky aus ist", () => {
    const { bar } = mount(false);
    scrollTo(-500);
    expect(bar).not.toHaveClass(STUCK_CLASS);
  });

  it("klebt nicht im Studio", () => {
    window.history.replaceState(null, "", "/studio/content/page/6a73580860fe1414378d4660/edit");
    const { bar } = mount();
    scrollTo(-500);
    expect(bar).not.toHaveClass(STUCK_CLASS);
  });

  it("räumt beim Aushängen auf", () => {
    const { slot, bar, unmount } = mount();
    scrollTo(-500);
    unmount();
    expect(bar).not.toHaveClass(STUCK_CLASS);
    expect(slot.style.height).toBe("");
  });
});
