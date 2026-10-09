# G-KAIS 2.0 — ROADMAP MAESTRO HACIA EL PRIMER CLIENTE

**Documento rector de producto, tecnología y validación comercial.**  
**Versión:** 1.0 · **Fecha base:** 2026-10-09 · **Repositorio:** IsmaelGeraldo/G-Kais  
**Código de referencia:** main, commit 3afefab52fb22f6331e31a3bde4a707ebef9d0dc  
**Estado actual:** fase 5.6 desplegada; siguiente fase prioritaria **5.7**.  
**Nota de estado:** las casillas son objetivos de trabajo, NO pruebas de que una función ya exista. Actualizarlas solo con evidencia verificable.

## 0. La pregunta obligatoria

> **¿Esto nos acerca a conseguir nuestro primer cliente de pago?**

Antes de empezar cada PR o funcionalidad, responder:
1. ¿Qué problema real de un posible cliente resuelve?
2. ¿Qué impide hoy: seguridad, activación, uso diario, demostración de valor o contratación?
3. ¿Cómo comprobaremos que funciona en una empresa real?
4. ¿Cuál es la solución mínima para validarlo sin rehacer el producto?
5. Si no mejora ninguno de esos cinco puntos, ¿debe esperar?

**Orden de prioridades:** P0 seguridad/aislamiento y fiabilidad → P1 activar empresas → P2 uso diario y Copilot contextual → P3 captación beta → P4 monetización → P5 ampliaciones estéticas u opcionales.

**Definición de “primer cliente”:** una organización distinta del equipo fundador, que decide pagar por G-Kais, tiene un Workspace aislado y utilizable, completa su incorporación y consigue gestionar un flujo operativo real. Un interesado, participante beta gratuito o una venta aislada sin uso **no** cierra este objetivo.

**Hito intermedio:** primera empresa beta activa que usa la plataforma recurrentemente con sus datos operativos, previa autorización, aislamiento y garantías de privacidad.

## 1. Visión y límites del producto

G-Kais es una plataforma SaaS de gestión de relaciones, operación y continuidad para profesionales y negocios de formación, mentorías, coaching, consultoría y servicios especializados. Conecta leads → clientes/alumnos → programas/sesiones → tareas → historial → seguimiento → renovación; el Copilot contextual apoya al equipo utilizando información autorizada.

**Arquitectura de producto elegida:**
- Una sola aplicación y núcleo compartido. No clones por vertical.
- Un Workspace por organización, con identidad y datos propios.
- Módulos activables y desactivables sin eliminar históricos.
- Roles y permisos **independientes** de la activación de módulos: módulo disponible ≠ accesible para cada empleado.
- Identidad y términos adaptados (“alumnos”, “clientes”, “consultantes”), manteniendo modelo de datos consistente.
- Knowledge Base por capas: reglas generales del Core + plantilla vertical + conocimiento aprobado por empresa + contexto autorizado de la persona.
- IA debe usar datos pertinentes a ese Workspace, no mezclar fuentes ni inventar promesas, políticas o hechos no aprobados.

**No hacemos todavía:** app móvil nativa, marketplace, agentes autónomos complejos, automatización extensa de integraciones, plataformas separadas para trading/nutrición/marketing, rediseño integral del Workspace sin necesidad validada.

**Restricción de datos:** no aceptar expedientes clínicos u otra información sensible de alto riesgo sin revisión legal, controles técnicos y consentimiento acordes con el caso de uso. Para pilotos iniciales priorizar datos operativos minimizados y consentimiento de los titulares cuando corresponda.

## 2. Estado actual comprobado, no deseado

