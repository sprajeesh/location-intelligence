export interface CheckboxProps {
  id: string;
  checked: boolean;
  label: string;
  color?: string;
  onChange?: (checked: boolean) => void;
}

/**
 * Checkbox — labeled checkbox row with an optional color dot. Interactive
 * when `onChange` is passed; otherwise renders read-only (e.g. to display
 * a fixed state with nothing for the user to change).
 */
export function Checkbox({ id, checked, label, color, onChange }: CheckboxProps) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-0.5 rounded-md">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={!onChange}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="w-4 h-4 rounded border-slate-300 bg-white text-primary-600 accent-primary-600 disabled:opacity-50"
      />
      {color && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
      <label
        htmlFor={id}
        className={`text-sm text-slate-700 select-none ${onChange ? "cursor-pointer" : "cursor-default"}`}
      >
        {label}
      </label>
    </div>
  );
}

export default Checkbox;
