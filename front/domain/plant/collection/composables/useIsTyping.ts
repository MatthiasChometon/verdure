// Single-key shortcuts must never fire while the user is typing in a field.
export const useIsTyping = (): { isTyping: () => boolean } => {
  const isTyping = (): boolean => {
    const element = document.activeElement;
    return (
      element instanceof HTMLElement &&
      (element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'SELECT' ||
        element.isContentEditable)
    );
  };

  return { isTyping };
};
