# Hetzner VPS Backup & Disaster Recovery Workflow

Este documento detalla la infraestructura de **Respaldo Continuo y Contingencia (Disaster Recovery)** de Klynn SaaS configurada en el servidor secundario de **Hetzner Cloud**.

---

## 🔑 Credenciales y Datos de Conexión del VPS Hetzner

- **Servidor (IP Pública):** `2.28.50.140`
- **Ubicación:** Nuremberg, Alemania (nbg1-dc3)
- **Usuario SSH:** `root`
- **Llave Privada SSH:** `C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key` (o `id_ed25519`)
- **Puerto SSH:** `22`
- **Panel Coolify:** `http://2.28.50.140:8000`

---

## 🏗️ Arquitectura de Réplica y Sincronización

```mermaid
flowchart TD
    subgraph Oracle [Oracle Cloud VPS - 129.213.40.51]
        A[PostgreSQL Klynn Producción] -->|pg_dump --clean| B[Snapshot .sql.gz]
        C[Supabase Storage Volumes] -->|rsync| D[Mirror Storage]
        E[Edge Functions] -->|rsync| F[Mirror Functions]
        G[Crontab: Cada 2 horas] -->|Ejecuta| H[/data/scripts/sync_klynn_to_hetzner.sh]
    end

    subgraph Hetzner [Hetzner VPS - 2.28.50.140]
        H -->|SSH / SCP| I[/data/klynn-standby/snapshots/]
        H -->|Rsync| J[/data/klynn-standby/volumes/storage/]
        H -->|Rsync| K[/data/klynn-standby/volumes/functions/]
        I -->|restore_snapshot.sh| L[(PostgreSQL Standby: klynn-postgres-standby)]
        M[Coolify Panel: Port 8000]
    end
```

---

## 📂 Rutas y Estructura en Hetzner VPS (`2.28.50.140`)

- **Directorio Raíz de Standby:** `/data/klynn-standby/`
- **Servicio Supabase en Coolify:** `/data/coolify/services/fyv4swslwcm7rh3qz6rt3mle/`
- **Contenedor PostgreSQL Réplica:** `supabase-db-fyv4swslwcm7rh3qz6rt3mle`
- **Snapshots Históricos:** `/data/klynn-standby/snapshots/` (Se guardan snapshots comprimidos con retención de 7 días).
- **Snapshot más reciente:** `/data/klynn-standby/snapshots/latest.sql.gz`
- **Volúmenes de Storage (Imágenes/Comprobantes):** `/data/coolify/services/fyv4swslwcm7rh3qz6rt3mle/volumes/storage/`
- **Volúmenes de Edge Functions:** `/data/coolify/services/fyv4swslwcm7rh3qz6rt3mle/volumes/functions/`
- **Script de Restauración Automática:** `/data/klynn-standby/scripts/restore_snapshot.sh`
- **Logs de Restauración:** `/var/log/klynn_restore.log`

---

## 🛠️ Comandos de Conexión y Diagnóstico

### 1. Conectarse por SSH a la VPS de Hetzner desde PowerShell
```powershell
ssh -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no root@2.28.50.140
```

### 2. Verificar el Estado de la Base de Datos Standby en Hetzner
```powershell
ssh -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no root@2.28.50.140 "docker exec -i -e PGPASSWORD=V08YVaMfuCx44mGH2HfOZYV6v8cwPVLh klynn-postgres-standby psql -U supabase_admin -d postgres -c 'SELECT count(*) FROM tenants;'"
```

### 3. Ejecutar Sincronización Manual Inmediata desde Oracle hacia Hetzner
```powershell
ssh -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no ubuntu@129.213.40.51 "/data/scripts/sync_klynn_to_hetzner.sh"
```

### 4. Ver Logs de Sincronización en Oracle VPS
```powershell
ssh -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no ubuntu@129.213.40.51 "tail -n 50 /var/log/klynn_sync_to_hetzner.log"
```

---

## 🚨 Procedimiento de Activación ante Emergencia (Failover)

Si la VPS principal en Oracle Cloud sufriera una interrupción o corte:

1. **La base de datos en Hetzner ya tiene los datos sincronizados** (máximo 2 horas de antigüedad o la última ejecución).
2. **Para apuntar el tráfico a Hetzner:**
   - Entra a **Cloudflare DNS** de `klynn.com.do`.
   - Cambia los registros `A` de `api.klynn.com.do` y `app.klynn.com.do` para que apunten a la IP `2.28.50.140`.
3. El sistema continuará atendiendo clientes desde Hetzner inmediatamente.
