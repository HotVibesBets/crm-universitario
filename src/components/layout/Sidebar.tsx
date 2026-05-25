"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  MessageSquareText, 
  GraduationCap, 
  BookOpenCheck,
  Building2
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role || "";

  // Definir rutas según el rol
  const routes = [
    {
      label: "Panel Operativo",
      icon: LayoutDashboard,
      href: "/dashboard",
      show: true, // Todos pueden ver su dashboard
    },
    {
      label: "Leads",
      icon: Users,
      href: "/leads",
      show: true, // Todos ven leads (filtrado en el servidor)
    },
    {
      label: "Nuevo Lead",
      icon: UserPlus,
      href: "/leads/nuevo",
      show: ["Dirección", "Marketing", "Campus"].includes(role), 
    },
    {
      label: "Seguimientos",
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

  return (
    <div className="hidden md:flex flex-col h-full bg-slate-900 text-slate-300 w-64 border-r border-slate-800 shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-orange-500 p-2 rounded-lg">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg tracking-wide">CRM UIN</h1>
          <p className="text-xs text-slate-400">Portal Operativo</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
          Menú Principal
        </div>
        
        {routes.filter(r => r.show).map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              pathname === route.href
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                : "hover:bg-slate-800 hover:text-white"
            }`}
          >
            <route.icon className={`w-5 h-5 ${pathname === route.href ? "text-white" : "text-slate-400"}`} />
            <span className="font-medium text-sm">{route.label}</span>
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-orange-400 font-bold border border-slate-700">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{session?.user?.name || ""}</p>
            <p className="text-xs text-slate-500 truncate">{`${role} - ${session?.user?.campus || ""}`}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