| Área | Estado inicial | Evidencia / observación |
| --- | --- | --- |
| 5.6 GitHub + Vercel | HECHO (despliegue) | main publicado en g-kais.vercel.app; CI TypeScript, test jerarquía y build |
| Workspace para Experts | AVANZADO, requiere QA externo | CRM, personas, webinars, formaciones, mentorías, relaciones, trabajo prioritario, supervisión y equipo |
| Membresía y permisos | IMPLEMENTACIÓN PARCIAL | Firestore expert_workspaces y reglas por colección |
| Persistencia de datos | PARCIAL | datos en Firestore, pero existen flujos heredados en localStorage por Workspace |
| Knowledge Base | BASE INICIAL | business_knowledge/default compartido en src/services/businessKnowledge.ts, no KB multiempresa terminada |
| Copilot | PARCIAL | briefs contextualizados para casos específicos; vistas generales “Conocimiento” y “Copilot” del Workspace aún sin producto completo |
| Invitaciones | IMPLEMENTACIÓN PARCIAL | creación, aceptación, enlaces recuperables, intento automático por Resend; envío real sin dominio/configuración pendiente |
| Microsoft y acceso con enlace email | IMPLEMENTADOS EN INTERFAZ, NO VALIDADOS END-TO-END | habilitación de proveedores y configuración de Firebase pendientes |
| Web comercial | DESACTUALIZADA | secciones de auditoría gratuita, LeadFlow y pilotos del posicionamiento anterior |
| Compra de suscripción G-Kais | PENDIENTE | existe Stripe webhook de compras de alumnos dentro de Workspace, NO checkout de suscripciones de G-Kais |
| Alta empresarial + onboarding propio | PENDIENTE | “Client Onboarding” existente registra clientes/alumnos de una empresa, NO empresas que contratan G-Kais |
| Primera beta multiempresa | NO INICIADA | no admitir datos reales externos hasta criterios 5.7 y 6.0 mínimos |

**Principio de medición:** “código existente” no equivale a “probado con usuarios ni configurado en producción”.

## 3. Dos vías paralelas que no deben bloquearse

### Vía A — Producto seguro y utilizable
5.7 → 6.0 → 7.0 MVP → 8.0 captación → 9.0 beta → 10.0 cobro.  
Se prueban criterios de cierre antes de poner datos reales en producción.

### Vía B — Aprendizaje comercial (EMPIEZA YA)
No esperar a terminar la web o los pagos para entender compradores.
- [ ] Redactar propuesta de valor de 1 frase y definir 2 perfiles prioritarios: negocios de mentorías/formación y equipos de consultoría/servicios.
- [ ] Contactar e entrevistar inicialmente a 5–10 responsables de negocios pertinentes, sin pedir aún que ingresen información sensible.
- [ ] Identificar proceso actual, tamaño de equipo, leads/alumnos gestionados, herramientas, fugas de seguimiento y costo del problema.
- [ ] Reclutar 3–5 candidatos a empresa beta; documentar necesidad, consentimiento y expectativas.
- [ ] Establecer contacto periódico con candidatos mientras se cierran 5.7/6.0.
- [ ] Validar precio/disposición a pagar **sin confundir intención con compra**; pedir decisión comercial al terminar el piloto.
- [ ] Elegir una empresa “design partner” prioritaria para contrastar cada entrega; no construir 20 funciones por suposiciones.

**Entregable comercial:** lista de candidatos y matriz de problemas recurrentes, sin exponer datos privados en el repositorio.

## 4. Fases y criterios de cierre

### FASE 5.7 — Seguridad, persistencia y cierre de Production Hardening
**Estado: PENDIENTE · Prioridad P0 · Principal dependencia del piloto con datos reales.**

