import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroup } from "./RadioGroup";

const OPTIONS = [
  { value: "closed", label: "It is closed" },
  { value: "other", label: "Something else" },
] as const;

describe("RadioGroup", () => {
  it("renders a labelled fieldset with one radio per option, and the checked one matches value", () => {
    render(
      <RadioGroup name="reason" legend="Why?" options={OPTIONS} value="other" onChange={jest.fn()} />,
    );
    expect(screen.getByRole("group", { name: "Why?" })).toBeInTheDocument();
    expect(screen.getByLabelText("It is closed")).not.toBeChecked();
    expect(screen.getByLabelText("Something else")).toBeChecked();
    expect(screen.getByLabelText("It is closed")).toHaveAttribute("name", "reason");
  });

  it("calls onChange with the option's value when its label is clicked", async () => {
    const onChange = jest.fn();
    render(
      <RadioGroup name="reason" legend="Why?" options={OPTIONS} value={null} onChange={onChange} />,
    );
    await userEvent.click(screen.getByText("It is closed"));
    expect(onChange).toHaveBeenCalledWith("closed");
  });

  it("links the error message to the group with aria-describedby", () => {
    render(
      <RadioGroup
        name="reason"
        legend="Why?"
        options={OPTIONS}
        value={null}
        onChange={jest.fn()}
        error="Pick a reason."
      />,
    );
    const group = screen.getByRole("group", { name: "Why?" });
    const error = screen.getByText("Pick a reason.");
    expect(group).toHaveAttribute("aria-describedby", error.id);
  });

  it("has no error link when there is no error", () => {
    render(<RadioGroup name="reason" legend="Why?" options={OPTIONS} value={null} onChange={jest.fn()} />);
    expect(screen.getByRole("group", { name: "Why?" })).not.toHaveAttribute("aria-describedby");
  });
});
