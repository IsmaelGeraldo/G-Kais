# G-Kais 2.0 — Flujos operativos: webinars, formaciones, sesiones, compra y seguimiento

**Versión:** 1.0 · **Fecha:** 2026-10-09 · **Estado:** ESPECIFICACIÓN APROBADA EN CONCEPTO, NO IMPLEMENTADA COMPLETAMENTE.  
**Fuente de verdad superior:** [GKAIS_ROADMAP_MAESTRO_2_0.md](./GKAIS_ROADMAP_MAESTRO_2_0.md).  
**Prioridad:** BLOQUEANTE de la beta con empresas que realizan eventos/sesiones; desarrollar como fase **7.5 — Continuidad operativa e integraciones esenciales**.  
**Pregunta de producto:** ¿esto facilita que una empresa capte, atienda y convierta personas SIN abandonar las plataformas que ya usa, acercándonos al primer cliente de pago?

## 1. Decisión irrevocable de producto (hasta que evidencia real aconseje revisarla)

**G-Kais es el sistema de relación y seguimiento, NO el reemplazo de Zoom, Google Meet, YouTube, la agenda o la pasarela de pago del cliente.** La empresa sigue impartiendo su evento/clase/llamada donde trabaja habitualmente; G-Kais centraliza las etapas verificadas y la próxima acción.

Recuperamos explícitamente el flujo analizado con Daniel Camero:
redes sociales → webinar gratuito → asistió/no asistió → compra/no compra → formación/cohorte → alumno/egresado → mentoría 1:1 → continuidad/renovación.  
La Persona sigue siendo UNA entidad única a lo largo de todas las etapas. No se abre otro CRM para cada módulo.

Reglas existentes que deben mantenerse:
- Inscribir a un webinar NO pregunta si compró. Registro y compra son eventos independientes.
- Comprador verificado → Compradores/Priority Work → Formación y cohorte (directa, individual o masiva según reglas) → onboarding → próximos compromisos.
- No comprador → seguimiento, cualificación, oferta y siguientes acciones; nunca desaparece tras el evento.
- No asistencia ≠ ausencia de registro; asistencia desconocida ≠ no-show; intención de compra ≠ compra verificada.
- Registro de persona, inscripción, asistencia, sesión, venta, matrícula y siguiente acción deben tener trazabilidad, origen e idempotencia.
- Si el módulo está desactivado para una organización, no se eliminan los datos ni se rompe su historial.

## 2. Hallazgos de revisión del código (2026-10-09, main eb40b715)

**Presente en código:**
- src/components/experts/WebinarsWorkspaceV2.tsx: alta, edición, lista, conteo, participante interno, copiar enlace, CSV, clasificar asistentes/no-show/compradores.
- src/services/expertsAcquisition.ts: Persona, Webinar, webinar_registrations y vínculo en Firestore por Workspace; campos platform y externalUrl.
- src/services/expertsWebinarRegistrationFeed.ts: suscripción en Firestore de inscripciones.
- src/components/experts/FormationsWorkspaceV2.tsx y servicios expertos: Formaciones, cohortes, matrículas, clases, plan y flujo de alumnos.
- src/server/payments/stripeWebhook.ts: validación de eventos Stripe que incluyen metadata de workspaceId + personId, con trazabilidad de purchase_completed; esto es **compra de productos del cliente**, NO pago de suscripción a G-Kais.
- Se admite ingreso manual e importación CSV de participantes.

**No demostrado y por tanto PENDIENTE:**
- Se produce URL `/register/webinar?workspace=...&webinar=...`, pero src/App.tsx no implementa la ruta pública de registro. Crear URL no hace que funcione; probarla externa, sin sesión de Workspace.
- Crear el webinar usa externalUrl vacío; falta vincular/validar el enlace real de sesión y exponer un CTA de asistencia sin fricción. El campo almacenado no equivale a integración.
- Falta confirmar asistencia automática desde Zoom/Meet/YouTube con credenciales/autorización, y en qué modalidad/proveedor es posible.
- Sin un checkout web propio completo con metadata segura y webhooks configurados, no se puede asegurar correlación automática de compra con Persona/Oferta/Webinar.
- Falta estandarizar integración de clases de formaciones, tutorías y llamadas recurrentes con enlaces externos en el trabajo diario.

**No borrar ni sustituir flujos existentes:** conservar registros, cohorts, tareas, listas de compradores, importación manual/CSV, acciones y UI aprobada. Migrar con compatibilidad y tests de no regresión.

## 3. El recorrido del webinar tal como debe usarlo el cliente