Entregables:
- [ ] Inventariar TODAS las colecciones Firestore, sus reglas de acceso, APIs, datos en localStorage y dependencias del propietario.
- [ ] Incluir rutas de registro público a webinars, sesiones externas y webhooks de compra de alumnos en matriz de amenazas/pruebas de aislamiento. La URL de inscripción actual se genera pero NO tiene ruta pública operativa implementada.
- [ ] Probar aislamiento entre empresas A y B y entre owner/manager/mentor/closer/assistant con emulador y pruebas de denegación.
- [ ] Corregir consultas y reglas donde un usuario pueda ver/modificar información de otro Workspace o saltarse una autorización desde una URL/API.
- [ ] Migrar o encapsular persistencia crítica que aún depende del navegador, sin pérdida de historial, y documentar reversión.
- [ ] Verificar consistencia de fechas, acciones, tareas, historiales, reintentos e idempotencia.
- [ ] Diseñar exportación/backup, recuperación, borrado y trazabilidad de cambios según el piloto.
- [ ] Revisar autenticación Google, invitación, método Microsoft y enlace email en pruebas de extremo a extremo; errores seguros.
- [ ] Revisar logs, errores observables y qué información NO registrar.
- [ ] Elegir alojamiento y plan permitido para empresas piloto con uso real; registrar costos.

**Salida (“Done”):** 2 identidades/empresas de prueba con datos diferentes; pruebas positivas y negativas de permisos aprobadas; logout/login/restauración sin pérdida; backup y recuperación documentados; sin bloqueo de datos críticos. **Si falla la seguridad, no se habilita el piloto externo.**

**Contribución al primer cliente:** hace posible confiar datos reales a G-Kais.

### FASE 6.0 — SaaS Multiempresa y catálogo modular
**Estado: PENDIENTE · Prioridad P0/P1.**

Entregables:
- [ ] Diseñar entidades diferenciadas: Usuario, Organización, Workspace, Membresía, Rol/Permisos, Configuración de módulos, Suscripción.
- [ ] Separar workspaceId de UID del propietario; aprovisionamiento seguro e idempotente del Workspace y roles base.
- [ ] Implementar creación/activación controlada de organizaciones beta desde G-Kais HQ (primero asistida; después autoservicio).
- [ ] Garantizar que los usuarios invitados ingresen al Workspace correcto; preparar compatibilidad futura con múltiples organizaciones por usuario.
- [ ] Definir catálogo Core y opcionales en un solo Workspace: personas/relaciones, tareas y dashboard como base; sesiones, mentorías, formaciones, webinars, leads, equipo/supervisión según uso.
- [ ] Guardar configuración y estado de módulos por Workspace; desactivar oculta navegación y funciones asociadas, **nunca elimina registros**.
- [ ] Aplicar autorización real módulo + permiso en vistas, consultas y endpoints; owner puede cambiar configuración permitida.
- [ ] Permitir terminología configurable sin duplicar entidades (“cliente” vs “alumno”).
- [ ] Crear HQ de operaciones beta mínimo: empresa, estado, propietario, módulos, fecha de activación, incidentes (no acceso irrestricto a datos privados).
- [ ] Hacer QA con perfiles de academia, mentoría y consultoría/nutrición sin datos clínicos.

**Salida:** se pueden crear 2 empresas diferentes, cada una con owner, módulos y miembros distintos; activación/desactivación reversible; datos aislados; permisos probados; ningún aprovisionamiento manual en Firestore.

**Contribución al primer cliente:** cada empresa obtiene un producto pertinente y seguro, no un Workspace genérico abarrotado.

### FASE 7.0 — Portal de bienvenida + Knowledge Base 2.0 + Copilot útil
**Estado: PENDIENTE · Prioridad P1.**

**Recorrido propuesto de empresa:**
1. Paso 1 Empresa: identidad, sector, contacto responsable, tamaño, objetivo y actividad.
2. Paso 2 Servicios/programas: oferta principal, público, resultado, modalidad, duración y frecuencia (mínimo 6 campos esenciales, otros opcionales); múltiples ofertas.
3. Paso 3 Knowledge Base: metodología, políticas, preguntas frecuentes, materiales, tono, límites y estructura; edición/aprobación.
4. Revisión/activación: G-Kais propone módulos, terminología, etapas, tareas/plantillas; propietario confirma o corrige.
5. Workspace: apertura con checklist de configuración progresiva; no bloquear por información secundaria.

