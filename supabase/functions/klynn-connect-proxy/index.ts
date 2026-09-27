import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_SERVER_URL = Deno.env.get('KLYNN_CONNECT_URL') || 'https://wa.klynncloud.com'
const DEFAULT_API_KEY = Deno.env.get('KLYNN_CONNECT_APIKEY') || 'klynn_evolution_secret_key_2026'
const WEBHOOK_TARGET_URL = Deno.env.get('KLYNN_WEBHOOK_URL') || 'https://api.klynncloud.com/functions/v1/whatsapp-webhook'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'status'

  // 0. DESCARGAR / SERVIR MULTIMEDIA (GET)
  if (req.method === 'GET' && action === 'media') {
    try {
      const rawMsgId = url.searchParams.get('msg_id')
      const rawWamid = url.searchParams.get('wamid')
      const msgId = rawMsgId ? rawMsgId.split('|')[0].trim() : null
      const wamid = rawWamid ? rawWamid.split('|')[0].trim() : null
      const directUrl = url.searchParams.get('url')

      if (msgId || wamid) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        let query = supabase.from('messages').select('payload')
        if (msgId) {
          query = query.eq('id', msgId)
        } else if (wamid) {
          query = query.eq('wamid', wamid)
        }
        const { data: msg } = await query.limit(1).maybeSingle()
        if (msg?.payload?.data) {
          const instance = msg.payload.instance || url.searchParams.get('instance') || 'klynn_reynita'
          const evoRes = await fetch(`${DEFAULT_SERVER_URL}/chat/getBase64FromMediaMessage/${instance}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': DEFAULT_API_KEY,
            },
            body: JSON.stringify({ message: msg.payload.data, convertToMp4: false })
          })
          if (evoRes.ok) {
            const evoData = await evoRes.json()
            if (evoData.base64) {
              const contentType = evoData.mimetype || 'image/jpeg'
              const binary = Uint8Array.from(atob(evoData.base64), c => c.charCodeAt(0))
              return new Response(binary, {
                status: 200,
                headers: {
                  ...corsHeaders,
                  'Content-Type': contentType,
                  'Cache-Control': 'public, max-age=31536000'
                }
              })
            }
          }
        }
      }

      if (directUrl && !directUrl.includes('mmg.whatsapp.net')) {
        const res = await fetch(directUrl)
        if (res.ok) {
          const contentType = res.headers.get('Content-Type') || 'application/octet-stream'
          const buffer = await res.arrayBuffer()
          return new Response(buffer, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000'
            }
          })
        }
      }
    } catch (e) {
      console.error('Media proxy error:', e)
    }
    return new Response('Media not found', { status: 404, headers: corsHeaders })
  }

  try {
    let body: any = {}
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}))
    }

    const serverUrl = (body.server_url || DEFAULT_SERVER_URL).replace(/\/$/, '')
    const apiKey = body.api_key || DEFAULT_API_KEY
    const instanceName = body.instance_name || url.searchParams.get('instance_name') || ''

    if (!instanceName && action !== 'list_instances') {
      return new Response(JSON.stringify({ ok: false, error: 'Falta instance_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    }

    // 1. CREAR / OBTENER QR
    if (action === 'create_or_connect') {
      const createRes = await fetch(`${serverUrl}/instance/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          rejectCall: false,
          msgRetryCounterCache: true,
        }),
      })

      const createData = await createRes.json().catch(() => ({}))

      // Configurar el webhook de la instancia automáticamente
      try {
        await fetch(`${serverUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: WEBHOOK_TARGET_URL,
              byEvents: false,
              base64: true,
              events: [
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'CONNECTION_UPDATE',
              ],
            },
          }),
        })
      } catch (err) {
        console.error('Error auto-setting webhook for instance:', instanceName, err)
      }

      // Configuración de protección anti-ban en Evolution API
      try {
        await fetch(`${serverUrl}/settings/set/${instanceName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            rejectCall: false,
            msgRetryCounterCache: true,
            groupsIgnore: true,
            alwaysOnline: false,
            readMessages: true,
            readStatus: false,
            syncFullHistory: false,
          }),
        }).catch(() => {})
      } catch (err) {
        console.error('Error auto-setting anti-ban settings for instance:', instanceName, err)
      }

      if (createData?.qrcode?.base64) {
        return new Response(JSON.stringify({
          ok: true,
          created: true,
          state: 'connecting',
          qrcode: createData.qrcode.base64,
          code: createData.qrcode.code,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Si la instancia ya existía, comprobar su estado real
      const stateRes = await fetch(`${serverUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers,
      }).catch(() => null)
      const stateData = await stateRes?.json().catch(() => ({}))
      const currentState = stateData?.instance?.state || 'close'

      // Si ya está abierta, no hace falta generar QR ni recrear
      if (currentState === 'open') {
        return new Response(JSON.stringify({
          ok: true,
          created: false,
          state: 'open',
          qrcode: null,
          code: null,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Si la instancia existe pero NO está en 'open' (estado 'close' o 'connecting' residual/zombi),
      // purgamos la sesión vieja para que WhatsApp no rechace el emparejamiento con llaves inválidas.
      try {
        let delOk = false
        const delRes = await fetch(`${serverUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers,
        })
        delOk = delRes.ok
        if (!delOk) {
          // Intentar un restart para forzar liberación del socket y reintentar delete
          await fetch(`${serverUrl}/instance/restart/${instanceName}`, { method: 'POST', headers }).catch(() => ({}))
          await fetch(`${serverUrl}/instance/delete/${instanceName}`, { method: 'DELETE', headers }).catch(() => ({}))
        }

        // Recrear la instancia 100% limpia con llaves frescas de Baileys
        const recreateRes = await fetch(`${serverUrl}/instance/create`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
            rejectCall: false,
            msgRetryCounterCache: true,
          }),
        })
        const recreateData = await recreateRes.json().catch(() => ({}))

        // Configuración de protección anti-ban
        try {
          await fetch(`${serverUrl}/settings/set/${instanceName}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              rejectCall: false,
              msgRetryCounterCache: true,
              groupsIgnore: true,
              alwaysOnline: false,
              readMessages: true,
              readStatus: false,
              syncFullHistory: false,
            }),
          }).catch(() => {})
        } catch (_) {}

        if (recreateData?.qrcode?.base64) {
          return new Response(JSON.stringify({
            ok: true,
            created: true,
            state: 'connecting',
            qrcode: recreateData.qrcode.base64,
            code: recreateData.qrcode.code,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      } catch (cleanErr) {
        console.error('Error auto-recovering instance:', instanceName, cleanErr)
      }

      const qrRes = await fetch(`${serverUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers,
      })
      const qrData = await qrRes.json().catch(() => ({}))

      return new Response(JSON.stringify({
        ok: true,
        created: false,
        state: qrData?.instance?.state || (qrData?.base64 ? 'connecting' : 'close'),
        qrcode: qrData?.base64 || qrData?.qrcode?.base64 || null,
        code: qrData?.code || qrData?.qrcode?.code || null,
        instance: qrData?.instance || createData?.instance || null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. OBTENER QR ACTUALIZADO
    if (action === 'get_qr') {
      const qrRes = await fetch(`${serverUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers,
      })
      const qrData = await qrRes.json().catch(() => ({}))

      return new Response(JSON.stringify({
        ok: true,
        state: qrData?.instance?.state || (qrData?.base64 ? 'connecting' : 'close'),
        qrcode: qrData?.base64 || qrData?.qrcode?.base64 || null,
        code: qrData?.code || qrData?.qrcode?.code || null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. CONSULTAR ESTADO DE CONEXIÓN
    if (action === 'get_status') {
      const stateRes = await fetch(`${serverUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers,
      })
      const stateData = await stateRes.json().catch(() => ({}))
      const state = stateData?.instance?.state || 'close'

      let phone = ''
      let profilePic = ''
      let profileName = ''

      if (state === 'open') {
        try {
          const fetchRes = await fetch(`${serverUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
            method: 'GET',
            headers,
          })
          const instances = await fetchRes.json().catch(() => [])
          const inst = Array.isArray(instances) ? instances.find(i => i.name === instanceName) : instances
          if (inst) {
            phone = inst.ownerJid ? inst.ownerJid.split('@')[0] : ''
            profilePic = inst.profilePicUrl || ''
            profileName = inst.profileName || ''
          }
        } catch (e) {
          console.error('Error fetching instance details:', e)
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        state,
        phone,
        profilePic,
        profileName,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 4. CERRAR SESIÓN / LOGOUT / DESVINCULAR
    if (action === 'logout') {
      try {
        await fetch(`${serverUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers,
        })
      } catch (_) {}

      // Eliminar la instancia para que el próximo escaneo sea 100% limpio
      try {
        const delRes = await fetch(`${serverUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers,
        })
        if (!delRes.ok) {
          await fetch(`${serverUrl}/instance/restart/${instanceName}`, { method: 'POST', headers }).catch(() => ({}))
          await fetch(`${serverUrl}/instance/delete/${instanceName}`, { method: 'DELETE', headers }).catch(() => ({}))
        }
      } catch (_) {}

      return new Response(JSON.stringify({
        ok: true,
        message: 'Instancia desvinculada y limpiada correctamente',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 5. ENVIAR MENSAJE DE TEXTO
    if (action === 'send_message') {
      const { number, text, delay } = body
      if (!number || !text) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta number o text' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const cleanNumber = String(number).replace(/\D/g, '')

      // Anti-ban: Simulación de tipeo humano con delay y presencia 'composing'
      const simulatedDelay = typeof delay === 'number' && delay >= 0
        ? delay
        : Math.floor(1200 + Math.random() * 800)

      try {
        // Enviar presencia de 'composing' de forma no bloqueante a Evolution API
        fetch(`${serverUrl}/chat/sendPresence/${instanceName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            presence: 'composing',
            delay: simulatedDelay,
          }),
        }).catch(() => {})
      } catch (_) {}

      const sendRes = await fetch(`${serverUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: cleanNumber,
          text: text,
          delay: simulatedDelay,
          linkPreview: false,
        }),
      })

      const sendData = await sendRes.json().catch(() => ({}))
      if (!sendRes.ok) {
        return new Response(JSON.stringify({ ok: false, error: sendData?.response?.message || sendData?.message || 'Error al enviar' }), {
          status: sendRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ ok: true, data: sendData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6. ENVIAR MEDIA (IMAGEN, AUDIO, PDF, DOCUMENTO)
    if (action === 'send_media') {
      const { number, mediaUrl, mediaType, caption, fileName, delay } = body
      const cleanNumber = String(number).replace(/\D/g, '')

      const simulatedDelay = typeof delay === 'number' && delay >= 0
        ? delay
        : Math.floor(1500 + Math.random() * 1000)

      try {
        fetch(`${serverUrl}/chat/sendPresence/${instanceName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            presence: mediaType === 'audio' ? 'recording' : 'composing',
            delay: simulatedDelay,
          }),
        }).catch(() => {})
      } catch (_) {}

      let cleanMedia = mediaUrl || ''
      if (typeof cleanMedia === 'string' && cleanMedia.includes(';base64,')) {
        cleanMedia = cleanMedia.split(';base64,')[1]
      }

      if (mediaType === 'audio') {
        const sendRes = await fetch(`${serverUrl}/message/sendWhatsAppAudio/${instanceName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            number: cleanNumber,
            audio: cleanMedia,
            delay: simulatedDelay,
          }),
        })
        const sendData = await sendRes.json().catch(() => ({}))
        if (!sendRes.ok) {
          return new Response(JSON.stringify({ ok: false, error: sendData?.response?.message || sendData?.message || 'Error al enviar audio' }), {
            status: sendRes.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ ok: true, data: sendData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let mediatype = 'image'
      if (mediaType === 'document' || mediaType === 'pdf') {
        mediatype = 'document'
      } else if (mediaType === 'video') {
        mediatype = 'video'
      }

      const sendRes = await fetch(`${serverUrl}/message/sendMedia/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: cleanNumber,
          media: cleanMedia,
          mediatype: mediatype,
          caption: caption || '',
          fileName: fileName || (mediatype === 'document' ? 'documento.pdf' : 'imagen.png'),
          delay: simulatedDelay,
        }),
      })
      const sendData = await sendRes.json().catch(() => ({}))
      if (!sendRes.ok) {
        return new Response(JSON.stringify({ ok: false, error: sendData?.response?.message || sendData?.message || 'Error al enviar multimedia' }), {
          status: sendRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ ok: true, data: sendData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: false, error: 'Acción no reconocida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Klynn Connect Proxy error:', error)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
