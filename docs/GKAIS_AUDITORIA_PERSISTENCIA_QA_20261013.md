# G-Kais QA — Auditoría de persistencia (Fase 5.7)

**Fecha:** 2026-10-13 · **Rama:** `security/phase-5-7-firestore-read-permissions-20261009` · **Estado:** auditoría inicial, NO cierre de Fase 5.7.

## 1. Fuentes canónicas y caches

| Dominio | Firestore / fuente | Caché o componente heredado | Estado / riesgo |
| --- | --- | --- | --- |
| Personas CRM, inscripciones, formaciones y cohortes | `expert_workspaces/{id}/people`, `enrollments`, `formations`, `cohorts` | Vistas reactivas en `expertsAcquisition`, `expertsFormations` | Persistencia Firestore; roles validados positivamente en QA, falta restauración de sesiones y ensayos negativos end-to-end |
| Tareas operativas | `expert_workspaces/{id}/work_tasks` | `workspaceState.ts`, `expertsTaskMemory.ts`, `gkais-experts-work-tasks-v1` | QA inhibe importación demo y sincronización prehidratación; UI conserva caché de trabajo local |
| Clientes/mentoría y sesiones | `expert_workspaces/{id}/clients` | `expertsClientMemory.ts`, `expertsClientReconstruction.ts`, `gkais-experts-client-records-v2`, `gkais-experts-session-clients-v2` | Antes de este ajuste, QA podía importar automáticamente estado local si `clients` estaba vacío |
| Bitácoras / resúmenes de sesiones | `expert_workspaces/{id}/journal_entries`, `session_summaries` | `workspaceState.ts`, `expertsRelationshipMemory.ts`, `gkais-experts-client-journal-v1`, `gkais-experts-session-summaries-v1` | Antes de este ajuste se importaban elementos ausentes de Firestore desde el navegador en cada hidratación, incluso si habían sido eliminados |
| Configuración del workspace y apariencia | `expertsWorkspaceSettings.ts` usa documento remoto y espejo local; `ExpertsWorkspacePilotV3.tsx` usa preferencias locales | `gkais-experts-profile-v1`, preferencia de sidebar, idioma y aspecto | Separar datos de negocio de preferencias por dispositivo, verificar re-login y account switch |
| Copilot/sesiones | `sessionCopilot.ts` y reconstrucción de sesiones desde registros | Vista de sesión, reconstrucción derivada de `clients` | Revisar idempotencia de reconstrucción y preservación de compromisos |
| Supervisión y dashboard | `expertsDashboardLive.ts`, `expertsDashboardTeam.ts`, `TeamSupervisionWorkspace.tsx` | Algunas vistas de Trabajo toman caché `workspaceState` | Evitar que métricas mezclen datos stale y consultas autorizadas Firestore |

## 2. P0 — Ajuste preventivo en QA

1. Firestore QA es la **fuente de verdad** para clientes, journals y session summaries durante la hidratación; los registros locales ausentes o divergentes ya no se reimportan automáticamente.
2. Antes de reemplazar la caché local se conserva una copia de recuperación QA en `localStorage`, con claves `gkais-experts-qa-recovery-*-v1::workspace:{workspaceId}`. No hay migración automática desde esas copias.
3. El sincronizador local de journals y resúmenes **no** puede escribir en QA antes de completar las lecturas Firestore de la identidad y Workspace actuales.
4. Producción conserva, provisionalmente, su mecanismo anterior de migración para evitar alterar datos existentes. Esto NO prueba su seguridad ni autoriza desplegar cambios en producción.

**Precaución:** la copia de recuperación permanece en el navegador original; no equivale a un backup seguro entre dispositivos. No debe introducirse PII real en QA. Una limpieza de datos del navegador eliminará esas copias.

## 3. Riesgos pendientes (no resueltos)

- Persistencia `localStorage` como caché y escrituras optimistas en `workspaceState.ts`: comprobar reintentos, errores visibles, y ausencia de pérdida por fallos de Firestore.
- Claves de caché operativas con ámbito Workspace pero no necesariamente usuario: revisar cambio de sesión dentro de un navegador compartido y evitar exposición temporal de tareas.
- Sincronización bidireccional `preservePendingLocal`: estudiar conflicto por modificaciones simultáneas en dos navegadores y definición de última escritura.
- Batch de importación de clientes al iniciar en **producción** se mantiene; antes de un piloto hace falta herramienta de migración explícita, reversible y con trazabilidad.
- Validar idempotencia de task completion/next actions y journaling; inventario de rutas públicas, recuperación Firestore y backups/exportación.
- Evaluar alcance y tamaño de batches legacy (Firestore impone límites por commit) y políticas de borrado/retención.
- Revisar aislamiento de endpoints servidor/Webhook, email y claves, además de los tests de emulador existentes.

## 4. Matriz de verificación siguiente

- **QA-A1:** Owner abre Persona/Cliente/Plan, crea tarea y seguimiento; Closer/Assistant recibe lo asignado.
- **QA-A2:** cerrar sesión, iniciar sesión en el mismo navegador: Firestore sigue mostrando los registros y sus fechas.
- **QA-A3:** iniciar en otro navegador limpio con el mismo Owner: mismas entidades y estado, sin depender del navegador anterior.
- **QA-A4:** otro miembro del Workspace solo ve tareas autorizadas; otro Workspace no accede a los datos.
- **QA-A5:** eliminar un elemento *ficticio y prescindible* en Firestore de QA, comprobar que recargar navegador con una caché antigua **no** lo recrea automáticamente (no tocar datos aprobados).
- **QA-A6:** simular Firestore denegado/offline y comprobar alertas + recuperación/reintento, sin perder el registro pendiente.
- **QA-A7:** ensayar exportación/recuperación en QA y documentar control de acceso y restauración.

## 5. Criterio de salida

No fusionar PR #281 ni avanzar a empresas beta con datos reales hasta validar restauración entre navegadores, acceso negativo multiempresa, recuperación de fallos, backups y rutas externas según `docs/GKAIS_ROADMAP_MAESTRO_2_0.md`.
