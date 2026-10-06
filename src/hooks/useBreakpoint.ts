import { Grid } from 'antd';

/**
 * Unified responsive breakpoint hook.
 *
 * Uses Ant Design's default breakpoints:
 * xs <576, sm ≥576, md ≥768, lg ≥992, xl ≥1200, xxl ≥1600
 *
 * `isMobile` is true below the `sm` threshold (<576px) and is used to switch
 * between the desktop (table / sider) and mobile (card list / drawer) layouts.
 */
export function useBreakpoint() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  return { screens, isMobile };
}
