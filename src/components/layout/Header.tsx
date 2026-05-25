"use client";

import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Bell, Search } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  
  // Mapear rutas a títulos
  const getTitle = () => {
    if (pathname === "/dashboard") return "Panel Operativo";
    if (pathname.includes("/leads")) return "Gestión de Leads";
    if (pathname.includes("/seguimientos")) return "Seguimientos";
    if (pathname.includes("/inscritos")) return "Alumnos Inscritos";
    if (pathname.includes("/grupos")) return "Apertura de Grupos";
    return "CRM Universitario";
  };

  return (
    <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shadow-sm shrink-0">
      <div className="flex items-center gap-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight truncate max-w-[200px] md:max-w-none">{getTitle()}</h2>
        
        <div className="hidden md:flex items-center relative">
          <Search className="w-4 h-4 absolute left-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por ID, nombre o correo..." 
            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 rounded-full">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="w-px h-8 bg-slate-200 mx-2"></div>
        <LogoutButton />
      </div>
    </header>
  );
}
