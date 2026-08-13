"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  {
    label: "Home",
    href: "/",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    disabled: false,
  },
  {
    label: "Chat",
    href: "#",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    disabled: true,
  },
  {
    label: "Meetings",
    href: "#",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    disabled: true,
  },
  {
    label: "Contacts",
    href: "#",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    disabled: true,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[72px] bg-white border-r flex flex-col items-center py-5 z-40"
      style={{ borderColor: "var(--zoom-sidebar-border)" }}
    >
      {/* Zoom Logo */}
      <div className="mb-8 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#2D8CFF" />
          <path
            d="M8 12.5C8 11.12 9.12 10 10.5 10H17.5C18.88 10 20 11.12 20 12.5V19.5C20 20.88 18.88 22 17.5 22H10.5C9.12 22 8 20.88 8 19.5V12.5Z"
            fill="white"
          />
          <path d="M20 14L24 11V21L20 18V14Z" fill="white" />
        </svg>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = !item.disabled && pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.disabled ? "#" : item.href}
              onClick={(e) => item.disabled && e.preventDefault()}
              className={`
                flex flex-col items-center justify-center w-[56px] h-[56px] rounded-xl
                transition-all duration-150 group relative
                ${isActive
                  ? "text-[var(--zoom-blue)] bg-[#EBF4FF]"
                  : item.disabled
                    ? "text-[#B0B0B8] cursor-not-allowed opacity-60"
                    : "text-[var(--zoom-text-secondary)] hover:bg-[#F0F0F5] hover:text-[var(--foreground)]"
                }
              `}
            >
              <span className="w-5 h-5">{item.icon}</span>
              <span className="text-[10px] mt-1 font-medium leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-[var(--zoom-blue)] rounded-r-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
