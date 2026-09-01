import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export class GoogleSheetsService {
  private doc: GoogleSpreadsheet;
  private initPromise: Promise<void> | null = null;
  private lastInitTime = 0;
  private rowsCache: Record<string, { time: number, promise: Promise<any[]> }> = {};
  private readonly CACHE_TTL = 30 * 1000; // 30 segundos

  constructor() {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) throw new Error("GOOGLE_SHEET_ID no está configurado en .env.local");

    this.doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
  }

  // Método para cargar la información del documento (con Caché Inteligente)
  async init() {
    const now = Date.now();
    if (this.initPromise && (now - this.lastInitTime < this.CACHE_TTL)) {
      return this.initPromise;
    }

    this.initPromise = this.doc.loadInfo().then(() => {
      this.lastInitTime = Date.now();
    }).catch(err => {
      this.initPromise = null;
      throw err;
    });

    return this.initPromise;
  }

  // Invalidar caché cuando hay escrituras
  invalidateCache(sheetTitle?: string) {
    if (sheetTitle) {
      delete this.rowsCache[sheetTitle];
    } else {
      this.rowsCache = {};
    }
  }

  // Obtener filas con caché
  async getCachedRows(sheetTitle: string) {
    await this.init();
    const sheet = this.doc.sheetsByTitle[sheetTitle];
    if (!sheet) return [];

    const now = Date.now();
    if (this.rowsCache[sheetTitle] && (now - this.rowsCache[sheetTitle].time < this.CACHE_TTL)) {
      return this.rowsCache[sheetTitle].promise;
    }

    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<any[]>(async (resolve, reject) => {
      try {
        const rows = await sheet.getRows();
        resolve(rows);
      } catch (err) {
        delete this.rowsCache[sheetTitle];
        reject(err);
      }
    });

    this.rowsCache[sheetTitle] = {
      time: now,
      promise
    };

    return promise;
  }

  // Ejemplo: Obtener todos los Asesores (para validar login)
  async getAsesores() {
    const rows = await this.getCachedRows('Asesores');
    const safeGet = (row: any, key: string) => {
      try {
        return row.get(key);
      } catch (e) {
        return undefined;
      }
    };

    return rows.map(row => ({
      correo: safeGet(row, 'Correo'),
      nombre: safeGet(row, 'Nombre'),
      campus: safeGet(row, 'Campus'),
      rol: safeGet(row, 'Rol'),
      password: safeGet(row, 'Contraseña'), // Columna para la contraseña hasheada
      activo: String(safeGet(row, 'Activo')).trim().toLowerCase() === 'verdadero' || String(safeGet(row, 'Activo')).trim().toLowerCase() === 'true' || String(safeGet(row, 'Activo')).trim().toLowerCase() === 'sí' || String(safeGet(row, 'Activo')).trim().toLowerCase() === 'si' || String(safeGet(row, 'Activo')).trim() === '1',
    }));
  }

  async getAsesoresMap() {
    const asesores = await this.getAsesores();
    return asesores.reduce((acc: any, asesor: any) => {
      if (asesor.correo && asesor.nombre) {
        acc[asesor.correo.trim().toLowerCase()] = asesor.nombre;
      }
      return acc;
    }, {});
  }

  // Actualizar la contraseña de un Asesor
  async updateAsesorPassword(email: string, hashedPassword: string) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Asesores'];
    if (!sheet) return false;

    await sheet.loadHeaderRow();

    const rows = await sheet.getRows();
    const row = rows.find(r => {
      try {
        return r.get('Correo')?.trim().toLowerCase() === email.trim().toLowerCase();
      } catch (e) {
        return false;
      }
    });
    
    if (row) {
      row.set('Contraseña', hashedPassword);
      await row.save();
      this.invalidateCache('Asesores'); // <-- INVALIDAR CACHÉ
      return true;
    }
    return false;
  }

  // Actualizar la fecha y hora de último acceso
  async updateLastAccess(email: string) {
    try {
      await this.init();
      const sheet = this.doc.sheetsByTitle['Asesores'];
      if (!sheet) return false;

      await sheet.loadHeaderRow(); // Asegurar que reconoce nuevas columnas

      const rows = await sheet.getRows();
      const row = rows.find(r => {
        try {
          return r.get('Correo')?.trim().toLowerCase() === email.trim().toLowerCase();
        } catch (e) {
          return false;
        }
      });
      
      if (row) {
        const now = new Date();
        const formattedDate = now.toLocaleString('es-MX', { 
          timeZone: 'America/Mexico_City',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        
        row.set('Ultimo acceso', formattedDate);
        await row.save();
        this.invalidateCache('Asesores'); // <-- INVALIDAR CACHÉ
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error al actualizar último acceso:", error);
      return false;
    }
  }

  // Ejemplo: Obtener Leads
  async getLeads() {
    const [rows, asesorMap] = await Promise.all([
      this.getCachedRows('Leads'),
      this.getAsesoresMap()
    ]);
    const validRows = rows.filter(r => r.get('ID Lead') || r.get('Prospecto'));
    const safeGet = (row: any, key: string) => {
      try {
        return row.get(key);
      } catch (e) {
        return undefined;
      }
    };

    return validRows.map(row => ({
      idLead: safeGet(row, 'ID Lead'),
      fecha: safeGet(row, 'Fecha'),
      prospecto: safeGet(row, 'Prospecto'),
      celular: safeGet(row, 'Celular'),
      correo: safeGet(row, 'Correo'),
      campusInteres: safeGet(row, 'Campus de Interés'),
      carrera: safeGet(row, 'Carrera'),
      modalidad: safeGet(row, 'Modalidad'),
      turno: safeGet(row, 'Turno'),
      periodoInteres: safeGet(row, 'Periodo de Interés'),
      año: safeGet(row, 'Año'),
      medio: safeGet(row, 'Medio'),
      asesor: safeGet(row, 'Asesor'),
      etapa: safeGet(row, 'Etapa'),
      comentario: safeGet(row, 'Comentario'),
      ultimaActualizacion: safeGet(row, 'Fecha de última actualización'),
      statusLead: safeGet(row, 'Status Lead'),
      folioPapeleria: safeGet(row, 'Folio de Pago Papeleria'),
      montoPapeleria: safeGet(row, 'Monto Papelería'),
      folioColegiatura: safeGet(row, 'Folio de Pago Colegiatura'),
      montoColegiatura: safeGet(row, 'Monto Colegiatura'),
      turnoAsignado: safeGet(row, 'Turno Asignado'),
      carreraAsignada: safeGet(row, 'Carrera Asignada'),
      statusColegiatura: safeGet(row, 'Status Colegiatura'),
      llamadaCalidad: safeGet(row, 'Llamada de Calidad'),
      inscritoPor: safeGet(row, 'Inscrito Por'),
      asesorNombre: asesorMap[safeGet(row, 'Asesor')?.trim()?.toLowerCase()] || safeGet(row, 'Asesor'),
      inscritoPorNombre: asesorMap[safeGet(row, 'Inscrito Por')?.trim()?.toLowerCase()] || safeGet(row, 'Inscrito Por'),
      accionRecuperacion: safeGet(row, 'Acción de Recuperación'),
      fechaAccionRecuperacion: safeGet(row, 'Fecha de Acción de Recuperación'),
      accionVencidaSinSeguimiento: safeGet(row, 'Acción Vencida sin Seguimiento')
    }));
  }

  // Obtener catálogos para los formularios
  async getCampus() {
    const rows = await this.getCachedRows('Campus');
    return rows.filter(r => {
      const act = String(r.get('Activo')).trim().toLowerCase();
      return act === 'verdadero' || act === 'true' || act === 'sí' || act === 'si' || act === '1';
    }).map(r => r.get('Campus'));
  }

  async getCarreras() {
    const rows = await this.getCachedRows('Carreras');
    return rows.filter(r => {
      const act = String(r.get('Activo')).trim().toLowerCase();
      return act === 'verdadero' || act === 'true' || act === 'sí' || act === 'si' || act === '1';
    }).map(r => r.get('Carrera'));
  }

  async getModalidades() {
    const rows = await this.getCachedRows('Modalidades');
    const activas = rows.filter(r => {
      const act = String(r.get('Activo')).trim().toLowerCase();
      return act === 'verdadero' || act === 'true' || act === 'sí' || act === 'si' || act === '1';
    }).map(r => r.get('Modalidad'));
    // Eliminar duplicados para que "Mixto" solo salga una vez
    return Array.from(new Set(activas));
  }

  async getTurnos() {
    return ['Matutino', 'Vespertino', 'Nocturno', 'Sabatino', 'Dominical'];
  }

  async getMedios() {
    const rows = await this.getCachedRows('Medios');
    return rows.filter(r => {
      const act = String(r.get('Activo')).trim().toLowerCase();
      return act === 'verdadero' || act === 'true' || act === 'sí' || act === 'si' || act === '1';
    }).map(r => r.get('Medio'));
  }

  // Agregar un nuevo Lead
  async addLead(leadData: any) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Leads'];
    if (!sheet) throw new Error("No se encontró la hoja 'Leads'");

    // Forzar lectura de encabezados por si el usuario acaba de agregar columnas
    await sheet.loadHeaderRow();

    // Generar ID de forma simple: L-Timestamp
    const newId = `L-${Date.now()}`;
    const fechaActual = new Date().toLocaleDateString('es-MX');

    await sheet.addRow({
      'ID Lead': newId,
      'Fecha': fechaActual,
      'Prospecto': leadData.prospecto,
      'Celular': leadData.celular,
      'Correo': leadData.correo,
      'Campus de Interés': leadData.campusInteres,
      'Carrera': leadData.carrera,
      'Modalidad': leadData.modalidad,
      'Turno': leadData.turno,
      'Periodo de Interés': leadData.periodoInteres,
      'Año': leadData.año,
      'Medio': leadData.medio,
      'Asesor': leadData.asesor,
      'Etapa': 'Nuevo lead',
      'Comentario': leadData.comentario,
      'Fecha de última actualización': fechaActual,
      'Status Lead': 'Nuevo lead'
    });

    this.invalidateCache('Leads'); // <-- INVALIDAR CACHÉ
    return newId;
  }

  // Obtener un Lead específico por su ID
  async getLeadById(idLead: string) {
    const leads = await this.getLeads();
    return leads.find(l => l.idLead === idLead) || null;
  }

  // Actualizar el estatus de un Lead
  async updateLeadStatus(idLead: string, newStatus: string) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Leads'];
    if (!sheet) return false;

    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('ID Lead') === idLead);
    
    if (row) {
      row.set('Status Lead', newStatus);
      row.set('Fecha de última actualización', new Date().toLocaleDateString('es-MX'));
      await row.save();
      this.invalidateCache('Leads');
      return true;
    }
    return false;
  }

  // Pre-inscribir un Lead (Etapa 1 - Guarda papelería y turno final)
  async preInscribirLead(idLead: string, data: any) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Leads'];
    if (!sheet) return false;

    // Cargar encabezados para reconocer las nuevas columnas
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('ID Lead') === idLead);
    
    if (row) {
      row.set('Status Lead', 'Pre-inscrito');
      row.set('Fecha de última actualización', new Date().toLocaleDateString('es-MX'));
      
      // Guardar las nuevas 4 columnas de la Etapa 1
      row.set('Folio de Pago Papeleria', data.folioPapeleria);
      row.set('Monto Papelería', data.montoPapeleria);
      row.set('Carrera Asignada', data.carreraAsignada);
      row.set('Turno Asignado', data.turnoAsignado);
      if (data.inscritoPor) {
        row.set('Inscrito Por', data.inscritoPor);
      }
      
      await row.save();
      this.invalidateCache('Leads');
      return true;
    }
    return false;
  }

  // Editar Pre-inscripción (Etapa 1 - Modificar papelería y turno/carrera final)
  async updatePreInscripcion(idLead: string, data: any) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Leads'];
    if (!sheet) return false;

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('ID Lead') === idLead);
    
    if (row) {
      if (data.montoPapeleria !== undefined) row.set('Monto Papelería', data.montoPapeleria);
      if (data.carreraAsignada) row.set('Carrera Asignada', data.carreraAsignada);
      if (data.turnoAsignado) row.set('Turno Asignado', data.turnoAsignado);
      // El folio normalmente no se cambia, pero por si acaso
      if (data.folioPapeleria) row.set('Folio de Pago Papeleria', data.folioPapeleria);
      if (data.inscritoPor) row.set('Inscrito Por', data.inscritoPor);
      
      row.set('Fecha de última actualización', new Date().toLocaleDateString('es-MX'));
      
      await row.save();
      this.invalidateCache('Leads');
      return true;
    }
    return false;
  }

  // Actualizar datos de contacto e interés académico del lead
  async updateLeadInfo(idLead: string, data: any) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Leads'];
    if (!sheet) return false;

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('ID Lead') === idLead);
    
    if (row) {
      if (data.celular !== undefined) row.set('Celular', data.celular);
      if (data.correo !== undefined) row.set('Correo', data.correo);
      if (data.carrera) row.set('Carrera', data.carrera);
      if (data.campusInteres) row.set('Campus de Interés', data.campusInteres);
      if (data.periodoInteres) row.set('Periodo de Interés', data.periodoInteres);
      if (data.año) row.set('Año', data.año);
      
      row.set('Fecha de última actualización', new Date().toLocaleDateString('es-MX'));
      
      await row.save();
      this.invalidateCache('Leads');
      return true;
    }
    return false;
  }

  // Completar Inscripción (Etapa 2 - Guarda colegiatura y resolución)
  async completarInscripcionLead(idLead: string, data: any) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Leads'];
    if (!sheet) return false;

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('ID Lead') === idLead);
    
    if (row) {
      // Si la decisión fue positiva
      if (data.statusColegiatura === "Convenio de Pago Primera colegiatura" || data.statusColegiatura === "Pago Completado") {
        row.set('Status Lead', 'Inscrito');
      } else {
        // Si pidió devolución o decidió no continuar
        row.set('Status Lead', 'Baja');
      }
      
      row.set('Fecha de última actualización', new Date().toLocaleDateString('es-MX'));
      row.set('Folio de Pago Colegiatura', data.folioColegiatura);
      row.set('Monto Colegiatura', data.montoColegiatura);
      row.set('Status Colegiatura', data.statusColegiatura);
      if (data.inscritoPor) {
        row.set('Inscrito Por', data.inscritoPor);
      }
      
      await row.save();
      this.invalidateCache('Leads');
      return true;
    }
    return false;
  }

  // Llamada de Calidad (Gate antes de pagar Colegiatura)
  async registrarLlamadaCalidad(idLead: string, data: any) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Leads'];
    if (!sheet) return false;

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('ID Lead') === idLead);
    
    if (row) {
      if (data.decision === 'Confirmado') {
        row.set('Llamada de Calidad', 'Confirmado');
      } else {
        row.set('Llamada de Calidad', 'Declinó');
        row.set('Status Lead', 'Baja de Calidad');
        row.set('Status Colegiatura', data.motivo); // Guardamos el motivo aquí para reutilizar
      }
      
      row.set('Fecha de última actualización', new Date().toLocaleDateString('es-MX'));
      
      await row.save();
      this.invalidateCache('Leads');
      return true;
    }
    return false;
  }

  // Obtener todos los seguimientos
  async getAllSeguimientos() {
    const [rows, asesorMap] = await Promise.all([
      this.getCachedRows('Seguimientos'),
      this.getAsesoresMap()
    ]);
    const safeGet = (row: any, key: string) => {
      try {
        return row.get(key);
      } catch (e) {
        return undefined;
      }
    };

    const validRows = rows.filter(r => safeGet(r, 'ID Seguimiento') || safeGet(r, 'ID Lead') || safeGet(r, 'Comentario'));
    return validRows.map(row => ({
      idSeguimiento: safeGet(row, 'ID Seguimiento'),
      idLead: safeGet(row, 'ID Lead'),
      fecha: safeGet(row, 'Fecha seguimiento'),
      tipoContacto: safeGet(row, 'Medio contacto'),
      comentario: safeGet(row, 'Comentario'),
      resultado: safeGet(row, 'Resultado'),
      proximaAccion: safeGet(row, 'Próxima acción'),
      fechaProxima: safeGet(row, 'Fecha próxima acción'),
      asesor: safeGet(row, 'Asesor'),
      asesorNombre: asesorMap[safeGet(row, 'Asesor')?.trim()?.toLowerCase()] || safeGet(row, 'Asesor')
    })).reverse();
  }

  // Obtener seguimientos de un Lead
  async getSeguimientos(idLead: string) {
    const [rows, asesorMap] = await Promise.all([
      this.getCachedRows('Seguimientos'),
      this.getAsesoresMap()
    ]);
    
    const safeGet = (row: any, key: string) => {
      try {
        return row.get(key);
      } catch (e) {
        return undefined;
      }
    };

    return rows
      .filter(r => safeGet(r, 'ID Lead') === idLead && (safeGet(r, 'ID Seguimiento') || safeGet(r, 'Comentario')))
      .map(row => ({
        idSeguimiento: safeGet(row, 'ID Seguimiento'),
        idLead: safeGet(row, 'ID Lead'),
        fecha: safeGet(row, 'Fecha seguimiento'),
        tipoContacto: safeGet(row, 'Medio contacto'),
        comentario: safeGet(row, 'Comentario'),
        resultado: safeGet(row, 'Resultado'),
        proximaAccion: safeGet(row, 'Próxima acción'),
        fechaProxima: safeGet(row, 'Fecha próxima acción'),
        asesor: safeGet(row, 'Asesor'),
        asesorNombre: asesorMap[safeGet(row, 'Asesor')?.trim()?.toLowerCase()] || safeGet(row, 'Asesor')
      }))
      .reverse(); // Para que salgan los más nuevos primero
  }

  // Agregar un Seguimiento
  async addSeguimiento(data: any) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Seguimientos'];
    if (!sheet) throw new Error("No se encontró la hoja 'Seguimientos'");

    const newId = `S-${Date.now()}`;
    
    await sheet.addRow({
      'ID Seguimiento': newId,
      'ID Lead': data.idLead,
      'Fecha seguimiento': new Date().toLocaleDateString('es-MX') + ' ' + new Date().toLocaleTimeString('es-MX'),
      'Medio contacto': data.tipoContacto,
      'Comentario': data.comentario,
      'Resultado': data.resultado,
      'Próxima acción': data.proximaAccion,
      'Fecha próxima acción': data.fechaProxima,
      'Asesor': data.asesor
    });

    // Actualizar también la fecha de última actualización en el Lead principal y su estatus si es necesario
    await this.updateLeadStatus(data.idLead, data.nuevoEstatus || 'En seguimiento');

    this.invalidateCache('Seguimientos');
    return newId;
  }

  // Actualizar un Seguimiento existente
  async updateSeguimiento(idSeguimiento: string, data: any) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Seguimientos'];
    if (!sheet) return false;

    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('ID Seguimiento') === idSeguimiento);
    
    if (row) {
      row.set('Medio contacto', data.tipoContacto);
      row.set('Comentario', data.comentario);
      row.set('Resultado', data.resultado);
      row.set('Próxima acción', data.proximaAccion);
      row.set('Fecha próxima acción', data.fechaProxima);
      await row.save();
      this.invalidateCache('Seguimientos');
      return true;
    }
    return false;
  }

  // ----- MÓDULO DE INSCRITOS Y GRUPOS -----

  async getInscritos() {
    const [rows, asesorMap] = await Promise.all([
      this.getCachedRows('Inscritos'),
      this.getAsesoresMap()
    ]);
    return rows.map(row => ({
      idInscrito: row.get('ID Inscrito'),
      idLead: row.get('ID Lead'),
      prospecto: row.get('Prospecto'),
      campus: row.get('Campus'),
      carrera: row.get('Carrera'),
      modalidad: row.get('Modalidad'),
      turno: row.get('Turno'),
      periodo: row.get('Periodo'),
      año: row.get('Año'),
      asesor: row.get('Asesor'),
      asesorNombre: asesorMap[row.get('Asesor')?.trim()?.toLowerCase()] || row.get('Asesor'),
      folioPago: row.get('Folio de Pago'),
      montoPagadoPapeleria: row.get('Monto Pagado Manejo Papeleria') || row.get('Monto Pagado'),
      montoPagadoInscripcion: row.get('Monto Pagado Inscripcion'),
      aplicaComision: row.get('Aplica Comisión'),
      fechaInscripcion: row.get('Fecha inscripción') || row.get('Fecha de inscripción') || row.get('fecha de inscripcion') || row.get('Fecha Inscripción') || row.get('Fecha de Inscripción')
    }));
  }

  async addInscrito(data: any) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Inscritos'];
    if (!sheet) throw new Error("No se encontró la hoja 'Inscritos'");

    // Forzar la recarga de encabezados para reconocer nuevas columnas
    await sheet.loadHeaderRow();

    const newId = `INS-${Date.now()}`;
    const fechaActual = new Date().toLocaleDateString('es-MX');
    
    await sheet.addRow({
      'ID Inscrito': newId,
      'ID Lead': data.idLead,
      'Prospecto': data.prospecto,
      'Campus': data.campus,
      'Carrera': data.carrera,
      'Modalidad': data.modalidad,
      'Turno': data.turno,
      'Periodo': data.periodo,
      'Año': data.año,
      'Asesor': data.asesor,
      'Folio de Pago': data.folioPago,
      'Monto Pagado Manejo Papeleria': data.montoPagadoPapeleria,
      'Monto Pagado Inscripcion': data.montoPagadoInscripcion,
      'Monto Pagado': data.montoPagadoPapeleria, // Fallback por si acaso
      'Aplica Comisión': data.aplicaComision,
      'Fecha inscripción': fechaActual,
      'Fecha de inscripción': fechaActual,
      'Fecha Inscripción': fechaActual
    });

    // Automáticamente cambiar el estatus del Lead original a Inscrito
    await this.updateLeadStatus(data.idLead, 'Inscrito');

    this.invalidateCache('Inscritos');
    return newId;
  }
  // Actualizar un inscrito (solo campos generales)
  async updateInscrito(idInscrito: string, data: any) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Inscritos'];
    if (!sheet) return false;

    await sheet.loadHeaderRow(); // Asegurarnos de tener los headers frescos, especialmente "Año" y "Periodo"

    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('ID Inscrito') === idInscrito);
    
    if (row) {
      if (data.prospecto) row.set('Prospecto', data.prospecto);
      if (data.campus) row.set('Campus', data.campus);
      if (data.carrera) row.set('Carrera', data.carrera);
      if (data.modalidad) row.set('Modalidad', data.modalidad);
      if (data.turno) row.set('Turno', data.turno);
      if (data.periodo) row.set('Periodo', data.periodo);
      if (data.año) row.set('Año', data.año);
      if (data.montoPagadoPapeleria !== undefined) {
        row.set('Monto Pagado Manejo Papeleria', data.montoPagadoPapeleria);
        // También actualizamos el campo genérico de Monto Pagado por compatibilidad
        row.set('Monto Pagado', data.montoPagadoPapeleria);
      }
      
      await row.save();
      this.invalidateCache('Inscritos');
      return true;
    }
    return false;
  }

  // Sincronizar leads de Mérida desde Excel externo (Feria de Becas)
  async syncMeridaLeads(sheetId: string, tabName: string) {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const meridaDoc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await meridaDoc.loadInfo();
    const meridaSheet = meridaDoc.sheetsByTitle[tabName];
    if (!meridaSheet) throw new Error(`No se encontró la pestaña '${tabName}' en el documento de Mérida`);

    // Los encabezados están en la fila 3 del excel de la feria de becas
    await meridaSheet.loadHeaderRow(3);
    const meridaRows = await meridaSheet.getRows();

    await this.init();
    const mySheet = this.doc.sheetsByTitle['Leads'];
    if (!mySheet) throw new Error("No se encontró la hoja 'Leads' local");
    await mySheet.loadHeaderRow();
    
    const myRows = await this.getCachedRows('Leads');
    
    // Crear una llave compuesta de nombre (en minúsculas) y teléfono para evitar duplicados exactos
    const existingRecords = new Set(myRows.map(r => {
      const phone = String(r.get('Celular') || '').replace(/\D/g, '');
      const name = String(r.get('Prospecto') || '').trim().toLowerCase();
      return `${name}|${phone}`;
    }));

    const newRowsToInsert: any[] = [];

    for (const mRow of meridaRows) {
      // Ignorar si la columna CRM no dice "Si"
      const crmValue = String(mRow.get('CRM') || '').trim().toLowerCase();
      if (crmValue !== 'si' && crmValue !== 'sí') {
        continue;
      }

      const telefonoOriginal = mRow.get('TELEFONO') || '';
      const telefonoLimpio = String(telefonoOriginal).replace(/\D/g, '');
      const nombreLimpio = String(mRow.get('NOMBRE') || 'Sin Nombre').trim();
      
      const recordKey = `${nombreLimpio.toLowerCase()}|${telefonoLimpio}`;
      
      // Ignorar si ya existe un registro con exactamente el mismo nombre Y el mismo teléfono
      if (existingRecords.has(recordKey)) {
        continue;
      }

      const preparatoria = mRow.get('PREPARATORIA') || '';
      const premio = mRow.get('PREMIO') || '';
      const comentarioOriginal = mRow.get('COMENTARIO') || '';

      const comentarioUnido = [
        preparatoria ? `Preparatoria: ${preparatoria}` : '',
        premio ? `Premio: ${premio}` : '',
        comentarioOriginal ? `Nota: ${comentarioOriginal}` : ''
      ].filter(Boolean).join(' | ');

      const newId = `L-${Date.now()}-${Math.floor(Math.random() * 1000)}-${newRowsToInsert.length}`;
      const fechaActual = new Date().toLocaleDateString('es-MX');

      newRowsToInsert.push({
        'ID Lead': newId,
        'Fecha': fechaActual,
        'Prospecto': mRow.get('NOMBRE') || 'Sin Nombre',
        'Celular': telefonoOriginal,
        'Campus de Interés': 'MD-Mérida',
        'Carrera': mRow.get('LICENCIATURA') || '',
        'Medio': 'Evento especial',
        'Etapa': 'Nuevo lead',
        'Comentario': comentarioUnido,
        'Fecha de última actualización': fechaActual,
        'Status Lead': 'Nuevo lead'
      });
      
      existingRecords.add(recordKey);
    }

    if (newRowsToInsert.length > 0) {
      // Inserción masiva para evitar Timeouts en Vercel
      await mySheet.addRows(newRowsToInsert);
      this.invalidateCache('Leads');
    }
    
    return newRowsToInsert.length;
  }

  // Guardar Acción de Recuperación (Para Bajas)
  async updateAccionRecuperacion(idLead: string, data: { accion?: string; fecha?: string; vencida?: string }) {
    await this.init();
    const sheet = this.doc.sheetsByTitle['Leads'];
    await sheet.loadHeaderRow(); // Forzar recarga de encabezados por si se acaban de agregar
    
    const rows = await this.getCachedRows('Leads');
    const row = rows.find(r => r.get('ID Lead') === idLead);
    
    if (row) {
      if (data.accion !== undefined) row.set('Acción de Recuperación', data.accion);
      if (data.fecha !== undefined) row.set('Fecha de Acción de Recuperación', data.fecha);
      if (data.vencida !== undefined) row.set('Acción Vencida sin Seguimiento', data.vencida);
      
      await row.save();
      this.invalidateCache('Leads');
      return true;
    }
    return false;
  }
}

export const googleSheets = new GoogleSheetsService();
