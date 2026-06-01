"use client";

export function PrioritySelect({ value }: { value: string }) {
  return (
    <select
      key={value}
      name="priority"
      defaultValue={value}
      onChange={(e) => (e.currentTarget.form as HTMLFormElement)?.requestSubmit()}
      className="input w-auto py-1.5 text-xs"
    >
      <option value="low">Low</option>
      <option value="normal">Normal</option>
      <option value="high">High</option>
      <option value="urgent">Urgent</option>
    </select>
  );
}
