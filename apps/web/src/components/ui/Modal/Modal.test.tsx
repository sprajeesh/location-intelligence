import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";
import { ModalHeader } from "./ModalHeader";
import { ModalContent } from "./ModalContent";
import { ModalFooter } from "./ModalFooter";

function renderModal(onClose: () => void, withFooter = false) {
  return render(
    <Modal onClose={onClose} aria-labelledby="test-title">
      <ModalHeader titleId="test-title" title="Test Modal" onClose={onClose} closeLabel="Close" />
      <ModalContent>
        <button type="button">Inside</button>
      </ModalContent>
      {withFooter && (
        <ModalFooter>
          <button type="button">Save</button>
        </ModalFooter>
      )}
    </Modal>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Modal", () => {
  describe("Rendering", () => {
    it("exposes role=dialog with aria-modal and a matching aria-labelledby title", () => {
      renderModal(jest.fn());
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      const labelledBy = dialog.getAttribute("aria-labelledby");
      expect(document.getElementById(labelledBy!)).toHaveTextContent("Test Modal");
    });

    it("renders children inside the content area", () => {
      renderModal(jest.fn());
      expect(screen.getByText("Inside")).toBeInTheDocument();
    });
  });

  describe("Closing", () => {
    it("calls onClose when the close button is clicked", async () => {
      const onClose = jest.fn();
      renderModal(onClose);
      await userEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when the backdrop is clicked", async () => {
      const onClose = jest.fn();
      renderModal(onClose);
      await userEvent.click(screen.getByRole("dialog").parentElement!.parentElement!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose when the panel content is clicked", async () => {
      const onClose = jest.fn();
      renderModal(onClose);
      await userEvent.click(screen.getByText("Inside"));
      expect(onClose).not.toHaveBeenCalled();
    });

    it("calls onClose when Escape is pressed", () => {
      const onClose = jest.fn();
      renderModal(onClose);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Focus management", () => {
    it("moves focus into the dialog when it opens", () => {
      renderModal(jest.fn());
      const dialog = screen.getByRole("dialog");
      expect(document.activeElement).toBe(dialog);
    });

    it("moves focus to the first focusable element when Tab is pressed", () => {
      renderModal(jest.fn());
      const closeButton = screen.getByRole("button", { name: "Close" });
      fireEvent.keyDown(document, { key: "Tab" });
      expect(document.activeElement).toBe(closeButton);
    });

    it("wraps to the last focusable element when Shift+Tab is pressed", () => {
      renderModal(jest.fn());
      const insideButton = screen.getByText("Inside");
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(insideButton);
    });

    it("cycles Tab across multiple focusable elements, including a footer", () => {
      renderModal(jest.fn(), true);
      const closeButton = screen.getByRole("button", { name: "Close" });
      const insideButton = screen.getByText("Inside");
      const saveButton = screen.getByText("Save");

      fireEvent.keyDown(document, { key: "Tab" });
      expect(document.activeElement).toBe(closeButton);
      fireEvent.keyDown(document, { key: "Tab" });
      expect(document.activeElement).toBe(insideButton);
      fireEvent.keyDown(document, { key: "Tab" });
      expect(document.activeElement).toBe(saveButton);
      fireEvent.keyDown(document, { key: "Tab" });
      expect(document.activeElement).toBe(closeButton);
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(saveButton);
    });

    it("keeps focus inside the dialog across repeated Tab presses rather than escaping it", () => {
      renderModal(jest.fn());
      const closeButton = screen.getByRole("button", { name: "Close" });
      const insideButton = screen.getByText("Inside");
      fireEvent.keyDown(document, { key: "Tab" });
      expect(document.activeElement).toBe(closeButton);
      fireEvent.keyDown(document, { key: "Tab" });
      expect(document.activeElement).toBe(insideButton);
      fireEvent.keyDown(document, { key: "Tab" });
      expect(document.activeElement).toBe(closeButton);
    });

    it("pulls focus back into the dialog on Tab if focus had moved outside it", () => {
      const outsideButton = document.createElement("button");
      document.body.appendChild(outsideButton);

      renderModal(jest.fn());
      outsideButton.focus();
      expect(document.activeElement).toBe(outsideButton);

      fireEvent.keyDown(document, { key: "Tab" });
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));

      document.body.removeChild(outsideButton);
    });

    it("restores focus to the previously focused element on unmount", () => {
      const opener = document.createElement("button");
      document.body.appendChild(opener);
      opener.focus();
      expect(document.activeElement).toBe(opener);

      const { unmount } = renderModal(jest.fn());
      expect(document.activeElement).not.toBe(opener);

      unmount();
      expect(document.activeElement).toBe(opener);

      document.body.removeChild(opener);
    });

    it("does not restore focus to the opener merely because onClose's identity changes across re-renders", () => {
      const opener = document.createElement("button");
      document.body.appendChild(opener);
      opener.focus();

      const { rerender } = render(
        <Modal onClose={jest.fn()} aria-labelledby="test-title">
          <ModalHeader titleId="test-title" title="Test Modal" onClose={jest.fn()} closeLabel="Close" />
          <ModalContent>
            <button type="button">Inside</button>
          </ModalContent>
        </Modal>,
      );
      const dialog = screen.getByRole("dialog");
      expect(document.activeElement).toBe(dialog);

      rerender(
        <Modal onClose={jest.fn()} aria-labelledby="test-title">
          <ModalHeader titleId="test-title" title="Test Modal" onClose={jest.fn()} closeLabel="Close" />
          <ModalContent>
            <button type="button">Inside</button>
          </ModalContent>
        </Modal>,
      );
      expect(document.activeElement).toBe(dialog);
      expect(document.activeElement).not.toBe(opener);

      document.body.removeChild(opener);
    });
  });

  describe("Prop forwarding", () => {
    it("forwards arbitrary props like aria-label to the dialog element", () => {
      render(
        <Modal onClose={jest.fn()} aria-label="Anonymous dialog">
          <ModalContent>content</ModalContent>
        </Modal>,
      );
      expect(screen.getByRole("dialog", { name: "Anonymous dialog" })).toBeInTheDocument();
    });
  });
});
