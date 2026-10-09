import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("renders a multi-line field with the shared input styling and passes native props through", async () => {
    render(<Textarea aria-label="Message" rows={4} maxLength={10} className="w-full" />);
    const field = screen.getByRole("textbox", { name: "Message" });
    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toHaveAttribute("rows", "4");
    expect(field).toHaveClass("border-slate-300", "w-full");
    await userEvent.type(field, "hello");
    expect(field).toHaveValue("hello");
  });
});
