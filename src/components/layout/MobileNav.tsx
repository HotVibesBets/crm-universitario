"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  LayoutDashboard, 
  Users, 
  MessageSquareText, 
  GraduationCap, 
  BookOpenCheck
} from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role || "";

  // Rutas principales para la barra inferior
  const routes = [
    {
      label: "Panel",
      icon: LayoutDashboard,
      href: "/dashboard",
      show: true,
    },
    {
      label: "Leads",
      icon: Users,
      href: "/leads",
      show: true,
    },
    {
      label: "Seguimiento",
      icon: MessageSquareText,
      href: "/seguimientos",
      show: true,
    },
    {
      label: "Inscritos",
      icon: GraduationCap,
      href: "/inscritos",
      show: true,
    },
    {
      label: "Grupos",
      icon: BookOpenCheck,
      href: "/grupos",
      show: ["Dirección", "Marketing", "Campus", "Asesor"].includes(role),
    },
  ];

  const visibleRoutes = routes.filter(r => r.show);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-16">
        {visibleRoutes.map((route) => {
          // Check if active (exact match for dashboard, prefix match for others)
          const isActive = pathname === route.href || (route.href !== "/dashboard" && pathname.startsWith(route.href));
          return (
            <Link
              key={route.href}
              href={route.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <route.icon className={`w-5 h-5 ${isActive ? "text-blue-600 fill-blue-600/20" : "text-slate-500"}`} />
              <span className="text-[10px] font-medium tracking-wide">{route.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
