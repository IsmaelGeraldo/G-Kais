# G-Kais QA — aislamiento Firebase para validar roles

## Estado (2026-10-09)

- Producción: Firebase `careful-bloom-jmn89`, Firestore nombrado. No modificar.
- QA: Firebase `g-kais-qa`, Firestore `(default)`.
- La rama `security/phase-5-7-firestore-read-permissions-20261009` selecciona Firebase QA **solo** cuando `VITE_GKAIS_FIREBASE_TARGET=qa`.
- Las 8 variables QA se configuran como **Preview** y vinculadas únicamente a esa rama en Vercel.
- Sin esas variables la rama sigue utilizando el Firebase de producción; nunca realizar QA destructivo en una Preview sin comprobar a qué proyecto apunta. Un modo QA incompleto o con proyecto/DB/dominio distinto bloquea la app.

## Servicios que habilita el propietario en Firebase Console

1. Proyecto Firebase `g-kais-qa` (ya creado).
2. Authentication → Sign-in method → Google → Enable, con correo de soporte.
3. Firestore Database → Create database → Standard edition, ID `(default)`, región seleccionada, **Production mode** (por defecto denegar accesos hasta desplegar reglas). No utilizar Test mode.
4. Configuración del proyecto → Web app `G-Kais QA Web` (ya registrada); API key y app ID para Web SDK, no JSON de cuenta de servicio.
5. Authentication → Settings → Authorized domains → registrar únicamente el host de la vista previa QA que se probará, nunca el URL completo con parámetros.

## Reglas de seguridad del proyecto de pruebas

Los tests usan Firebase Emulator con identidades inventadas. Cuando Firestore QA esté disponible, publicar las reglas candidatas `firestore.rules` **solo** en el proyecto `g-kais-qa`, sin modificar el proyecto real.

Usar exclusivamente `firebase.qa.json` y verificar el proyecto de destino. El `firebase.json` existente apunta al Firestore nombrado de producción y NO sirve para desplegar reglas QA sin cambiarlo.

Ejemplo de comando desde un equipo autorizado con Firebase CLI:

```bash
npx firebase-tools deploy --config firebase.qa.json --only firestore:rules --project g-kais-qa
```

No ejecutar `npm run deploy:firestore-rules`, que apunta explícitamente a producción. No se debe desplegar nada hasta tener Authentication/Firestore QA listos.

## Alcance de pruebas

- Usar identidades y datos ficticios. No migrar datos reales de clientes a QA.
- Verificar que QA navega al proyecto `g-kais-qa` **antes de** cambiar roles.
- QA Browser → Owner, Manager, Mentor, Closer, Assistant, Customer Success, reautenticación, persistencia, tareas asignadas y aislamiento entre dos Workspace sintéticos.
- El backend y los endpoints externos (correo, Stripe, webhooks) deben estar deshabilitados o aislados del entorno de producción antes de cualquier QA sobre ellos.
- Mantener PR #281 en borrador hasta completar revisión funcional y permisos.
