# NEXUS FARO

Sistema de Punto de Venta y gestión comercial: caja, inventario, ventas,
gastos fijos, empleados y reportes.

React 19 + TypeScript + Vite + Tailwind, con Supabase (PostgreSQL) como backend.

## Puesta en marcha

**Requisitos:** Node.js 20 o superior.

```bash
npm install
cp .env.example .env.local   # completar los valores
npm run dev
```

### Variables de entorno

Todas viven en `.env.local`, que **no se versiona**. Ver `.env.example`.

| Variable | Obligatoria | Para qué sirve |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | sí | URL del proyecto (Supabase → Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | sí | Clave pública del proyecto |
| `VITE_MASTER_PASSWORD_HASH` | no | Hash de la contraseña maestra de soporte |
| `VITE_SEED_OWNER_PIN` | no | PIN del Dueño en el primer arranque con la base vacía |

Si faltan las dos primeras, la app no arranca y explica qué configurar.

## Cómo funciona el acceso

Hay dos niveles, y conviene no confundirlos:

1. **La terminal** se conecta al negocio una sola vez con correo y contraseña de
   Supabase Auth. La sesión queda guardada y se renueva sola. Sin esa sesión la
   base de datos no devuelve nada.
2. **Los cajeros** entran con un PIN de 4 dígitos, que identifica quién está en
   la caja. Los PIN se guardan hasheados (PBKDF2-SHA256) y no se pueden mostrar:
   para darle acceso a alguien se le asigna un PIN nuevo.

### Crear la cuenta de la terminal

En Supabase → Authentication → Users → *Add user*. Por ejemplo
`terminal@tunegocio.com`, con *Auto Confirm User* marcado. Esas son las
credenciales que se cargan una vez en cada equipo.

### Acceso maestro de soporte

Opcional. Habilita el portal de diagnóstico y las copias de seguridad.

```bash
npm run hash-password
```

Imprime **dos líneas**, cada una para un lugar distinto — copiá la que
corresponda tal cual, sin retocarla:
- Para `.env.local` (uso local): sale con los `$` escapados (`\$`), porque
  Vite interpreta `$palabra` como referencia a otra variable y corta el hash
  en silencio si no están escapados.
- Para el panel de variables de entorno de un hosting (Vercel, Netlify,
  etc.): sale **sin** escapar — ese panel inyecta el valor directo, sin
  pasar por el mismo procesamiento de Vite, así que ahí las barras
  romperían el hash al revés.

La contraseña en sí no se guarda en ningún lado: sólo su hash, y sólo del
lado del build. Si la variable no está configurada (o quedó mal pegada), el
modo maestro queda deshabilitado y el mensaje de error lo indica.

## Multi-comercio

Cada comercio ve únicamente sus propios datos: usuarios, productos, ventas,
etc. quedan aislados por comercio a nivel de base de datos (RLS), no sólo
por lo que muestra la pantalla. La terminal de cada comercio se etiqueta una
vez con el id de su comercio; de ahí en más todo queda acotado sola.

El Portal Maestro (rol SUPERADMIN) da de alta nuevos comercios, crea sus
cuentas de terminal, y puede "Asistir a este Negocio" para ver sus datos
operativos reales con fines de soporte (de sólo lectura). Ver
[`supabase/README.md`](supabase/README.md) para el mecanismo completo.

## Despliegue a producción

Hoy esto corre con `npm run dev` en una máquina local — para que un comercio
lo use de verdad (y para poder mandarle una URL a un comercio cliente nuevo)
hace falta publicarlo en algún lado. Supabase (la base) ya está en la nube;
lo único que falta alojar es el frontend, que es un sitio estático (HTML +
JS) una vez compilado con `npm run build`.

**Recomendado: [Vercel](https://vercel.com/)** (o [Netlify](https://netlify.com/),
mismo mecanismo). Gratis para este volumen, detecta Vite solo, y se conecta
directo al repositorio de GitHub — cada `git push` recompila y publica
solo, sin tocar nada a mano después de la configuración inicial:

1. Crear cuenta en Vercel (podés entrar con la cuenta de GitHub que ya usás).
2. *Add New Project* → importar el repositorio `NEXUSFARO`.
3. Elegir qué rama publicar. Mientras el trabajo siga en
   `claude/project-review-3wqo5b`, se puede apuntar ahí directamente; más
   adelante conviene mergear a `main` y publicar esa rama, para que quede
   claro cuál es la versión "real".
4. Framework: Vite (lo detecta solo — build command `npm run build`, output
   `dist`).
5. Cargar las variables de entorno (mismas de `.env.local`, sección de
   arriba) en el panel de Vercel — **usando la versión sin escapar del hash
   maestro**, no la de `.env.local` (ver "Acceso maestro de soporte" más
   arriba).
6. *Deploy*. Da una URL con HTTPS al toque (`algo.vercel.app`), sin dominio
   propio necesario para arrancar.

Un detalle importante: estas variables se graban **adentro del build**, no
se leen en vivo — si más adelante cambiás alguna en el panel de Vercel
(por ejemplo, una nueva contraseña maestra), hace falta un deploy nuevo
para que tome efecto, no alcanza con guardar el cambio.

## Base de datos

Ver [`supabase/README.md`](supabase/README.md) para las migraciones, el estado
de las policies de RLS, y cómo activar el envío de comprobantes por email
(botón "Enviar Email" del ticket — requiere una cuenta de Resend).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en el puerto 3000 |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción |
| `npm run lint` | Chequeo de tipos (`tsc --noEmit`) |
| `npm run hash-password` | Genera el hash de la contraseña maestra |
