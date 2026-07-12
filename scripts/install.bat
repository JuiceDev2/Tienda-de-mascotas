@echo off
echo.
echo ========================================
echo PetShop ERP/POS - Script de Instalacion
echo ========================================
echo.

REM Verificar Node.js
echo Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado
    echo Descargalo de: https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] %NODE_VERSION%

REM Verificar npm
echo Verificando npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm no esta instalado
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] %NPM_VERSION%

REM Instalar dependencias
echo.
echo Instalando dependencias (esto puede tardar unos minutos)...
call npm install
if errorlevel 1 (
    echo [ERROR] Error al instalar dependencias
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas

REM Crear .env.local
echo.
echo Configurando variables de entorno...
if not exist .env.local (
    copy .env.local.example .env.local
    echo [ATENCION] Archivo .env.local creado
    echo [ATENCION] IMPORTANTE: Edita .env.local con tus credenciales de Supabase
) else (
    echo [OK] .env.local ya existe
)

REM Type check
echo.
echo Verificando tipos TypeScript...
call npm run type-check
if errorlevel 1 (
    echo [ATENCION] Hay errores de TypeScript (puedes ignorarlos por ahora)
)

REM Informacion final
echo.
echo ================================================
echo OK - Instalacion completada exitosamente
echo ================================================
echo.
echo Proximos pasos:
echo.
echo 1. Edita .env.local con tus credenciales Supabase:
echo    NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
echo    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
echo    SUPABASE_SERVICE_ROLE_KEY=eyJ...
echo.
echo 2. Ejecuta migraciones de base de datos:
echo    npm run db:push
echo.
echo 3. Inicia el servidor de desarrollo:
echo    npm run dev
echo.
echo 4. Abre en el navegador:
echo    http://localhost:3000
echo.
echo Para mas informacion, lee START_HERE.md
echo.
pause
