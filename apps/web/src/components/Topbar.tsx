"use client";

import { NotificationBell } from "./NotificationBell";
import { useUi } from "@/store/ui";

// App topbar: mobile menu toggle (hidden on md+) + notification bell.
export function Topbar() {
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  return (
    <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-border sticky top-0 bg-bg/90 backdrop-blur z-20">
      <button
        className="md:hidden text-xl"
        onClick={toggleSidebar}
        aria-label="Open navigation menu"
      >
        ☰
      </button>
      <div className="flex-1" />
      <NotificationBell />
    </div>
  );
}