Entregables:
- [ ] Diseñar esquema y persistencia del progreso de onboarding por Workspace; reanudable entre dispositivos.
- [ ] Preguntar qué plataformas y enlaces externos utiliza la empresa para webinars, clases y llamadas (Zoom/Meet/YouTube/otros), y cómo cobra sus formaciones; configurar recomendaciones sin obligarla a cambiar de herramientas.
- [ ] Crear cuestionarios adaptativos según modalidad de servicio (mentoría individual/grupal, coaching, curso, consultoría).
- [ ] Preparar presets verticales REUTILIZABLES sobre los mismos módulos; no Workspaces diferentes.
- [ ] Estructurar KB por workspaceId y versiones/estados borrador/aprobada; eliminar dependencia global de business_knowledge/default para la operación multiempresa.
- [ ] Implementar control de edición y publicación de conocimiento por propietario/rol autorizado.
- [ ] Enlazar Copilot a Core + vertical + empresa aprobada + persona, con trazabilidad de fuentes relevantes, límites y permisos.
- [ ] Evaluar el Copilot con escenarios reales controlados (trading educativo, marketing, coach, consultoría) y respuestas sin contexto.
- [ ] Mostrar pendientes de configuración sin impedir empezar a trabajar con el Core.

**Salida:** 2 empresas con ofertas distintas completan onboarding, activan módulos distintos y reciben respuestas del Copilot basadas solo en su conocimiento aprobado y contexto autorizado.

**Contribución al primer cliente:** percibe que G-Kais está adaptado a su negocio y obtiene valor desde la primera sesión.

### FASE 7.5 — Continuidad operativa: inscripciones, webinars, formación, sesiones y compras verificadas
**Estado: PENDIENTE · Prioridad P0/P1 · GATE OBLIGATORIO antes de beta con eventos, clases o reuniones reales.**

**Motivo:** el profesional debe seguir trabajando donde hoy hace sus eventos y reuniones. G-Kais gestiona la relación y automatiza la captura, pero NO reemplaza Zoom, Google Meet, YouTube Live ni las pasarelas que ya utiliza.

**Especificación técnica y funcional:** [GKAIS_FLUJOS_WEBINARS_FORMACIONES_SESIONES.md](./GKAIS_FLUJOS_WEBINARS_FORMACIONES_SESIONES.md). Este documento desarrolla el flujo Daniel Camero: RRSS → webinar → asistencia → compra/no compra → seguimiento o formación → mentoría, conservando una sola Persona.

Entregables mínimos:
- [ ] Corregir la ruta pública de inscripción al webinar: la URL generada `/register/webinar` aún no tiene pantalla/handler público específico en src/App.tsx. El interesado se inscribe SIN cuenta G-Kais y la información se guarda automáticamente en Persona + webinar_registrations de la empresa correcta, con consentimiento, protección anti-spam y deduplicación.
- [ ] Separar claramente **URL pública de inscripción** de **enlace privado o público de sesión externa**; aceptar y validar Zoom/Meet/YouTube/otro sin exigir que el cliente abandone su herramienta.
- [ ] Desde Webinar, clase de Formación/Cohorte y reuniones 1:1: permitir configurar y abrir el enlace del proveedor, conservar el historial y siguiente acción, y respetar agenda/zona horaria.
- [ ] Incorporar acceso correcto para quien se inscribió, incluyendo enlaces de registrante individuales cuando el proveedor lo exige; no prometer acceso genérico si Zoom exige aprobación/registro previo.
- [ ] Sincronizar asistencia solo cuando existan credenciales, permisos y evidencia reales; si no, mantener estado **desconocido**, con importación CSV/manual como alternativa.
- [ ] Consolidar **pago verificado de oferta del cliente** (distinto de pago de suscripción de G-Kais) con Persona + webinar/oferta/formación; idempotencia, Compradores/Priority Work, matrícula/cohorte, continuidad y tareas para quienes no compran.
- [ ] Validar flujo completo en 3 escenarios: (A) inscripción pública + no compra y seguimiento; (B) compra verificada + formación/clase; (C) consultor abre sesión Zoom/Meet y registra próxima acción sin módulos irrelevantes.
- [ ] Conservar funcionales importación CSV, registro manual, edición de participantes, compras, tareas, formaciones y pantallas aprobadas; cero regresiones destructivas.

