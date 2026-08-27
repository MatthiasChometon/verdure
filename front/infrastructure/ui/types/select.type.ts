// A label/value pair for select-style inputs (USelect, USelectMenu…). Value
// defaults to string; parameterize it for a narrower key (an enum union, etc.).
export type SelectItem<Value = string> = {
  label: string;
  value: Value;
  // Greyed out and unselectable (e.g. an option that needs a capability that is
  // not currently available).
  disabled?: boolean;
};
