# Antigravity VPS Connection Workflow

Este archivo de instrucciones sirve para que cualquier agente de Antigravity sepa cómo conectarse automáticamente por SSH al VPS de Coolify de Yeri Orlando cuando sea necesario diagnosticar, dockerizar o desplegar servicios.

## Credenciales de Conexión del VPS

- **Servidor (IP):** `129.213.40.51` (Oracle Cloud Infrastructure VPS)
- **Usuario SSH:** `ubuntu`
- **Llave Privada SSH:** `C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key`
- **Puerto:** `22` (Estándar)

## Comando de Conexión en Consola

Para ejecutar comandos en el VPS a través de la terminal de Windows usando SSH, el agente debe usar el siguiente formato de comando:

```powershell
ssh -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@129.213.40.51 "[comando_a_ejecutar]"
```

*Ejemplo para verificar el estado de los contenedores Docker:*
```powershell
ssh -i "C:\Users\Yeri Orlando\.ssh\id_rsa_oracle.key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@129.213.40.51 "docker ps"
```

## Rutas de los Servicios de Supabase en el VPS

- **Supabase-Planix (Nuevo):** `/data/coolify/services/n940q0xzw3j61r222benm8im/`
- **Supabase-Planix (Referencia):** `/data/coolify/services/l8bsn7a0dtuh0y3188ag2l12/`