**Implementación incremental:** primero enlace universal + formulario público + persistencia y deduplicación; después clases/reuniones y cobros verificables; luego integrar de manera profunda el proveedor que más utilicen las primeras empresas. No es necesario completar OAuth de tres plataformas antes de beta, pero sí garantizar el flujo real que utilicen los pilotos.

**Salida (“Done”):** participante externo se registra desde móvil y aparece sin carga manual; puede acceder a la sesión externa autorizada; el sistema sabe distinguir registrado, asistencia comprobada y pago verificado; clasifica y ejecuta próxima acción correctamente; alumno accede a clase con enlace real; el consultor puede utilizar su videollamada habitual. Todo aislado por empresa, probado end-to-end y sin regresiones.

**Contribución al primer cliente:** G-Kais acompaña el trabajo que el cliente YA realiza y elimina dobles registros, en lugar de obligarlo a cambiar de herramientas.

### FASE 8.0 — Web pública G-Kais 2.0 + demanda de beta
**Estado: PENDIENTE · Prioridad P1 (diseño paralelo a 6/7; publicación cuando se respalde con funcionalidad).**

Entregables:
- [ ] Reposicionar: de auditorías/LeadFlow aislado a gestión continua desde lead hasta resultado del cliente, trabajo de equipo y Copilot contextual.
- [ ] Nueva home: problema, solución, casos de uso, Workspace modular, demostración real, preguntas frecuentes y CTA principal.
- [ ] Sustituir CTA “Auditoría gratis” por “Solicitar acceso a beta”; opción secundaria “Ver demostración”.
- [ ] Crear formulario/lista beta y embudo interno de candidatos (consentimiento, contacto, actividad, tamaño, necesidad, seguimiento).
- [ ] Demostración congruente con funciones disponibles; no prometer automatizaciones o integraciones inexistentes.
- [ ] Preparar página de precios/planes como futura estructura, **sin simular cobros ni activar Checkout incompleto**.
- [ ] Mantener histórico de auditorías y leads existentes, migrar rutas/CTAs y revisar SEO/idiomas.
- [ ] Revisar UX móvil/notebook, accesibilidad, claridad comercial y captación.
- [ ] Medir solicitudes válidas → entrevistas → empresas aptas → activaciones.

**Salida:** un visitante nuevo puede explicar qué ofrece G-Kais, identificar si le sirve y solicitar beta o ver demostración sin instrucciones.

**Contribución al primer cliente:** transforma visitas en conversaciones con compradores reales.

### FASE 9.0 — Beta privada de trabajo real
**Estado: PENDIENTE · Prioridad P1 tras gates 5.7, 6.0, 7.0 y 7.5 para el flujo operativo del piloto.**

Entregables:
- [ ] Seleccionar 3–5 empresas/profesionales pertinentes; priorizar escenarios distintos y acotados.
- [ ] Establecer términos piloto, privacidad, confidencialidad, duración aproximada de 2–4 semanas y canal de soporte.
- [ ] Activar empresas con módulos pertinentes y dueño responsable; validar acceso y persistencia.
- [ ] Probar la operación existente del cliente (inscripción pública a webinars, videollamadas, clases, conversiones verificadas y seguimiento) sin sustituir sus proveedores; criterio de fase 7.5.
- [ ] Ayudar a importar solo datos mínimos necesarios, de forma segura, con verificación de duplicados y permisos.
- [ ] Añadir feedback dentro de G-Kais (problema, sección, impacto, sugerencia), evitando incluir datos de alumnos.
- [ ] Medir activación, usuarios activos, tareas creadas/completadas, seguimientos realizados, errores y sesiones, minimizando datos personales.
- [ ] Revisar semanalmente problemas prioritarios; resolver bugs críticos antes de nuevas funcionalidades.
- [ ] Medir resultados frente al proceso anterior (sin atribuir beneficios no demostrados).
- [ ] Preguntar intención de permanencia, objeciones y disposición a pagar; obtener testimonios solo con permiso.