### A. Antes del webinar: 1 minuto para publicar
1. El profesional crea o importa un webinar: nombre, descripción, fecha/hora con zona horaria, modalidad/proveedor (Zoom, Meet, YouTube Live, otro), enlace externo existente, oferta o programa vinculado, privacidad y cupos opcionales.
2. G-Kais genera un **único enlace público estable de inscripción**, apto para RRSS, WhatsApp, bio, landing, email, campañas.
3. Vista previa y prueba funcional del enlace antes de copiar; titular configura campos mínimos y consentimiento. Registros sin exigir cuenta G-Kais.
4. El usuario del negocio debe poder reutilizar su reunión ya creada en Zoom/Meet/YouTube: no obligamos a crear otra dentro de G-Kais.
5. Si el proveedor requiere registro individual o enlaces únicos (p. ej. Zoom), configurar OAuth/API o mostrar la derivación al formulario del proveedor mientras se resuelve la sincronización. Nunca prometer ingreso con un enlace genérico que no sirva.

### B. Registro público: persistencia real
1. Visitante abre `/register/webinar` o, preferentemente, una ruta pública legible; ve evento y empresa correctos, horarios claros y política de privacidad.
2. Completa nombre y email (teléfono opcional, según necesidad/consentimiento); **NO** preguntar compra.
3. API pública en servidor resuelve ID público→ Workspace/evento habilitado y valida fecha/estado; protege contra spam, abuso, inyección y enumeración de Workspace. El navegador anónimo NO necesita acceso directo a colecciones privadas Firestore.
4. Crear o relacionar **Persona única** por identidad normalizada y reglas de deduplicación; guardar Inscripción al webinar, fuente, campaña (UTM si procede), consentimiento, fecha y estado `registered`, dentro del Workspace correcto.
5. Evitar duplicados y respuestas ambiguas en reintentos o clic doble (idempotencia), nunca revelar datos de otro inscrito.
6. Mostrar confirmación útil en pantalla con fecha/hora local, cómo asistir, añadir al calendario (.ics / calendario), enlace de acceso según permisos del evento y expectativas de próximos pasos. Si correo/remitente está configurado, enviar confirmación; si no, NO afirmar que se envió.
7. Entrada en tiempo real a lista de participantes en G-Kais y a Persona, sin carga manual.

### C. Acceder a la sesión sin interrumpir al mentor ni al inscrito
- **Enlace de inscripción (G-Kais):** URL pública de captación, distinta del enlace de sala.
- **Enlace de sesión (Zoom/Meet/YouTube):** URL externa del proveedor; almacenamiento y acceso acorde con seguridad/visibilidad, unirse por un clic desde evento/clase/cita.
- En eventos públicos puede mostrarse después del registro; en sesiones privadas o Zoom con registro individual se muestra SOLO el enlace autorizado/único del participante.
- El anfitrión conserva control sobre host/co-host; no se exponen credenciales ni enlaces de anfitrión en páginas públicas.
- Zona horaria explícita, cambios de enlace/fecha sincronizados en G-Kais y recordatorios sujetos a servicio de correo/conectores disponibles.
- No crear una videollamada propia ni exigir al profesional cambiar de plataforma.

### D. Después del webinar: hechos, no suposiciones
- `registered` = inscrito; `attended` = evidencia de asistencia; `no-show` = ausencia confirmada cuando hay datos suficientes; `unknown` = información de asistencia no disponible.
- Integración real de asistencia según proveedor y permisos; no inferir «asistió» solo por haber hecho clic en «Unirse» o estar en registro.
- Permitir importación CSV/manual como **fallback**, sin duplicar Personas ni eventos, mostrando fuente y última sincronización.
- Compradores: señal solo desde evento de pago **verificado** de la plataforma conectada (y conciliación segura con Persona + oferta + evento), no desde checkbox de «interesado».
- No compradores: tareas de seguimiento, contacto y segmentación, con reglas de cadencia configurables.
- Compradores: Compradores/Priority Work → Formación/Cohorte → matrícula → onboarding y seguimiento; conservar historial de webinar y compra.
- Toda transición registra evento e ID del origen; reenvío/reintento del proveedor no duplica compra ni matrícula.

## 4. Formaciones y sesiones de clase: misma experiencia

- La empresa crea Formaciones y Cohortes; planifica cada clase con fecha, hora, zona horaria, profesor, enlace externo, materiales y estado.
- La ficha de la clase incluye **Unirse a Zoom/Meet/YouTube** para quien tiene permiso; permitir reutilizar la misma sala recurrente o enlaces diferentes por clase.
- Participantes de la cohorte reciben acceso correcto a las clases sin doble inscripción, según consentimiento y mecanismos disponibles.
- Asistencia de clase y actividad de alumno relacionadas a su Persona/Matrícula/Cohorte; sincronización por proveedor cuando sea posible, importación CSV/manual cuando no.
- Clase terminada → registro, tareas, compromisos y siguiente clase. No modificar manualmente a cada participante.
- Si la formación se vende mediante Checkout externo, el webhook validado enlaza compra con Persona y Oferta/Cohorte; la matrícula automática requiere regla de activación explícita del negocio; prevenir dobles matrículas.
- Preservar plan, historial, materiales y notas existentes al añadir enlaces.

