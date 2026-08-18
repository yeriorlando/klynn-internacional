# Antigravity VPS Connection Workflow

Este archivo de instrucciones sirve para que cualquier agente de Antigravity sepa cómo conectarse automáticamente por SSH al VPS de Coolify de Yeri Orlando cuando sea necesario diagnosticar, dockerizar o desplegar servicios.

## 🔑 Credenciales de Conexión del VPS

- **Servidor (IP):** `129.213.40.51` (Oracle Cloud Infrastructure VPS)
- **Usuario SSH:** `ubuntu`
- **Llave Privada SSH:** `C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key`
- **Puerto:** `22` (Estándar)

---

## 🚀 Proyecto: Klynn (SaaS / POS)

### 📂 Rutas en el VPS
- **Servicios de Supabase (Klynn Backend):** `/data/coolify/services/l8bsn7a0dtuh0y3188ag2l12/`
- **Volúmenes de Funciones (Edge Functions):** `/data/coolify/services/l8bsn7a0dtuh0y3188ag2l12/volumes/functions/`

### 🐳 Contenedores del Backend (Supabase Klynn)
Todos los contenedores de Supabase para Klynn tienen el sufijo `l8bsn7a0dtuh0y3188ag2l12`.
- **Base de Datos Postgres:** `supabase-db-l8bsn7a0dtuh0y3188ag2l12`
- **Kong API Gateway:** `supabase-kong-l8bsn7a0dtuh0y3188ag2l12`
- **Autenticación (GoTrue):** `supabase-auth-l8bsn7a0dtuh0y3188ag2l12`
- **Edge Runtime:** `supabase-edge-functions-l8bsn7a0dtuh0y3188ag2l12`
- **Studio (Dashboard):** `supabase-studio-l8bsn7a0dtuh0y3188ag2l12`
- **REST API (PostgREST):** `supabase-rest-l8bsn7a0dtuh0y3188ag2l12`
- **Storage:** `supabase-storage-l8bsn7a0dtuh0y3188ag2l12`

### 🛠️ Comandos de Conexión y Diagnóstico para Klynn

Cualquier comando debe ejecutarse usando el formato de SSH desde PowerShell local.

#### 1. Verificar el Estado de todos los Contenedores de Klynn
```powershell
ssh -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL ubuntu@129.213.40.51 "docker ps --filter 'label=coolify.projectName=klynn' --format 'table {{.Names}}\t{{.Status}}'"
```

#### 2. Ver Logs de la Base de Datos de Klynn
```powershell
ssh -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL ubuntu@129.213.40.51 "docker logs --tail 100 supabase-db-l8bsn7a0dtuh0y3188ag2l12"
```

#### 3. Ver Logs de las Edge Functions de Klynn
```powershell
ssh -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL ubuntu@129.213.40.51 "docker logs --tail 100 supabase-edge-functions-l8bsn7a0dtuh0y3188ag2l12"
```

#### 4. Reiniciar las Edge Functions de Klynn (para forzar compilación/recarga)
```powershell
ssh -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL ubuntu@129.213.40.51 "docker restart supabase-edge-functions-l8bsn7a0dtuh0y3188ag2l12"
```

#### 5. Copiar/Desplegar una Edge Function (Ejemplo: `pronesoft-proxy`)
Para subir código de una Edge Function sin pasar por la CLI de Supabase completa, copia el archivo local `index.ts` al directorio temporal `/tmp` del VPS mediante `scp`, y luego muévelo a su volumen correspondiente:
```powershell
# 1. Copiar al VPS mediante SCP
scp -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL "c:\Users\Yeri Orlando\Desktop\Klynn SaaS\Klynn Cloud\Klynn\supabase\functions\pronesoft-proxy\index.ts" ubuntu@129.213.40.51:/tmp/index.ts

# 2. Mover a la carpeta de volumen de la función en el VPS
ssh -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL ubuntu@129.213.40.51 "sudo cp /tmp/index.ts /data/coolify/services/l8bsn7a0dtuh0y3188ag2l12/volumes/functions/pronesoft-proxy/index.ts"

# 3. Reiniciar el contenedor de Edge Functions para recargar
ssh -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL ubuntu@129.213.40.51 "docker restart supabase-edge-functions-l8bsn7a0dtuh0y3188ag2l12"
```

---

## 🚀 Proyecto: Planix-Supabase (Nuevo)

### 📂 Rutas en el VPS
- **Servicios de Supabase (Planix Backend):** `/data/coolify/services/n940q0xzw3j61r222benm8im/`

### 🐳 Contenedores del Backend (Supabase Planix)
Todos los contenedores de Supabase para Planix tienen el sufijo `n940q0xzw3j61r222benm8im`.
- **Base de Datos Postgres:** `supabase-db-n940q0xzw3j61r222benm8im`
- **Kong API Gateway:** `supabase-kong-n940q0xzw3j61r222benm8im`
- **Autenticación (GoTrue):** `supabase-auth-n940q0xzw3j61r222benm8im`

---

## 💡 Consejos de Uso para Agentes de Antigravity
1. **Seguridad de Red:** Si recibes un error de "Connection timed out", recuerda indicarle al usuario que verifique si la instancia de Oracle Cloud está apagada o si hay algún bloqueo en las listas de seguridad (Security Lists/IP whitelist) de su consola OCI.
2. **Evitar Interpolación local:** Cuando ejecutes comandos SSH remotos complejos desde PowerShell, evita escribir directamente caracteres especiales (`$`, `(`, `)`) en comandos entre comillas dobles, ya que PowerShell local intentará interpolarlos. Siempre es preferible subir archivos mediante `scp` en lugar de inyectar bloques grandes de código con `tee` o redirecciones.
