import {
  doc,
  writeBatch
} from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase';
import type { AdminLead } from '../types/admin';

export interface ImportedLeadDraft {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  contactChannel: string;
  businessType: string;
  primaryService: string;
  digitalPresence: string;
  acquisitionChannel: string;
  leadVolume: string;
  currentCrm: string;
  primaryProblem: string;
  currentSolution: string;
  businessGoal: string;
  inquiryNotes: string;
}

export interface LeadImportPreview {
  rows: ImportedLeadDraft[];
  totalRows: number;
  skippedRows: number;
  duplicateRows: number;
  detectedFields: string[];
}

const FIELD_ALIASES: Record<keyof ImportedLeadDraft, string[]> = {
  name: ['name', 'nombre', 'lead', 'contacto', 'cliente', 'prospecto'],
  company: ['company', 'empresa', 'negocio', 'organizacion', 'organización'],
  email: ['email', 'e-mail', 'correo', 'correo electronico', 'correo electrónico'],
  phone: ['phone', 'telefono', 'teléfono', 'celular', 'movil', 'móvil', 'whatsapp', 'whats app'],
  website: ['website', 'web', 'sitio web', 'pagina web', 'página web', 'url'],
  contactChannel: ['contact channel', 'canal contacto', 'canal de contacto', 'medio de contacto'],
  businessType: ['business type', 'tipo negocio', 'tipo de negocio', 'rubro', 'industria', 'sector'],
  primaryService: ['primary service', 'servicio principal', 'servicio', 'oferta', 'producto principal'],
  digitalPresence: ['digital presence', 'presencia digital', 'redes', 'redes sociales'],
  acquisitionChannel: ['acquisition channel', 'canal captacion', 'canal de captacion', 'canal de captación', 'origen', 'source', 'fuente'],
  leadVolume: ['lead volume', 'volumen leads', 'volumen de leads', 'leads mes', 'leads/mes', 'consultas mes'],
  currentCrm: ['current crm', 'crm', 'sistema actual', 'software actual', 'herramienta actual'],
  primaryProblem: ['primary problem', 'problema principal', 'problema', 'pain', 'dolor'],
  currentSolution: ['current solution', 'solucion actual', 'solución actual', 'competidor', 'competitor', 'como lo resuelven'],
  businessGoal: ['business goal', 'objetivo', 'objetivo negocio', 'meta', 'goal'],
  inquiryNotes: ['notes', 'notas', 'comentarios', 'contexto', 'observaciones', 'detalle']
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function parseDelimited(text: string): string[][] {
  const sample = text.split(/\r?\n/, 1)[0] || '';
  const delimiter =
    (sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length
      ? ';'
      : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(value.trim());
      value = '';
      continue;
    }

    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value.trim());
      value = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      continue;
    }

    value += char;
  }

  row.push(value.trim());
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function createHeaderMap(
  headers: string[]
): Partial<Record<keyof ImportedLeadDraft, number>> {
  const normalized = headers.map(normalizeHeader);
  const result: Partial<Record<keyof ImportedLeadDraft, number>> = {};

  (Object.keys(FIELD_ALIASES) as Array<keyof ImportedLeadDraft>).forEach(
    (field) => {
      const aliases = FIELD_ALIASES[field].map(normalizeHeader);
      const index = normalized.findIndex((header) => aliases.includes(header));
      if (index >= 0) result[field] = index;
    }
  );

  return result;
}

function valueAt(
  row: string[],
  index: number | undefined,
  maxLength: number
): string {
  if (typeof index !== 'number') return '';
  return String(row[index] || '').trim().slice(0, maxLength);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/\D/g, '');
  return digits ? plus + digits : '';
}

function identityKeys(email: string, phone: string): string[] {
  return [
    email ? 'email:' + normalizeEmail(email) : '',
    phone ? 'phone:' + normalizePhone(phone) : ''
  ].filter(Boolean);
}

