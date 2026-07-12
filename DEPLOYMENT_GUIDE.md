// ============================================================================
// DEPLOYMENT GUIDE - PETSHOP ERP/POS SYSTEM
// Vercel + Supabase Deployment Instructions
// ============================================================================

# GUÍA COMPLETA DE DESPLIEGUE

Este documento contiene instrucciones paso a paso para desplegar el sistema PetShop ERP/POS
en producción usando Vercel y Supabase.

## TABLA DE CONTENIDOS

1. [Requisitos Previos](#requisitos-previos)
2. [Setup de Supabase](#setup-de-supabase)
3. [Configuración de Push Notifications](#push-notifications)
4. [Despliegue en Vercel](#despliegue-en-vercel)
5. [Variables de Entorno](#variables-de-entorno)
6. [Post-Deployment](#post-deployment)
7. [Monitoreo y Mantenimiento](#monitoreo)

---

## REQUISITOS PREVIOS

- Node.js 18+ y npm 9+
- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [Supabase](https://supabase.com)
- Git instalado y repositorio en GitHub
- Dominio personalizado (opcional pero recomendado)

---

## SETUP DE SUPABASE

### Paso 1: Crear Proyecto en Supabase

1. Ir a https://app.supabase.com
2. Click en "New Project"
3. Rellenar:
   - Project Name: `petshop-erp`
   - Database Password: (generar contraseña fuerte)
   - Region: Seleccionar región más cercana (ej: US East para LATAM usar US East)
   - Pricing Plan: Pro (recomendado para producción)

4. Click "Create new project" y esperar 2-3 minutos

### Paso 2: Obtener Credenciales de API

1. Ir a Settings → API Keys
2. Copiar:
   - `ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`

### Paso 3: Ejecutar Migraciones de Base de Datos

1. En la terminal del proyecto:

\`\`\`bash
npm install -g supabase-cli

supabase login

supabase link --project-ref <tu-project-ref>
# project-ref está en Settings → General

supabase db push
# Esto ejecuta 0001_initial_schema.sql
\`\`\`

2. Verificar en Supabase Dashboard que todas las tablas se crearon:
   - Table Editor → Debe haber ~15 tablas
   - RLS → Verificar que todas tienen Row Level Security activa

### Paso 4: Configurar Autenticación

1. Settings → Authentication
2. Auth Providers → Habilitar:
   - Email (ya está por defecto)
   - Google (opcional - recomendado)
   - GitHub (opcional)

3. URL Configuration:
   - Site URL: `https://tudominio.com` (si usas Vercel: tuproyecto.vercel.app)
   - Redirect URLs:
     ```
     https://tudominio.com/auth/callback
     https://tudominio.com/client
     https://tudominio.com/admin
     https://localhost:3000/auth/callback
     ```

### Paso 5: Habilitar Realtime (para notificaciones en vivo)

1. Settings → Realtime
2. Enable Realtime
3. Habilitar para las tablas: notifications, sales, inventory_movements

---

## PUSH NOTIFICATIONS

### Generar Keys VAPID

Necesitas generar un par de claves VAPID para Web Push Notifications.

1. En una terminal:

\`\`\`bash
npm install -g web-push
web-push generate-vapid-keys
\`\`\`

2. Copia el output:
   - Public Key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - Private Key → `VAPID_PRIVATE_KEY`

3. Guardarlos en variables de entorno (más adelante)

### Configurar Servicio de Push (Opcional - Advanced)

Para enviar notificaciones push automatizadas desde el servidor:

1. Crear función RPC en Supabase para enviar notificaciones
2. Crear Edge Function para manejar push
3. Usar `web-push` npm package

Consultar documentación en `/lib/services/notification.service.ts`

---

## DESPLIEGUE EN VERCEL

### Paso 1: Preparar Repositorio GitHub

\`\`\`bash
# Crear repo en GitHub
git init
git add .
git commit -m "Initial commit: PetShop ERP/POS"
git branch -M main
git remote add origin https://github.com/tu-usuario/petshop-erp.git
git push -u origin main
\`\`\`

### Paso 2: Conectar Vercel a GitHub

1. Ir a https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Seleccionar "Import Git Repository"
4. Buscar tu repositorio `petshop-erp`
5. Click "Import"

### Paso 3: Configurar Proyecto en Vercel

**Framework**: Next.js
**Root Directory**: ./
**Build Command**: `npm run build` (default)
**Output Directory**: `.next` (default)
**Environment Variables**: (ver sección siguiente)

### Paso 4: Agregar Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BGa...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:tu-email@example.com
NEXT_PUBLIC_APP_URL=https://tuproyecto.vercel.app
```

**Importante**: Seleccionar "Production" para cada variable

### Paso 5: Desplegar

1. Click "Deploy"
2. Vercel automáticamente:
   - Clonar repo
   - Instalar dependencias
   - Ejecutar build
   - Desplegar a CDN global

3. Esperar 3-5 minutos hasta que diga "Congratulations! Your project has been successfully deployed"

---

## VARIABLES DE ENTORNO

Crear archivo `.env.local` localmente con:

\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BGa...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:tu-email@example.com

# App Configuration
NEXT_PUBLIC_APP_NAME=PetShop ERP/POS
NEXT_PUBLIC_APP_URL=https://tuproyecto.vercel.app

# Node Environment
NODE_ENV=production
\`\`\`

**⚠️ NUNCA commitear .env.local a GitHub**

---

## POST-DEPLOYMENT

### 1. Verificar Despliegue

Ir a: `https://tuproyecto.vercel.app`

Verificar:
- ✅ Carga el sitio
- ✅ Puedo ver página de inicio (/client)
- ✅ Puedo hacer login
- ✅ Dashboard carga sin errores

### 2. Crear Usuario Admin

1. Ir a `/register` o usar Supabase Dashboard
2. Registrar usuario con:
   - Email: admin@tuempresa.com
   - Password: (fuerte)
   - Seleccionar role: admin

3. Confirmar email si es necesario

### 3. Crear Sucursal

Supabase Dashboard → SQL Editor:

\`\`\`sql
INSERT INTO branches (company_id, name, code, address, city, is_active)
SELECT 
  (SELECT id FROM companies LIMIT 1) as company_id,
  'Sucursal Principal',
  'MAIN',
  'Calle Principal 123',
  'Ciudad',
  true;
\`\`\`

### 4. Inicializar Inventario

Para cada producto creado, crear inventario:

\`\`\`sql
INSERT INTO inventory (company_id, branch_id, product_id, quantity_on_hand, minimum_stock, ideal_stock)
SELECT 
  p.company_id,
  b.id,
  p.id,
  0,
  10,
  50
FROM products p
CROSS JOIN branches b
WHERE p.company_id = b.company_id
ON CONFLICT DO NOTHING;
\`\`\`

### 5. Configurar Dominio Personalizado (Opcional)

En Vercel Dashboard → Settings → Domains:

1. Agregar dominio: `tudominio.com`
2. Seguir instrucciones de DNS
3. Actualizar URLs en Supabase Auth

---

## MONITOREO Y MANTENIMIENTO

### Logs y Monitoreo

**Vercel Dashboard**:
- Ir a Deployments para ver logs
- Usar "Logs" tab para errores en tiempo real
- Web Analytics para métricas de usuario

**Supabase Dashboard**:
- Database → Logs para ver errores SQL
- Auth → User Management para gestionar usuarios
- Storage → Revisar uso de almacenamiento

### Backups

Supabase realiza backups automáticos cada 7 días (plan Pro).

Para backup manual:
1. Supabase Dashboard → Backups
2. Click "Create Backup"

### Escalamiento

Si necesitas más capacidad:

1. **Vercel**: Automático - crece con demanda
2. **Supabase**: 
   - Pasar a plan "Team" ($50/mes)
   - Aumentar storage y compute

### Performance Optimization

Ya implementado:
- ✅ Compresión gzip
- ✅ Image optimization
- ✅ Code splitting
- ✅ Caching headers
- ✅ CDN global
- ✅ Database indexes
- ✅ Query optimization

Para mejorar más:
1. Usar Edge Functions en Supabase
2. Implementar ISR (Incremental Static Regeneration)
3. Agregar Redis para caché (Upstash)

---

## TROUBLESHOOTING

### "Build failed"

1. Verificar Node version: `node --version` (debe ser 18+)
2. Revisar logs en Vercel
3. Ejecutar localmente: `npm run build`
4. Limpieza: `rm -rf .next node_modules && npm install && npm run build`

### "Supabase connection error"

1. Verificar variables de entorno en Vercel
2. Verificar que el proyecto Supabase está activo
3. Verificar IP whitelist (Settings → Database → IP Whitelist)
4. Probar conexión localmente

### "Authentication not working"

1. Verificar Redirect URLs en Supabase Auth
2. Revisar que NEXT_PUBLIC_SUPABASE_URL es correcto
3. Limpiar cookies: Devtools → Storage → Clear all

### "PWA not installing"

1. Verificar que estás en HTTPS
2. Verificar manifest.json está accesible
3. Revisar console para errores de service worker
4. Permitir instalación en navegador

---

## PRÓXIMOS PASOS

1. **Tema personalizado**: Editar colores en `/lib/config/theme.ts`
2. **Email notifications**: Integrar Resend o SendGrid
3. **SMS alerts**: Integrar Twilio
4. **Analytics**: Agregar Mixpanel o Plausible
5. **Chat support**: Integrar Intercom o Zendesk

---

## SOPORTE Y DOCUMENTACIÓN

- Documentación Next.js: https://nextjs.org/docs
- Documentación Supabase: https://supabase.com/docs
- Documentación Vercel: https://vercel.com/docs
- Community: https://github.com/supabase/supabase/discussions

---

## CONTACTO Y ACTUALIZACIONES

Para reportar bugs o sugerencias, usar:
- GitHub Issues
- Email: soporte@tuempresa.com
- WhatsApp: +XX XXX XXXX

Versión: 1.0.0
Última actualización: 2024
