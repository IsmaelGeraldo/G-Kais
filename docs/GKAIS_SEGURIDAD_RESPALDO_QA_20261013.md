# G-Kais — Matriz de aislamiento y plan de respaldo Firestore (Fase 5.7)

Fecha: 2026-10-13. Rama QA: `security/phase-5-7-firestore-read-permissions-20261009`.
**Estado: política documentada y pruebas sintéticas; no se ha creado ningún backup real ni activado facturación.**

## 1. Separación obligatoria

- **QA:** proyecto Firebase `g-kais-qa`, Firestore `(default)`. Solo datos sintéticos.
- **Producción:** proyecto distinto `careful-bloom-jmn89`, Firestore nombrado. Nunca ejecutar exportaciones, importaciones, borrados, modificaciones IAM, ni reglas en producción como parte de QA.
- Workspace A y B se simulan en el **emulador local** usando UID sintéticos `owner-a` y `owner-b`, además de manager/mentor/closer/assistant/customer-success. No crean cuentas ni empresas reales.
- Prueba de autorización: cada Owner debe ver solo su Workspace; todos los roles de A deben ser denegados al leer documentos o enumerar colecciones de B. Las operaciones positivas del propietario B validan que una denegación de A es aislamiento y no rechazo del formato.

## 2. Inventario mínimo de información a proteger

Dentro de `expert_workspaces/{workspaceId}`:
- `members`, `roles`, `invites` (seguridad y configuración).
- `people`, `clients`, `relationship_events` (CRM y mentoría).
- `formations`, `cohorts`, `enrollments`, `webinars`, `webinar_registrations` (formación y captación).
- `work_tasks`, `journal_entries`, `session_summaries`, `audit_logs` (operaciones y trazabilidad).
- `payment_events` y `settings` (pagos, ajustes).

Otros datos fuera del Workspace (por ejemplo formularios o leads globales) requieren revisión separada de seguridad, retención y trazabilidad. Firebase Authentication, índices, reglas, secretos y artefactos de Storage **no** quedan respaldados únicamente por una exportación de documentos Firestore.

## 3. Posibles estrategias de respaldo

**A. Backup administrado de Firestore (opción futura recomendada para producción, tras analizar el costo).**
- Puede programarse con frecuencia diaria o semanal y permite restaurar a una base nueva; contiene datos e índices, pero no todas las configuraciones como TTL.
- Requiere plan Blaze y genera costos. **No habilitar** facturación ni schedules desde este PR.
- Para restaurar, utilizar una base nueva aislada. La restauración in-place puede requerir borrar la base original y es destructiva: **prohibida durante QA**.
- Documentación de Google: https://firebase.google.com/docs/firestore/backups

**B. Exportación/Importación administrada a Cloud Storage (operación manual controlada).**
- Exige facturación Blaze, Cloud Storage y permisos adecuados. Exportaciones pueden cobrar lecturas por documento y almacenamiento.
- Ejemplo **solo ilustrativo, NO ejecutar sin aprobación explícita y verificar cuenta/billing/bucket**:

```bash
gcloud firestore export gs://BUCKET-APROBADO/gkais-qa/COPIA-YYYYMMDD \
  --project=g-kais-qa \
  --database='(default)'
```

- Una importación en la misma base puede **sobrescribir documentos existentes** con igual ID y no borra documentos extra. Un export all-documents **no** equivale a un rollback transaccional.
- Validación segura: exportar la QA sintética en un proyecto autorizado y **restaurar en un entorno nuevo vacío**, jamás sobre `g-kais-qa` con los registros validados ni sobre producción.
- No guardar exportaciones que contengan datos reales en repositorios GitHub públicos ni en máquinas sin cifrado/controles.
- Documentación oficial: https://firebase.google.com/docs/firestore/manage-data/export-import

**C. Emulador Firebase para pruebas gratuitas de ingeniería.**
- Las pruebas usan memoria sintética local (`demo-gkais-rules`) y no contactan Firebase QA ni producción. Sirven para demostrar autorización y analizar restauración de fixtures, **no** sustituyen el backup del Firebase real.
- Si QA está en Spark y no se autoriza Blaze, anotar el respaldo administrado como **pendiente de presupuesto**; no presentar un backup local del navegador como mecanismo de recuperación de datos.

## 4. Ensayo de recuperación aprobado por etapas

1. Registrar project ID, database ID, commit, hora UTC, usuario operador, inventario de colecciones y permisos de IAM. No incluir tokens, credenciales ni correos reales en logs.
2. Confirmar que el destino no es producción, está vacío y que el backup corresponde al proyecto de pruebas.
3. Hacer exportación del origen autorizado, conservar ID de operación, ubicación del bucket y resultado final **sin registrar valores privados**.
4. Restaurar en un **proyecto/base de recuperación nueva**, nunca reemplazar datos QA previamente aprobados.
5. Validar recuentos de documentos y **IDs de muestra sintéticos** en `people`, `work_tasks`, `enrollments`, `journal_entries` y membresías.
6. Reaplicar/validar reglas y configuración de Firebase (una exportación de documentos no sustituye despliegue de reglas e índices).
7. Verificar que las identidades A/B conservan aislamiento tras recuperación; contrastar historiales, completados y fechas.
8. Guardar comprobantes de la prueba y definir RPO/RTO. Sin restauración ensayada, estado **PENDIENTE**.

## 5. Recuperación ante error de conexión

- **Operación sin confirmación Firestore** ≠ guardado: no crear la misma tarea una segunda vez sin comprobar su ID e historial.
- Al detectar error, recuperar conexión, leer el registro canónico desde otro navegador autorizado o vista Equipo y comparar ID/fecha antes de reintentar.
- La caché `localStorage` y copias `gkais-experts-qa-recovery-*` son solo mecanismos de diagnóstico local, no un backup multi-dispositivo.
- Pendiente P0: mensajes de error persistentes y reintentos idempotentes de escrituras optimistas (especialmente `workspaceState.ts` y flujos de mentoría). Probar en modo offline sin eliminar registros, con datos sintéticos.
- Si los datos no se pueden reconciliar, detener cambios en QA y registrar incidencia antes de fusionar PR.

## 6. Checklist de salida

- [x] A/B sintéticos del emulador y tests de acceso positivo/negativo ampliados en código; **ejecutar CI**.
- [x] Owner reautentica en mismo navegador con datos QA según confirmación del usuario.
- [ ] Segundo navegador limpio con Owner contra Firebase QA.
- [ ] Backup remoto real autorizado y restauración ensayada en ambiente vacío (facturación/costo pendientes).
- [ ] Prueba de error offline/permission-denied y recuperación de tareas sin duplicar.
- [ ] Confirmar exclusión de dependencias externas de producción (email, Stripe, webhooks).
- [ ] Revisar aislamiento de APIs, enlaces públicos y datos globales no-Workspace.

**No cerrar Fase 5.7 ni fusionar PR #281 hasta completar los criterios P0.**
