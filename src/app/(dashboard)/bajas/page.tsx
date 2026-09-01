import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { googleSheets } from "@/lib/google-sheets";
import { Users, Search, Frown } from "lucide-react";
import Link from "next/link";
import { AccionRecuperacionForm } from "@/components/bajas/AccionRecuperacionForm";
import { parseSeguimientoDate } from "@/lib/date-utils";
import { BajasChart } from "@/components/bajas/BajasChart";

export default async function BajasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mes?: string; campusFilter?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const role = session.user.role;
  const campus = session.user.campus;

  const allLeads = await googleSheets.getLeads();
  
  // Filtrar solo las bajas
  let bajas = allLeads.filter(l => l.statusLead === 'Baja de Calidad' || l.statusLead === 'Baja' || l.statusLead === 'Descartado');

  // Filtrar por campus
  if (role === "Campus" || role === "Asesor" || role === "Dirección") {
    bajas = bajas.filter(l => l.campusInteres === campus);
  }

  const resolvedParams = await searchParams;
  const campusQuery = resolvedParams.campusFilter || "Todos";

  // Si es Admin/Marketing y seleccionaron un campus en el filtro
  if ((role === "Admin" || role === "Marketing") && campusQuery !== "Todos") {
    bajas = bajas.filter(l => l.campusInteres === campusQuery);
  }

  // Extraer campus únicos para el select
  const uniqueCampuses = Array.from(new Set(allLeads.map(l => l.campusInteres).filter(Boolean))).sort();

  const searchQuery = resolvedParams.q?.toLowerCase() || "";
  const mesQuery = resolvedParams.mes || ""; // Format: YYYY-MM

  if (mesQuery) {
    const [yearStr, monthStr] = mesQuery.split('-');
    const filterYear = parseInt(yearStr);
    const filterMonth = parseInt(monthStr) - 1; // 0-indexed

    bajas = bajas.filter(l => {
      if (!l.ultimaActualizacion) return false;
      const date = parseSeguimientoDate(l.ultimaActualizacion);
      if (!date) return false;
      return date.getFullYear() === filterYear && date.getMonth() === filterMonth;
    });
  }

  if (searchQuery) {
    bajas = bajas.filter(l => {
      const valores = Object.values(l).map(v => String(v).toLowerCase());
      return valores.some(v => v.includes(searchQuery));
    });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Frown className="w-6 h-6 text-red-500" />
            Bajas y Descartados
          </h1>
          <p className="text-slate-500 mt-1">
            Alumnos que declinaron en Llamada de Calidad o solicitaron baja de colegiatura.
          </p>
        </div>

        <form className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Buscar baja..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none shadow-sm text-slate-900"
            />
          </div>
          
          <input 
            type="month" 
            name="mes" 
            defaultValue={mesQuery}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none shadow-sm text-slate-900"
          />

          {(role === "Admin" || role === "Marketing") && (
            <select
              name="campusFilter"
              defaultValue={campusQuery}
              className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none shadow-sm text-slate-900"
            >
              <option value="Todos">Todos los Campus</option>
              {uniqueCampuses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <button type="submit" className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors shadow-sm whitespace-nowrap">
            Filtrar
          </button>
        </form>
      </div>

      {bajas.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">Tasa de Recuperación</h2>
          <BajasChart data={bajas} />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {bajas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Prospecto</th>
                  <th className="px-6 py-4">Campus</th>
                  <th className="px-6 py-4">Status / Fase</th>
                  <th className="px-6 py-4">Motivo Guardado</th>
                  <th className="px-6 py-4 w-72">Acción de Recuperación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bajas.map((lead, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/leads/${lead.idLead}`} className="font-bold text-blue-600 hover:underline">
                        {lead.prospecto}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">{lead.celular}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700">{lead.campusInteres}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold border border-red-100">
                        {lead.statusLead}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 italic block mb-2">
                        {lead.statusColegiatura || lead.comentario || "Sin motivo"}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Baja el: {lead.ultimaActualizacion || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <AccionRecuperacionForm lead={lead} isDireccion={["Dirección", "Admin", "Marketing"].includes(role)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-red-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No hay bajas registradas</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              Aún no hay alumnos que hayan declinado o sido dados de baja del sistema.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
