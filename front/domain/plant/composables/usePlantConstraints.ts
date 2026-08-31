export const usePlantConstraints = (): {
  nameMaxLength: number;
  speciesMaxLength: number;
  descriptionMaxLength: number;
} => ({
  nameMaxLength: 60,
  speciesMaxLength: 120,
  descriptionMaxLength: 500,
});
