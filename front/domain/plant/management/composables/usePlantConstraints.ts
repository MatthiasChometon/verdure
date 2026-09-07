export const usePlantConstraints = (): {
  nameMaxLength: number;
  speciesMaxLength: number;
  descriptionMaxLength: number;
  journalNoteMaxLength: number;
} => ({
  nameMaxLength: 60,
  speciesMaxLength: 120,
  descriptionMaxLength: 500,
  journalNoteMaxLength: 1000,
});
