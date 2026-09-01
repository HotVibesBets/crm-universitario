"use server";

import { googleSheets } from "@/lib/google-sheets";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function guardarAccionRecuperacionAction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const validRoles = ["Dirección", "Admin", "Marketing"];
    if (!session || !validRoles.includes(session.user.role)) {
      return { success: false, error: "No autorizado" };
    }

    const idLead = formData.get("idLead") as string;
    const accion = formData.get("accion") as string;
    const fecha = formData.get("fecha") as string; // Formato YYYY-MM-DD del input type="date"

    if (!idLead || !accion || !fecha) {
      return { success: false, error: "Faltan datos requeridos" };
    }

    const success = await googleSheets.updateAccionRecuperacion(idLead, {
      accion,
      fecha,
      vencida: "Pendiente" // Se inicializa como pendiente
    });

    if (success) {
      revalidatePath("/bajas");
      return { success: true };
    } else {
      return { success: false, error: "No se pudo actualizar el lead" };
    }
  } catch (error) {
    console.error("Error al guardar acción de recuperación:", error);
    return { success: false, error: "Ocurrió un error en el servidor" };
  }
}

export async function marcarSeguimientoRecuperacionAction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const validRoles = ["Dirección", "Admin", "Marketing"];
    if (!session || !validRoles.includes(session.user.role)) {
      return { success: false, error: "No autorizado" };
    }

    const idLead = formData.get("idLead") as string;
    const resultado = formData.get("resultado") as string;
    
    if (!idLead || !resultado) {
      return { success: false, error: "Falta el ID del lead o el resultado" };
    }

    const success = await googleSheets.updateAccionRecuperacion(idLead, {
      vencida: resultado // "Recuperado" o "No Recuperado"
    });

    if (success) {
      revalidatePath("/bajas");
      return { success: true };
    } else {
      return { success: false, error: "No se pudo actualizar el lead" };
    }
  } catch (error) {
    console.error("Error al marcar seguimiento de recuperación:", error);
    return { success: false, error: "Ocurrió un error en el servidor" };
  }
}