**Salida sugerida de validación:** al menos 3 pilotos activos, 2 equipos que completen flujos cotidianos durante 2 semanas y al menos 1 organización que pida continuar y esté dispuesta a negociar un plan. Umbrales **hipótesis de trabajo**, ajustables con evidencia. No equivalen a ventas.

**Contribución al primer cliente:** convierte el software en prueba de valor, descubre fricción real y genera primeros compradores potenciales.

### FASE 10.0 — Primera contratación de G-Kais y modelo comercial
**Estado: PENDIENTE · Prioridad P1 al cerrar piloto; algunas tareas de pricing pueden comenzar antes.**

Entregables:
- [ ] Diseñar una oferta inicial simple (clientes objetivo, usuarios, módulos, soporte, límites, precio y condiciones); evitar catálogo excesivo.
- [ ] Validar precio y costes reales: infraestructura, correo, IA, soporte, transacciones, impuestos aplicables.
- [ ] Convertir 1 piloto satisfecho a cliente de pago mediante proceso claro; puede ser contratación **asistida** al principio.
- [ ] Implementar Checkout de suscripción de G-Kais (independiente de pagos por cursos/mentorías de sus clientes).
- [ ] Confirmar pago únicamente por webhooks válidos, idempotentes; activar/suspender derechos por estado de suscripción.
- [ ] Crear portal de cuenta comercial: plan, facturas/comprobantes, método de pago, cambios de plan, cancelación y soporte.
- [ ] Definir fallos de pago, periodos de gracia, suspensión sin borrar datos, recuperación y cancelaciones.
- [ ] Completar aviso de privacidad, términos y gestión de datos para comercialización.
- [ ] Cuando corresponda: dominio propio, identidad remitente verificada y correo automático real de invitación/bienvenida.
- [ ] Verificar transacción de prueba y contratación real de extremo a extremo.
- [ ] Planificar adquisición repetible, no solo una venta puntual.

**Salida:** 1 empresa externa efectivamente pagó, su servicio se encuentra activado con sus datos protegidos, puede trabajar y sabe cómo recibir soporte/cancelar. **Este es el hito PRIMER CLIENTE DE PAGO.**

**Contribución al primer cliente:** cierra el ciclo completo de venta y convierte la validación en ingreso.

### FASE 11.0 — Escala posterior a evidencia
**Estado: DIFERIDA hasta uso real + pagos.**
- [ ] Mejorar onboarding autoservicio, automatizaciones e integraciones según solicitudes repetidas.
- [ ] Ampliar plantillas de verticales basándose en clientes existentes, no en suposiciones.
- [ ] Implementar analítica de retención, costos de IA y margen por cliente.
- [ ] Optimizar hosting y dominio si el volumen o los costes lo justifican.
- [ ] Evaluar expansión comercial sin debilitar privacidad ni fiabilidad.

## 5. Flujo objetivo del cliente

**Visita** → web G-Kais 2.0 → demo/casos de uso → beta (ahora) o plan/pago (más adelante) → crea/verifica identidad → organización/Workspace independiente → onboarding guiado → KB aprobada → módulos recomendados y confirmados → importación/invitación de equipo → Workspace operativo → soporte/feedback → permanencia/renovación.

**Flujo real de los alumnos, clientes y leads de esa empresa (NO confundir con el comprador de G-Kais):** RRSS → URL pública de inscripción G-Kais → Persona + Webinar sin compra → Zoom/Meet/YouTube existente → asistencia comprobada o desconocida → compra de oferta verificada → Compradores y Formación/Cohorte o seguimiento de no comprador → sesiones/clases → continuidad. Es requisito de fase 7.5 antes de iniciar beta que implique estos usos.

