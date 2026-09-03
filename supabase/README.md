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
