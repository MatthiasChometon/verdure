export default defineAppConfig({
  ui: {
    colors: {
      // Custom ramps live in infrastructure/ui/style/main.css (@theme).
      primary: 'green', // Canopée
      secondary: 'clay', // Terre cuite (warm accent)
      neutral: 'stone', // warm greys, not cold slate
    },
    // Default skeletons (bg-elevated) vanish on the warm cream ground — bump them
    // to bg-accented so loading states read clearly.
    skeleton: {
      base: 'animate-pulse rounded-md bg-accented',
    },
  },
});
