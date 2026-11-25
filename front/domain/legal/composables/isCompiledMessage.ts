// What vue-i18n's `rt` types as a message: a message function or a plain string (or VNode).
export type CompiledMessage = Parameters<ReturnType<typeof useNuxtApp>['$i18n']['rt']>[0];

const isNonNullObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// `tm()` hands back the compiled form of a message: a message function, or the AST
// (`{ type, body, ... }`) that `rt` also renders although its typings do not list it.
// Check the shape `rt` reads, so a malformed node is refused instead of crashing the page.
export const isCompiledMessage = (value: unknown): value is CompiledMessage => {
  if (typeof value === 'function') {
    return true;
  }
  return isNonNullObject(value) && typeof value.type === 'number' && isNonNullObject(value.body);
};
