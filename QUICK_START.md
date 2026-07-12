# 🚀 QUICK START - PetShop ERP/POS

## 📋 Requisitos
- Node.js 18+
- npm 9+
- Cuenta Supabase
- Cuenta Vercel (para deploy)

## ⚡ Inicio en 5 minutos

### 1. Clonar y Instalar
```bash
git clone <tu-repo>
cd petshop-erp
npm install
```

### 2. Configurar Variables de Entorno
```bash
# Copiar template
cp .env.local.example .env.local

# Editar con tus credenciales Supabase
# NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Migrar Base de Datos
```bash
npm run db:push
```

### 4. Ejecutar Localmente
```bash
npm run dev
# Abrir http://localhost:3000
```

## 🌐 Desplegar a Producción

1. Lee **`DEPLOYMENT_GUIDE.md`** - Instrucciones paso a paso
2. Conecta a Vercel
3. Deploy automático en cada push a main

## 📚 Documentación

- **README.md** - Descripción general
- **DEPLOYMENT_GUIDE.md** - Despliegue a Vercel + Supabase
- **PROJECT_SUMMARY.md** - Resumen técnico
- **INDEX_OF_FILES.md** - Índice de archivos

## ✅ Verificar Instalación

```bash
# Compilar
npm run build

# Type-check
npm run type-check

# Linting
npm run lint
```

## 📊 Acceso a Sistema

- **Cliente**: http://localhost:3000/client
- **Admin**: http://localhost:3000/admin (requiere login)
- **Página Principal**: http://localhost:3000

## 🐛 Troubleshooting

**Error de conexión a Supabase:**
- Verifica variables de entorno
- Verifica que el proyecto Supabase está activo
- Intenta `npm run db:push` nuevamente

**Error en build:**
- Elimina `node_modules` y `.next`: `rm -rf node_modules .next`
- Reinstala: `npm install && npm run build`

## 💡 Próximos Pasos

1. Crear usuario admin
2. Crear sucursal
3. Agregar productos
4. Probar POS

Ver **DEPLOYMENT_GUIDE.md** para más detalles.

---

**¿Preguntas?** Lee la documentación o revisa el código - está bien comentado.

¡Éxito! 🐾