**Nunca:** pago confirmado solo porque el navegador volvió de Stripe; Workspace “activo” por ver una pantalla sin membresía; Copilot que mezcla empresas; eliminar datos al ocultar un módulo.

**Beta inicial:** sin pasarela de pago; acceso por invitación aprobada y creación controlada de empresa; mismo flujo de onboarding y Workspace que luego usará un cliente pago.

## 6. Tablero de ejecución

| Entrega | Estado inicial 2026-10-09 | Bloqueador principal | Evidencia requerida |
| --- | --- | --- | --- |
| 5.6 Despliegue base | ✅ COMPLETADA | — | main y producción READY |
| 5.7 Seguridad/persistencia | ⬜ PENDIENTE | Verificar aislamiento/persistencia y pruebas | PRs + pruebas emulator + recuperación |
| 6.0 Multiempresa/módulos | ⬜ PENDIENTE | Diseño de organización y permisos robustos | 2 Workspaces de prueba aislados |
| 7.0 Onboarding + KB + Copilot | ⬜ PENDIENTE | Estructura multiempresa aprobada | 2 activaciones de negocios distintos |
| 7.5 Webinars/formación/reuniones/pago real | ⬜ PENDIENTE · BLOQUEANTE DE BETA OPERATIVA | Inscripción pública sin handler; falta conexión sesiones/pagos | 3 recorridos end-to-end sin cargas manuales ni regresión |
| 8.0 Web pública/solicitud beta | ⬜ PENDIENTE | Mensaje/CTA/demo confiable | Prospectos pueden registrarse |
| 9.0 Beta privada | ⬜ PENDIENTE | Gates 5.7, 6.0, 7.0, 7.5 y alojamiento correcto | 3 pilotos, métricas y feedback |
| 10.0 Primera venta | ⬜ PENDIENTE | Propuesta y valor validado | 1 cliente pagando y activo |
| 11.0 Escala | ⏸ DIFERIDA | Retención y unidad económica | Usuarios y pagos recurrentes |

**En paralelo:** ⬜ entrevistar y reclutar 5–10 prospectos; no pedir datos reales hasta superar gates.

### Próximas tres tareas concretas (inicio fase 5.7)

1. **Mapa de datos:** inventario de persistencia/colecciones/rutas de servidor y localStorage; clasificar riesgos P0 y migraciones necesarias.
2. **Matriz de permisos con pruebas negativas:** empresa A contra B; owner, manager, mentor y asistente; reglas Firestore y endpoints; documentar resultados.
3. **Ruta de alta segura:** especificar entidad Organización/Workspace y migración compatible con Workspace existente, preparando fase 6 sin aplicar cambios destructivos.

**No se comienza por rediseñar la home ni integrar cobros**: antes resolver la entrada segura de empresas reales. En cambio, sí iniciamos entrevistas a posibles usuarios de inmediato.

## 7. Gobierno del roadmap y metodología

**Cada PR debe incluir:**
- Fase/ID, problema del cliente y respuesta a “¿nos acerca al primer cliente?”.
- Alcance exacto; indicar expresamente qué NO se modifica.
- Riesgos de permisos/datos; pruebas de regresión y reversión.
- Criterio objetivo para marcar la tarea completada.
- Evidencia: código, tests/CI, despliegue y, cuando aplique, validación visual del propietario/usuario.
- Actualización de este documento SOLO si cambia el estado o hay decisión relevante.

**Estados usados:** PENDIENTE → EN PROGRESO → IMPLEMENTADO → VALIDADO → COMPLETADO. “IMPLEMENTADO” no sustituye “VALIDADO”.

