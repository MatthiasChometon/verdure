import { UIcon } from '#components';
import type { VueWrapper } from '@vue/test-utils';

// Icons render as inline SVG paths (icon mode `svg`), so the HTML no longer carries their names:
// read the `name` prop of each rendered icon component instead.
export const iconNames = (wrapper: VueWrapper): string[] =>
  wrapper.findAllComponents(UIcon).map((icon): string => String(icon.props('name')));
