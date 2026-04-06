import { createContext, useContext, useLayoutEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";

const DashboardScrollContext = createContext({
  scrollToTop: () => {},
  scrollToSection: () => {},
});

export function useDashboardScroll() {
  return useContext(DashboardScrollContext);
}

function isDesktopViewport() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}

function getDashboardMainNode() {
  return document.querySelector("[data-dashboard-main]");
}

export function scrollDashboardToTop(behavior = "auto") {
  const mainNode = getDashboardMainNode();

  if (mainNode && isDesktopViewport()) {
    mainNode.scrollTo({ top: 0, behavior });
    mainNode.focus({ preventScroll: true });
    return;
  }

  window.scrollTo({ top: 0, behavior });
  mainNode?.focus({ preventScroll: true });
}

export function scrollDashboardToSection(sectionId, options = {}) {
  const target = document.getElementById(sectionId);
  const mainNode = getDashboardMainNode();

  if (!target) {
    scrollDashboardToTop(options.behavior || "auto");
    return;
  }

  if (mainNode && isDesktopViewport()) {
    const containerBounds = mainNode.getBoundingClientRect();
    const targetBounds = target.getBoundingClientRect();
    const offset = options.offset ?? 0;
    const top = mainNode.scrollTop + targetBounds.top - containerBounds.top - offset;

    mainNode.scrollTo({
      top: Math.max(top, 0),
      behavior: options.behavior || "smooth",
    });
    mainNode.focus({ preventScroll: true });
    return;
  }

  target.scrollIntoView({ behavior: options.behavior || "smooth", block: "start" });
  mainNode?.focus({ preventScroll: true });
}

export default function DashboardShell({
  sidebar,
  header,
  children,
  backgroundClassName = "",
  shellClassName = "",
  contentClassName = "",
  sidebarWidth = "280px",
}) {
  const mainRef = useRef(null);
  const location = useLocation();

  const scrollToTop = (behavior = "auto") => scrollDashboardToTop(behavior);

  const scrollToSection = (sectionId, options = {}) => scrollDashboardToSection(sectionId, options);

  useLayoutEffect(() => {
    scrollToTop("auto");
  }, [location.pathname, location.search]);

  const scrollApi = useMemo(
    () => ({
      scrollToTop,
      scrollToSection,
    }),
    []
  );

  return (
    <DashboardScrollContext.Provider value={scrollApi}>
      <div
        className={`dashboard-shell ${backgroundClassName} ${shellClassName}`}
        style={{ "--dashboard-sidebar-width": sidebarWidth }}
      >
        <aside className="dashboard-sidebar">
          {sidebar}
        </aside>

        <div className="dashboard-main">
          <header className="dashboard-header">
            {header}
          </header>

          <main
            ref={mainRef}
            tabIndex={-1}
            data-dashboard-main
            className={`dashboard-content-scroll ${contentClassName}`}
          >
            {children}
          </main>
        </div>
      </div>
    </DashboardScrollContext.Provider>
  );
}
