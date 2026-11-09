import { RouteLoading } from "@/components/route-loading";

// Portal routes keep a loading screen; public marketing pages render straight
// to HTML (the root loading.tsx used to stream "Loading..." first on every page).
export default RouteLoading;