**Criterio para priorizar ideas nuevas:**
1. ¿Bloquea seguridad o acceso a datos reales? P0, inmediato.
2. ¿Permite activar usuarios o completar trabajo real? P1.
3. ¿Mejora captación o conversión a pago? P1, según etapa.
4. ¿Lo pidió un participante beta repetidamente y hay evidencia? evaluar.
5. ¿Es solo estético u optimización marginal? después, salvo defectos graves.

**Disciplina de producto:** no ampliar alcance sin necesidad; mantener UI aprobada; trabajar sobre ramas/PR; validar TypeScript, test jerarquía y build; no publicar fallos; desplegar y verificar Vercel antes de anunciar release. El propietario valida flujos visuales y comerciales. No inventar métricas de uso ni afirmar correos enviados solo porque existe código.

## 8. Decisiones aprobadas y pendientes

### Aprobadas
- G-Kais 2.0 será un único SaaS con módulos por empresa; no versiones aisladas por sector.
- El Workspace actual se preserva y adapta, no se reescribe desde cero.
- Módulos reversibles; permisos separados de visibilidad.
- Onboarding de empresa **distinto** del onboarding de alumnos/clientes de dicha empresa.
- Knowledge Base por capas y aislada por Workspace, con aprobación humana.
- Retirar auditoría gratuita como CTA principal al rehacer la web; preservar datos históricos.
- Beta privada con empresas que trabajen diariamente; captar feedback y validar antes de escalar.
- Primer cliente de pago como métrica objetivo transversal.

### Pendientes de validar con usuarios
- Oferta y precio; tamaño de equipo/volumen; módulos base y opcionales del primer plan.
- Sectores prioritarios basados en entrevistas reales.
- Campos mínimos exactos por vertical y lenguaje de negocio.
- Qué datos y migración importar, y niveles de soporte.
- Proveedor/plan de hosting que permita el uso empresarial durante beta y producción.
- Condiciones y requerimientos legales por país/rubro, especialmente datos sensibles.

### No son bloqueantes ahora
- Compra de dominio corporativo.
- Branding final de correo y envío a externos por Resend hasta fase habilitada.
- Checkout avanzado, cupones, marketplace, app móvil, integraciones profundas, RAG y agentes autónomos.
- Rediseños de UI no relacionados con seguridad, incorporación o adopción.

## 9. Registro de avances (actualizar después de cada etapa)

| Fecha | Fase | Cambio/decisión | Evidencia | Impacto sobre primer cliente |
| --- | --- | --- | --- | --- |
| 2026-10-09 | Plan maestro | Fijada visión modular, recorrido cliente y secuencia 5.7–11.0 | Este documento | Evita trabajo inconexo y da criterios de avance |
| 2026-10-09 | Estado base | main en 3afefab; invitaciones recuperables, login ampliado sujeto a configuración, Workspace existente | Revisión de repo y PRs 275–276 | Base para beta, aún sin validación multiempresa |
| 2026-10-09 | Requisito de cliente | Se restituye continuidad webinar → asistencia → compra/no compra → formación/cita; nace fase 7.5 como puerta de beta | [Especificación operativa](./GKAIS_FLUJOS_WEBINARS_FORMACIONES_SESIONES.md), revisión del código | Eliminar fricción de captación, reuniones y ventas que bloquearía al primer cliente |

## 10. Instrucción para retomar en otro chat

«Continuemos G-Kais usando **docs/GKAIS_ROADMAP_MAESTRO_2_0.md** como fuente de verdad y **docs/GKAIS_FLUJOS_WEBINARS_FORMACIONES_SESIONES.md** como especificación obligatoria para eventos y sesiones. Lee primero el documento y el estado actual de main en GitHub IsmaelGeraldo/G-Kais. Indica fase activa, casillas pendientes y el cambio mínimo que nos acerca al primer cliente. No alteres el diseño ni funcionalidades ajenas. Trabaja en GitHub mediante rama, PR y CI; verifica despliegue en Vercel cuando corresponda. Actualiza el roadmap con evidencia y respeta el objetivo: primer cliente de pago con datos seguros y uso real.»