export function prepareLeadCsvImport(
  text: string,
  existingLeads: AdminLead[]
): LeadImportPreview {
  const table = parseDelimited(text.replace(/^\uFEFF/, ''));
  if (table.length < 2) {
    throw new Error(
      'El CSV debe incluir una fila de encabezados y al menos un lead.'
    );
  }

  const headers = table[0];
  const map = createHeaderMap(headers);

  if (typeof map.name !== 'number') {
    throw new Error(
      'No se encontró una columna de nombre. Usa un encabezado como "Nombre" o "Name".'
    );
  }

  if (typeof map.email !== 'number' && typeof map.phone !== 'number') {
    throw new Error(
      'El CSV necesita una columna de Email o Teléfono/WhatsApp.'
    );
  }

  const existingKeys = new Set(
    existingLeads.flatMap((lead) =>
      identityKeys(lead.email || '', lead.phone || '')
    )
  );
  const fileKeys = new Set<string>();
  const rows: ImportedLeadDraft[] = [];
  let skippedRows = 0;
  let duplicateRows = 0;

  for (const raw of table.slice(1)) {
    const name = valueAt(raw, map.name, 100);
    const email = normalizeEmail(valueAt(raw, map.email, 254));
    const phone = normalizePhone(valueAt(raw, map.phone, 40));

    if (!name || (!email && !phone)) {
      skippedRows += 1;
      continue;
    }

    const keys = identityKeys(email, phone);
    if (keys.some((key) => existingKeys.has(key) || fileKeys.has(key))) {
      duplicateRows += 1;
      continue;
    }
    keys.forEach((key) => fileKeys.add(key));

    const explicitChannel = valueAt(raw, map.contactChannel, 80);
    const contactChannel =
      explicitChannel ||
      (phone ? 'WhatsApp' : email ? 'Email' : 'Multiple channels');

    rows.push({
      name,
      company: valueAt(raw, map.company, 150),
      email,
      phone,
      website: valueAt(raw, map.website, 250),
      contactChannel,
      businessType: valueAt(raw, map.businessType, 160),
      primaryService: valueAt(raw, map.primaryService, 300),
      digitalPresence: valueAt(raw, map.digitalPresence, 500),
      acquisitionChannel: valueAt(raw, map.acquisitionChannel, 300),
      leadVolume: valueAt(raw, map.leadVolume, 160),
      currentCrm: valueAt(raw, map.currentCrm, 200),
      primaryProblem: valueAt(raw, map.primaryProblem, 1200),
      currentSolution: valueAt(raw, map.currentSolution, 1200),
      businessGoal: valueAt(raw, map.businessGoal, 1200),
      inquiryNotes: valueAt(raw, map.inquiryNotes, 2000)
    });
  }

  return {
    rows,
    totalRows: Math.max(0, table.length - 1),
    skippedRows,
    duplicateRows,
    detectedFields: (Object.keys(map) as Array<keyof ImportedLeadDraft>).filter(
      (field) => typeof map[field] === 'number'
    )
  };
}

export async function importPreparedLeads(
  rows: ImportedLeadDraft[],
  actorLabel: string
): Promise<number> {
  if (rows.length === 0) return 0;
  if (rows.length > 1000) {
    throw new Error(
      'Por seguridad, importa un máximo de 1.000 leads por archivo.'
    );
  }

  const actor = actorLabel.trim().slice(0, 120) || 'Admin';
  const batchId = 'BATCH-' + Date.now().toString(36).toUpperCase();
  const now = new Date().toISOString();
  let written = 0;

  for (let offset = 0; offset < rows.length; offset += 400) {
    const batch = writeBatch(firestoreDb);
    const chunk = rows.slice(offset, offset + 400);

    chunk.forEach((lead, index) => {
      const id =
        'GK-IMP-' +
        Date.now().toString(36).toUpperCase() +
        '-' +
        (offset + index + 1).toString(36).toUpperCase() +
        '-' +
        Math.random().toString(36).slice(2, 7).toUpperCase();

      batch.set(doc(firestoreDb, 'lead_imports', id), {
        id,
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        contactChannel: lead.contactChannel,
        businessType: lead.businessType,
        primaryService: lead.primaryService,
        digitalPresence: lead.digitalPresence,
        acquisitionChannel: lead.acquisitionChannel,
        leadVolume: lead.leadVolume,
        currentCrm: lead.currentCrm,
        primaryProblem: lead.primaryProblem,
        currentSolution: lead.currentSolution,
        businessGoal: lead.businessGoal,
        inquiryNotes: lead.inquiryNotes,
        status: 'NEW',
        notificationStatus: 'IMPORTED',
        createdAt: now,
        updatedAt: now,
        assignedTo: '',
        nextAction: '',
        followUpAt: '',
        internalNotes: '',
        leadNotes: [],
        activityLog: [],
        importedBy: actor,
        importBatchId: batchId
      });
    });

    await batch.commit();
    written += chunk.length;
  }

  return written;
}
