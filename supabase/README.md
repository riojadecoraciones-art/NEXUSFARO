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
