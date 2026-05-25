import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-8">
        <p className="text-slate-600 text-lg">
          Bienvenido al Portal Operativo, <strong className="text-slate-800">{session?.user?.name}</strong>.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 font-medium mb-1">Rol Actual</p>
            <p className="text-2xl font-bold text-slate-800">{session?.user?.role}</p>
          </div>
          <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 font-medium mb-1">Campus Asignado</p>
            <p className="text-2xl font-bold text-slate-800">{session?.user?.campus}</p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-50/50 border border-blue-100 rounded-xl">
          <h3 className="text-blue-800 font-semibold text-lg mb-2">Próximos Pasos</h3>
          <ul className="list-disc list-inside text-blue-700/80 space-y-2">
            <li>Navega a la sección de <strong>Leads</strong> para ver a tus prospectos.</li>
            <li>Registra interacciones en <strong>Seguimientos</strong>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


