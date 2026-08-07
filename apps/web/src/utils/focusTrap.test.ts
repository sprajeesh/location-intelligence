import { getFocusableElements, getNextFocusable } from "./focusTrap";

function makeButtons(count: number, container: HTMLElement): HTMLButtonElement[] {
  const buttons: HTMLButtonElement[] = [];
  for (let i = 0; i < count; i++) {
    const button = document.createElement("button");
    button.textContent = `button-${i}`;
    container.appendChild(button);
    buttons.push(button);
  }
  return buttons;
}

describe("getFocusableElements", () => {
  it("returns focusable descendants in DOM order", () => {
    const container = document.createElement("div");
    const buttons = makeButtons(3, container);
    expect(getFocusableElements(container)).toEqual(buttons);
  });

  it("excludes disabled elements", () => {
    const container = document.createElement("div");
    const created = makeButtons(2, container);
    const enabled = created[0]!;
    const disabled = created[1]!;
    disabled.disabled = true;
    expect(getFocusableElements(container)).toEqual([enabled]);
  });

  it("excludes elements with tabindex=-1", () => {
    const container = document.createElement("div");
    const div = document.createElement("div");
    div.tabIndex = -1;
    container.appendChild(div);
    expect(getFocusableElements(container)).toEqual([]);
  });

  it("returns an empty array when there is nothing focusable", () => {
    const container = document.createElement("div");
    expect(getFocusableElements(container)).toEqual([]);
  });
});

describe("getNextFocusable", () => {
  let container: HTMLElement;
  let buttons: HTMLButtonElement[];

  beforeEach(() => {
    container = document.createElement("div");
    buttons = makeButtons(3, container);
  });

  describe("forward", () => {
    it("moves to the next element", () => {
      expect(getNextFocusable(buttons, buttons[0]!, "forward")).toBe(buttons[1]);
      expect(getNextFocusable(buttons, buttons[1]!, "forward")).toBe(buttons[2]);
    });

    it("wraps from the last element to the first", () => {
      expect(getNextFocusable(buttons, buttons[2]!, "forward")).toBe(buttons[0]);
    });
  });

  describe("backward", () => {
    it("moves to the previous element", () => {
      expect(getNextFocusable(buttons, buttons[2]!, "backward")).toBe(buttons[1]);
      expect(getNextFocusable(buttons, buttons[1]!, "backward")).toBe(buttons[0]);
    });

    it("wraps from the first element to the last", () => {
      expect(getNextFocusable(buttons, buttons[0]!, "backward")).toBe(buttons[2]);
    });
  });

  it("treats an element outside the focusable list as before the start, in both directions", () => {
    const outsider = document.createElement("button");
    expect(getNextFocusable(buttons, outsider, "forward")).toBe(buttons[0]);
    expect(getNextFocusable(buttons, outsider, "backward")).toBe(buttons[2]);
  });

  it("treats a null current element as before the start, in both directions", () => {
    expect(getNextFocusable(buttons, null, "forward")).toBe(buttons[0]);
    expect(getNextFocusable(buttons, null, "backward")).toBe(buttons[2]);
  });

  it("returns null when there is nothing focusable", () => {
    expect(getNextFocusable([], buttons[0]!, "forward")).toBeNull();
    expect(getNextFocusable([], null, "backward")).toBeNull();
  });

  it("stays on the same element when it is the only focusable one", () => {
    const only = [buttons[0]!];
    expect(getNextFocusable(only, buttons[0]!, "forward")).toBe(buttons[0]);
    expect(getNextFocusable(only, buttons[0]!, "backward")).toBe(buttons[0]);
  });
});