## 5. Reuniones individuales de coach, consultor, mentor

- Persona/Relación muestra las próximas sesiones, plataforma, enlace, responsable, objetivo, notas y próxima acción.
- El profesional puede **pegar su enlace de Meet/Zoom** y continuar exactamente su agenda actual; mínimo producto usable sin OAuth.
- Permitir enlazar a agenda existente o archivo .ics; conectores de calendario y reserva automática vendrán cuando un caso real los priorice.
- Un clic para abrir reunión desde ficha, Trabajo/Calendario o vista de sesión, sin exponer información privada.
- Después de la reunión: realizada, pendiente de confirmación, cancelada/reprogramada, resultado y tareas; asistentes reales solo cuando haya evidencia.
- En salud/nutrición, evitar introducir datos clínicos sensibles en formularios o notas sin controles específicos previos.

## 6. Estrategia de integraciones por etapas (NO bloquear al cliente)

**Nivel 0 — Enlace universal y API pública propia (OBLIGATORIO antes de beta):**
- Crear, editar, guardar y abrir enlaces HTTPS externos por evento/clase/sesión.
- Inscripción pública a G-Kais **totalmente funcional** con Persona + Registro automático.
- Inscripción permite usar los medios actuales del cliente; privacidad del enlace de sesión, confirmación visible.
- Integración de compras validadas o mecanismo de conciliación veraz, para proveedores priorizados por pilotos.
- Estados de asistencia honrados como desconocidos cuando no existe sincronización.
- Fallback CSV e importación no destructiva.

**Nivel 1 — Primera integración real, escogida por los pilotos:**
- Zoom OAuth/Meeting/Webinar: registro individual, enlace de entrada correcto, reportes de asistencia cuando el plan y permisos lo permitan.
- Meet: espacio/enlace y, donde existan permisos/acceso, conferenceRecords/participants/participantSessions para evidencia de asistencia. Usuarios anónimos no siempre se pueden reconciliar automáticamente con CRM.
- YouTube Live: URL y evento; no asumir identificación individual de cada espectador ni asistencia comprobada solo con los endpoints de chat.
- Conectar primero el proveedor que usen la mayoría de los primeros pilotos; **no exigir que todos tengan OAuth** para empezar a usar enlaces.
- Pagos: empezar con pasarela usada por el piloto (Stripe ya tiene base webhook) y ampliar según evidencia de uso; no confundir compras de alumnos con suscripción a G-Kais.

**Nivel 2 — Mejoras después de evidencia:**
- Sincronización de calendarios, recordatorios automáticos, reprogramación bidireccional, recuperación de conexiones, múltiples cuentas, informes detallados e integraciones adicionales.
- Mantener adaptación a cualquier negocio sin añadir módulos irrelevantes.

Referencias de posibilidad técnica (NO pruebas de integración ya implementada):
- Zoom Meetings API: https://developers.zoom.us/docs/api/meetings/
- Meet API / conferenceRecords: https://developers.google.com/workspace/meet/api/reference/rest/v2
- YouTube Live API / live chat: https://developers.google.com/youtube/v3/live/docs/liveChatMessages
- Stripe Webhooks: https://docs.stripe.com/webhooks

## 7. Diseño de datos mínimo (se valida al implementarlo)

Dentro de `expert_workspaces/{workspaceId}` (estructura a consensuar en Fase 6):
- `people/{personId}`: identidad maestra normalizada, deduplicación conservadora.
- `webinars/{webinarId}`: proveedor, enlace externo, enlace público, franja temporal, oferta y configuración de acceso.
- `webinar_registrations/{registrationId}`: Person + Webinar, fuente/UTM, consentimiento, estado de inscripción y evidencia.
- `formations/{formationId}`, `cohorts/{cohortId}`, `enrollments/{enrollmentId}`: oferta, grupo y matrícula.
- `formation_sessions/{sessionId}` o estructura actual de clases: vinculación cohorte, fecha, profesor, enlace externo, estado/asistencia y tareas, sin destruir `formation_plan` existente.
- `meetings/{meetingId}` o modelo de sesiones existente: reuniones 1:1 ligadas a Persona, responsable, siguiente acción.
- `payment_events/{eventId}`: proveedor, evento verificado, importe, identificación y oferta; solo el servidor autenticado/verificado puede generar `paymentVerified:true`.
- `relationship_events` + `work_tasks`: historial y seguimiento, referencia al evento/cita/matrícula.

