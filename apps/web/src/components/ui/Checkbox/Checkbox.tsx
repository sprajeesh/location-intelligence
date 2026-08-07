export interface CheckboxProps {
  id: string;
  checked: boolean;
  label: string;
  color?: string;
}

/**
 * Checkbox — read-only labeled checkbox row with an optional color dot.
 * Always disabled: this renders state (e.g. a facility's default-on flag),
 * it does not accept input.
 */
export function Checkbox({ id, checked, label, color }: CheckboxProps) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled
        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 accent-blue-500 disabled:opacity-70"
      />
      {color && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
      <label htmlFor={id} className="text-sm text-slate-200 cursor-default select-none">
        {label}
      </label>
    </div>
  );
}

export default Checkbox;
