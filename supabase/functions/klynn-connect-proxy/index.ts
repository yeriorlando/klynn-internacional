import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_SERVER_URL = Deno.env.get('KLYNN_CONNECT_URL') || 'https://wa.klynn.com.do'
const DEFAULT_API_KEY = Deno.env.get('KLYNN_CONNECT_APIKEY') || 'klynn_evolution_secret_key_2026'
const WEBHOOK_TARGET_URL = Deno.env.get('KLYNN_WEBHOOK_URL') || 'https://api.klynn.com.do/functions/v1/whatsapp-webhook'

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

      if (createData?.qrcode?.base64) {
        return new Response(JSON.stringify({
          ok: true,
          created: true,
          state: 'connecting',
          qrcode: createData.qrcode.base64,
          code: createData.qrcode.code,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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

    // 4. CERRAR SESIÓN / LOGOUT
    if (action === 'logout') {
      const logoutRes = await fetch(`${serverUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers,
      })
      const logoutData = await logoutRes.json().catch(() => ({}))

      return new Response(JSON.stringify({
        ok: true,
        data: logoutData,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 5. ENVIAR MENSAJE DE TEXTO
    if (action === 'send_message') {
      const { number, text } = body
      if (!number || !text) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta number o text' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const cleanNumber = String(number).replace(/\D/g, '')

      const sendRes = await fetch(`${serverUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: cleanNumber,
          text: text,
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
      const { number, mediaUrl, mediaType, caption, fileName } = body
      const cleanNumber = String(number).replace(/\D/g, '')

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
