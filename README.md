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

Copiá la línea que imprime en `.env.local`. La contraseña en sí no se guarda en
ningún lado: sólo su hash, y sólo del lado del build. Si la variable no está
configurada, el modo maestro queda deshabilitado.

## Multi-comercio

Cada comercio ve únicamente sus propios datos: usuarios, productos, ventas,
etc. quedan aislados por comercio a nivel de base de datos (RLS), no sólo
por lo que muestra la pantalla. La terminal de cada comercio se etiqueta una
vez con el id de su comercio; de ahí en más todo queda acotado sola.

El Portal Maestro (rol SUPERADMIN) da de alta nuevos comercios y lista el
directorio completo — pero, por ahora, sin ver los datos operativos de cada
uno (eso es trabajo a futuro). Ver [`supabase/README.md`](supabase/README.md)
para el mecanismo completo y los pasos para dar de alta un comercio nuevo.

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
