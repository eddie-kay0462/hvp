import { useOutletContext } from "react-router-dom";

export interface DashboardContext {
  /** Re-check the setup steps after the vendor saves something. */
  refreshSetup: () => void;
}

/** For dashboard tabs; a no-op outside the dashboard layout. */
export const useDashboard = (): DashboardContext =>
  useOutletContext<DashboardContext | undefined>() ?? { refreshSetup: () => {} };