Seguridad:
- ID público de registro aleatorio/no enumerativo; acceso a API pública rate-limited, validación tamaño y consentimiento.
- No exponer enlaces privados, API keys, tokens de reunión ni información de otras personas.
- Procesos idempotentes de registro, pago y matriculación, con reintentos seguros y registros de fallo.
- Logs y métricas agregadas evitando PII en observabilidad.
- Campos verificables separados de estados manuales, con fuente de evidencia.

## 8. Criterios de aceptación de la etapa 7.5: DEMO REAL END-TO-END

### Escenario A: visitante inscrito desde Instagram, no compra
- [ ] Empresa A crea webinar real con enlace Zoom/Meet/YouTube y copia enlace público G-Kais.
- [ ] Persona externa sin login G-Kais abre desde móvil, se inscribe una vez, confirma y puede acceder al webinar con enlace autorizado.
- [ ] Registro aparece automáticamente en Webinar y su Persona de empresa A. Empresa B no lo ve.
- [ ] Si no hay integración de asistencia, estado queda desconocido y NO se clasifica erróneamente como no-show.
- [ ] Al registrar una no compra se crea siguiente acción o flujo correcto de seguimiento, sin marcar compra.

### Escenario B: comprador verificado de formación
- [ ] El mismo registrado efectúa compra simulada verificada de oferta de la empresa A.
- [ ] El webhook firmado y procesado una sola vez crea `purchase_completed` con personId y offerId/formationId correctos.
- [ ] G-Kais crea/actualiza señal en Compradores y matrícula según reglas; conserva webinar y Persona, sin duplicados.
- [ ] Puede ingresar a sesiones de la formación con enlace externo correcto; el mentor ve el flujo completo.

### Escenario C: consultor con reuniones diarias
- [ ] Profesional crea/reutiliza enlace Meet/Zoom en sesión 1:1 sin OAuth obligatorio.
- [ ] Abre la sala desde ficha/persona, registra resultado y próxima acción, lo recupera tras recargar o cambiar dispositivo.
- [ ] El enlace no se publica a terceros ni se requiere acceder a secciones de Webinars/Formaciones desactivadas.

### No regresión obligatoria
- [ ] Importaciones CSV, edición de asistencia, compra manual NO verificada, compradores, cohortes, historial, tareas y registros anteriores siguen operando como antes.
- [ ] Aislamiento de Workspace, permisos de cada rol, autenticación, CI, pruebas funcionales, mobile/notebook sin regresiones.

**Puerta de beta:** estos recorridos funcionan para el/los proveedores reales de los pilotos. No es necesario integrar *todas* las plataformas antes de la beta, pero sí que la persona pueda registrarse y entrar sin fallos en la plataforma que ya usa.

## 9. Orden de ejecución dentro del roadmap

- **Fase 5.7 (ahora):** inventario de rutas públicas, datos y seguridad; añadir casos de prueba y riesgos del flujo de inscripción, webinar, clases y pago.
- **Fase 6.0:** modelo multiempresa + permisos/módulos + API pública de registro por organización con aislamiento, sin romper Person.
- **Fase 7.0:** onboarding empresarial pregunta plataformas usadas, modalidad de clases, compra y seguimiento; configura módulos/enlaces por defecto.
- **Fase 7.5 (bloquea 9.0):** asegurar enlaces públicos funcionales, registro → Persona, salas externas → asistencia honesta, formación/sesiones, compra validada y siguiente acción.
- **Fase 8.0:** la web/demos públicas pueden mostrar estos recorridos SOLO una vez validados.
- **Fase 9.0:** pilotos con webinars/clases/reuniones y conversiones reales, observadas con consentimiento.
- **Fase 10.0:** suscripción de empresas a G-Kais es una vía de pago distinta de los pagos de alumnos del cliente.

**Orden funcional recomendado dentro de 7.5:** 7.5.1 URL pública/registro + pruebas; 7.5.2 guardar/abrir enlace real en webinar/clase/cita; 7.5.3 matching de pagos y compradores; 7.5.4 asistencia real del proveedor que use la beta; 7.5.5 recordatorios/conectores según necesidad y disponibilidad.

**Regla general:** ¿ayuda a que un mentor trabaje sin cambiar de plataforma, que G-Kais capture automáticamente los datos y que el profesional pueda dar seguimiento y vender? Si no, no precede a estos flujos.

## 10. Instrucción para otro chat

«Lee docs/GKAIS_ROADMAP_MAESTRO_2_0.md y docs/GKAIS_FLUJOS_WEBINARS_FORMACIONES_SESIONES.md desde main. La fase inmediata sigue siendo 5.7. Asegura que webinar, clase y reunión externos conecten inscripción → Persona → asistencia evidenciada → compra verificada → Compradores/Formación → seguimiento, sin obligar a abandonar Zoom/Meet/YouTube. No cambies las pantallas ni el código ajeno; implementa por PRs y verifica CI/producción.»
