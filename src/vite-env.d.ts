/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Hash PBKDF2 de la contraseña maestra. Ver README → Acceso maestro. */
  readonly VITE_MASTER_PASSWORD_HASH?: string;
  /** PIN inicial del usuario Dueño en el primer arranque. Si falta, se genera al azar. */
  readonly VITE_SEED_OWNER_PIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
