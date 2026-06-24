import { Outlet } from "react-router-dom";

const EmptyLayout = () => (
  <div className="min-h-dvh bg-background flex items-center justify-center">
    <main className="w-full">
      <Outlet />
    </main>
  </div>
);

export default EmptyLayout;
