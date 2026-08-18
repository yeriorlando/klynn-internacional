# Reglas del Agente - Manejo de Proyectos Supabase

Este documento establece las normas de conducta y seguridad para el agente de IA cuando trabaje en este ecosistema multi-proyecto.

## Protocolo de Base de Datos
Siempre que se requiera realizar una tarea que involucre acceder, modificar o consultar bases de datos de Supabase (tablas, RLS, funciones, logs, etc.), el agente **DEBE**:

1. **Preguntar explícitamente** al usuario a qué proyecto desea acceder antes de ejecutar cualquier comando.
2. Confirmar el proyecto actual basándose en los tokens configurados:
   - **Planix-core**: Para tareas relacionadas con la infraestructura principal de Planix.
   - **Klynn**: Para tareas relacionadas con la plataforma Klynn.

## Configuración MCP
Los tokens de acceso para estos proyectos están configurados en el archivo maestro de configuración MCP del sistema. El agente no debe exponer estos tokens en los logs ni compartirlos en texto plano a menos que sea estrictamente necesario para depuración solicitada por el usuario.

## Seguridad
- No realizar cambios DDL (esquema) sin previa aprobación del plan de ejecución.
- Validar siempre las políticas de RLS después de crear nuevas tablas.
