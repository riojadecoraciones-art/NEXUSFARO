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

### Alta de un comercio nuevo (manual, por ahora)

**Fase 2** (no construida todavía) automatizaría esto por completo. Hoy:

1. **Dar de alta el comercio** desde el Portal Maestro → pestaña "Negocios"
   → *Nuevo Negocio*. Ya persiste de verdad en la tabla `stores` (antes sólo
   vivía en memoria del navegador).
2. **Crear la cuenta de esa terminal** en Supabase → Authentication → Users
   → *Add user* (mismo paso que se hizo para la primera terminal). Marcá
   *Auto Confirm User*.
3. **Etiquetar esa cuenta** con el id del comercio recién creado — copiá el
   `id` de la card del comercio en el Portal Maestro, y corré en el SQL
   Editor de Supabase:

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data
     || jsonb_build_object('store_id', '<id-del-comercio-nuevo>')
   where email = '<email-de-la-terminal-nueva>';
   ```

   (Sin `'role': 'superadmin'` — eso queda reservado a la terminal del
   dueño de la plataforma. Un comercio cliente no debe poder ver el
   directorio de otros comercios.)
4. Esa terminal ya puede iniciar sesión: va a ver únicamente los datos de
   su propio comercio, vacíos hasta que empiece a cargar productos y
   vender.

### Lo que queda pendiente para más adelante (Fase 2, no construido)

- Que el operador de la plataforma pueda ver los datos operativos (ventas,
  productos) de un comercio cliente sin salir de su propia sesión —hoy
  "Asistir a este Negocio" sólo cambia el branding mostrado, no el alcance
  real de los datos, porque la sesión de Supabase sigue siendo la de la
  terminal del operador—.
- Reportes agregados reales entre comercios (hoy "Facturación (tu
  comercio)" y las demás tarjetas del Portal Maestro muestran sólo los
  números del propio comercio del operador, con la etiqueta actualizada
  para que quede claro).
- Automatizar el alta de la cuenta de terminal de un comercio nuevo (pasos
  2-3 de arriba) vía una Edge Function con la Admin API de Supabase Auth,
  en vez del paso manual.
