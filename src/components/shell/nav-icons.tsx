import type { NavIconName } from "./nav";

/** Ícones de traço do menu lateral (24×24, cor do texto). */
const PATHS: Record<NavIconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8.5" rx="1.75" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.75" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.75" />
      <rect x="3.5" y="15" width="7" height="5.5" rx="1.75" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-5.5h4v5.5h3.5a1 1 0 0 0 1-1V9" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5h4.5l1.5 2.5h5l1.5-2.5h4.5" />
      <path d="M6.2 5h11.6a1 1 0 0 1 .95.7l1.75 5.4v8.4a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-8.4l1.75-5.4a1 1 0 0 1 .95-.7z" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18.5" r="2.25" />
      <circle cx="18" cy="5.5" r="2.25" />
      <path d="M8.25 18.5h8.25a3.25 3.25 0 0 0 0-6.5h-9a3.25 3.25 0 0 1 0-6.5h8.25" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.3 2.8 17.4a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4M12 16.8h.01" />
    </>
  ),
  car: (
    <>
      <path d="M4 16.5V12l1.9-4.7A2 2 0 0 1 7.75 6h8.5a2 2 0 0 1 1.85 1.3L20 12v4.5" />
      <path d="M4 12h16" />
      <circle cx="7.5" cy="16.5" r="1.75" />
      <circle cx="16.5" cy="16.5" r="1.75" />
      <path d="M9.25 16.5h5.5M4 16.5h1.75M18.25 16.5H20" />
    </>
  ),
  steering: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.25" />
      <path d="M12 14.25v6.25M9.75 12H3.5M14.25 12h6.25" />
    </>
  ),
  building: (
    <>
      <path d="M4.5 20.5V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15.5" />
      <path d="M14.5 9h4a1 1 0 0 1 1 1v10.5" />
      <path d="M3 20.5h18" />
      <path d="M8 8h3M8 11.5h3M8 15h3M17 13h.01M17 16.5h.01" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.75 20a6.25 6.25 0 0 1 12.5 0" />
      <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6" />
      <path d="M18.25 14.2A6.25 6.25 0 0 1 21.25 20" />
    </>
  ),
  chart: (
    <>
      <path d="M3.5 20.5h17" />
      <rect x="5" y="11" width="3.25" height="6.5" rx="1" />
      <rect x="10.4" y="5.5" width="3.25" height="12" rx="1" />
      <rect x="15.75" y="13.5" width="3.25" height="4" rx="1" />
    </>
  ),
  plus: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
};

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
