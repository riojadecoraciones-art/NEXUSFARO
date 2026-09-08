# Base de datos (Supabase)

## Migraciones

El esquema original (tablas, índices y las policies abiertas iniciales) se creó
desde el panel de Supabase, no desde este repositorio: figura en la nube como la
migración `20260825151859_create_nexus_faro_schema` y **no está versionada acá**.
Para traerla:

```bash
npx supabase link --project-ref <tu-project-ref>
npx supabase db pull
```

A partir de ahí, toda migración nueva vive en `supabase/migrations/`.

## `20260901120000_rls_solo_sesion_autenticada.sql`

Cierra el acceso público a la base. Antes, las 13 tablas aceptaban lectura y
escritura del rol `anon`, o sea: cualquiera con la URL del proyecto y la anon
key —que es pública por diseño— podía leer y modificar ventas, productos y la
tabla de usuarios.

**No la apliques hasta haber hecho estos dos pasos**, o la app se queda sin ver
los datos:

1. **Crear la cuenta de la terminal** en Supabase → Authentication → Users →
   *Add user*. Usá un correo y una contraseña que puedas cargar vos en cada
   terminal (por ejemplo `terminal@tunegocio.com`). Marcá *Auto Confirm User*.
2. **Desplegar esta versión de la app**, que muestra la pantalla de acceso de
   terminal y abre sesión antes de leer nada.

Recién entonces:

```bash
npx supabase db push
```

o pegá el contenido del `.sql` en Supabase → SQL Editor.

### Cómo funciona el acceso después de esta migración

- La **terminal** se autentica una sola vez con correo y contraseña. Supabase
  guarda la sesión y la renueva sola: no hay que reingresarla cada día.
- Los **cajeros** siguen entrando con su PIN de 4 dígitos, como siempre. El PIN
  identifica quién está en la caja; la sesión de Supabase es la que autoriza el
  acceso a los datos.
- La anon key deja de servir por sí sola: sin sesión, la base no devuelve nada.

## Enviar el comprobante por email

