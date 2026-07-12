#!/bin/bash

echo "🐾 PetShop ERP/POS - Script de Instalación"
echo "==========================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar Node.js
echo -n "📦 Verificando Node.js... "
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js no está instalado${NC}"
    echo "Descargalo de: https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ $NODE_VERSION${NC}"

# 2. Verificar npm
echo -n "📦 Verificando npm... "
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm no está instalado${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ $NPM_VERSION${NC}"

# 3. Instalar dependencias
echo ""
echo "📥 Instalando dependencias (esto puede tardar unos minutos)..."
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Error al instalar dependencias${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dependencias instaladas${NC}"

# 4. Crear .env.local
echo ""
echo "🔑 Configurando variables de entorno..."
if [ ! -f .env.local ]; then
    cp .env.local.example .env.local
    echo -e "${YELLOW}⚠ Archivo .env.local creado${NC}"
    echo -e "${YELLOW}⚠ IMPORTANTE: Edita .env.local con tus credenciales de Supabase${NC}"
else
    echo -e "${GREEN}✓ .env.local ya existe${NC}"
fi

# 5. Type check
echo ""
echo "✅ Verificando tipos TypeScript..."
npm run type-check
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠ Hay errores de TypeScript (puedes ignorarlos por ahora)${NC}"
fi

# 6. Información final
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ Instalación completada exitosamente${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "📝 Próximos pasos:"
echo ""
echo "1. Edita .env.local con tus credenciales Supabase:"
echo "   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ..."
echo "   SUPABASE_SERVICE_ROLE_KEY=eyJ..."
echo ""
echo "2. Ejecuta migraciones de base de datos:"
echo "   npm run db:push"
echo ""
echo "3. Inicia el servidor de desarrollo:"
echo "   npm run dev"
echo ""
echo "4. Abre en el navegador:"
echo "   http://localhost:3000"
echo ""
echo "📚 Para más información, lee START_HERE.md"
echo ""