El botón "Enviar Email" del comprobante llama a la Edge Function
`send-receipt-email` (ya desplegada), que usa [Resend](https://resend.com/)
para mandar el correo. La API key de Resend no puede vivir en el navegador —
cualquiera que abriera la consola (F12) podría leerla y mandar correo en
nombre del negocio — así que el envío pasa por el servidor.

**Sin este paso, el botón responde "El envío de emails no está configurado
en el servidor todavía."** — no rompe nada, simplemente no manda el correo.

### 1. Crear la cuenta y la API key

1. Creá una cuenta en [resend.com](https://resend.com/) (nivel gratis: 3.000
   emails/mes, 100/día).
2. [Generá una API key](https://resend.com/api-keys).

### 2. Cargar el secreto en Supabase

Dashboard del proyecto → **Edge Functions → Secrets** → *Add secret*:

| Nombre | Valor |
| --- | --- |
| `RESEND_API_KEY` | la clave que generaste en el paso anterior |

Con sólo esto el envío ya funciona, pero **limitado**: sin un dominio propio
verificado, Resend sólo entrega a la casilla con la que creaste la cuenta —
no a clientes reales. Sirve para probar, no para producción.

### 3. (Para mandarle a clientes reales) Verificar un dominio propio

1. [Agregá y verificá tu dominio](https://resend.com/domains) en Resend
   (son un par de registros DNS; la mayoría de los dominios de La Rioja se
   verifican en minutos si tenés acceso al panel del dominio).
2. Agregá un segundo secreto en Supabase:

   | Nombre | Valor |
   | --- | --- |
   | `RESEND_FROM_EMAIL` | `Rioja Decoraciones <comprobantes@tudominio.com>` |

   Sin este secreto, el remitente queda en la dirección de prueba de Resend
   (`onboarding@resend.dev`), que sólo entrega a tu propia casilla.

No hace falta volver a desplegar la función después de cargar los secretos:
Supabase se los inyecta en la próxima invocación.

## `20260904120000_multi_tenant_store_id.sql`

Convierte la base de un solo negocio a multi-comercio real: cada una de las
12 tablas operativas (`users`, `categories`, `products`, `sales`,
`sale_items`, `cash_shifts`, `cash_movements`, `parked_tickets`,
`stock_movements`, `fixed_expenses`, `app_alerts`, `store_settings`) suma
`store_id`, con RLS que acota cada sesión a los datos de su propio comercio.
`stores` (el directorio de comercios en sí) queda reservado a la terminal
marcada como operadora de la plataforma.

**Ya aplicada en este proyecto** (verificada: `store_id` obligatorio y 0
filas huérfanas en las 12 tablas, RLS probada con sesiones simuladas). Esta
sección documenta el mecanismo para cuando haga falta repetirlo en otro
entorno, y el paso operativo que **si no se hace, la app se ve vacía**:

> **La terminal existente tiene que cerrar sesión y volver a entrar después
> de esta migración.** Su sesión ya abierta no tiene el dato de a qué
> comercio pertenece — eso se agrega recién ahora, y un token ya emitido no
> se actualiza solo. Mientras tanto va a ver la app sin datos, no rota.

### Cómo sabe cada sesión a qué comercio pertenece

Cada cuenta de terminal (Supabase Auth) lleva etiquetado en
`app_metadata.store_id` el comercio al que pertenece. Las políticas de RLS
leen ese dato directo del token de sesión
(`auth.jwt() -> 'app_metadata' ->> 'store_id'`), sin consultar ninguna otra
tabla. Como las columnas `store_id` tienen `DEFAULT` apuntando a ese mismo
valor, el código de la app no necesita mandar `store_id` en cada alta: lo
completa la base sola, a partir de qué terminal hizo la llamada.

No existe una herramienta para asignar ese dato desde el Dashboard de
Supabase directamente (Authentication → Users no tiene un campo de
"metadata" editable para esto) ni una API que lo haga sin exponer la
`service_role key` al navegador — se hace con una consulta SQL puntual
(ver paso 3 más abajo).

### Alta de un comercio nuevo

1. **Dar de alta el comercio** desde el Portal Maestro → pestaña "Negocios"
   → *Nuevo Negocio*. Persiste en la tabla `stores`.
2. En la misma card del comercio, **"Crear acceso de terminal"** → cargar el
   email de esa terminal → *Crear Cuenta*. Eso llama a la Edge Function
   `provision-store-terminal` (ver abajo), que crea la cuenta de Supabase
   Auth, la etiqueta con `store_id` y devuelve una contraseña generada — se
   muestra **una única vez** en el modal, para copiarla y pasársela al
   comercio por un canal seguro.
3. Esa terminal ya puede iniciar sesión: va a ver únicamente los datos de
   su propio comercio, vacíos hasta que empiece a cargar productos y vender.

No hace falta tocar Supabase a mano ni correr SQL: los pasos manuales que
antes hacían falta (crear el usuario en el Dashboard y taggearlo con una
consulta suelta) quedaron reemplazados por este flujo.

#### `provision-store-terminal` (Edge Function)

Usa la Admin API de Supabase Auth (`auth.admin.createUser`), que sólo
funciona con la `service_role key` — esa clave bypassa RLS por completo, así
que no puede vivir en el navegador (cualquiera que abra la consola del
cliente podría leerla). La función:

1. Valida con `auth.getUser()` que quien llama tiene una sesión real.
2. Chequea que esa sesión tenga `app_metadata.role === 'superadmin'` — sin
   este paso, cualquier terminal de cualquier comercio cliente podría dar de
   alta cuentas de otros comercios. Esto es aparte de `verify_jwt=true`
   (que sólo exige "hay una sesión", no "es la del operador de la
   plataforma").
3. Recién ahí crea el usuario y lo etiqueta con `app_metadata.store_id`
   (nunca con `role: superadmin` — eso queda reservado a la terminal del
   dueño de la plataforma).
4. Guarda una copia del email en `stores.terminal_email`, para que el
   Portal Maestro pueda mostrar "terminal activada" sin necesitar leer
   `auth.users` (a lo que sólo `service_role` tiene acceso).

**Alternativa manual** (si hiciera falta, p.ej. la función está caída):
Supabase → Authentication → Users → *Add user* (con *Auto Confirm User*
marcado), y después en el SQL Editor:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data
  || jsonb_build_object('store_id', '<id-del-comercio-nuevo>')
where email = '<email-de-la-terminal-nueva>';
```

## "Asistir a este Negocio" (auditoría de soporte)

El botón "Asistir a este Negocio" del Portal Maestro trae los datos
operativos reales del comercio elegido (ventas, productos, categorías,
gastos fijos, caja, stock, tickets aparcados, alertas y su configuración) —
no sólo cambia el nombre mostrado en pantalla. La sesión de Supabase del
operador sigue siendo la suya propia (acotada por RLS a su propio comercio,
como cualquier otra); ver los datos de otro comercio pasa por la Edge
Function `get-store-snapshot`, que:

1. Verifica con `auth.getUser()` que quien llama tiene sesión real y
   `app_metadata.role === 'superadmin'` — mismo chequeo que
   `provision-store-terminal`. Sin esto, cualquier comercio cliente podría
   pedir los datos de otro.
2. Recién ahí lee (con `service_role`, que bypassa RLS) los datos del
   comercio pedido — lectura pura, no inserta ni modifica nada del cliente.
3. Deja un registro en `superadmin_audit_log` (comercio auditado, quién y
   cuándo) — visible sólo para `role=superadmin`. Es la única forma de
   detectar después si esa sesión llegó a recorrer todo el listado de
   comercios.

**Es de sólo lectura a propósito.** Ninguna policy de las 12 tablas
operativas se relajó (eso hubiera dejado a la sesión del operador con
acceso permanente a todos los comercios, no sólo mientras elige auditar a
uno). En cambio, mientras `isImpersonating` está activo, cada función que
escribe datos (`AppContext.tsx`) se corta con un aviso — de lo contrario,
cualquier alta o baja durante la auditoría se hubiera guardado de verdad,
pero en el comercio del *operador*, no en el del cliente que está mirando.
No incluye la lista de empleados/PIN del comercio auditado (dato sensible,
fuera de lo pedido); la sección "Empleados" se oculta del menú mientras se
audita.

## Cobro a comercios clientes (manual)

El cobro en sí queda **fuera del sistema**: se manda el link de pago de
Mercado Pago por WhatsApp o el medio que sea, y cuando llega el pago se
actualiza el estado a mano desde el Portal Maestro (Negocios → Editar
Negocio). No hay integración con ninguna API de pagos ni cobro recurrente
automático — a propósito, para no meter esa complejidad (webhooks,
reintentos, cancelaciones) antes de que la cantidad de clientes lo justifique.

- **`stores.status = 'SUSPENDIDO'` ahora bloquea de verdad.** Antes era sólo
  una etiqueta visual; ahora, si se marca un comercio como SUSPENDIDO, esa
  terminal ve una pantalla de "cuenta suspendida" en vez del login normal
  (`StoreSuspendedScreen.tsx`) — no puede entrar hasta que se lo vuelva a
  marcar ACTIVO.
- **`stores.paid_until`** es sólo informativo (se ve en la card de cada
  comercio y se edita en el mismo formulario) — un recordatorio de cuándo
  hay que volver a cobrar, no dispara nada por sí solo.
- Para que cada terminal pueda chequear su propio estado sin poder leer el
  directorio completo de comercios (`stores` seguía reservada a
  `role=superadmin`), se sumó una policy de sólo lectura acotada a la propia
  fila: `id = (auth.jwt() -> 'app_metadata' ->> 'store_id')`. Postgres
  combina policies permisivas del mismo comando con OR, así que esto
  convive con `solo_superadmin` sin debilitarla — cada terminal sigue sin
  poder ver los datos de otros comercios, sólo el propio `status`.
- La terminal marcada `role=superadmin` nunca se autobloquea por esto (si
  alguna vez quedara SUSPENDIDO por error, seguiría pudiendo entrar al
  Portal Maestro para corregirlo).

### Lo que queda pendiente para más adelante (Fase 2, no construido)

- Reportes agregados reales entre comercios (hoy "Facturación (tu
  comercio)" y las demás tarjetas del Portal Maestro muestran sólo los
  números del propio comercio del operador, con la etiqueta actualizada
  para que quede claro).
- Si el volumen de clientes lo justifica más adelante: cobro recurrente
  automático vía la API de Mercado Pago (Suscripciones) en vez del proceso
  manual de arriba.
