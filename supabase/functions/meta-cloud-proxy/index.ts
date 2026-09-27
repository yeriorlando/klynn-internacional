import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

let lastPurgeCall = 0

async function purgeExpiredInboundMedia(supabase: any) {
  const now = Date.now()
  if (now - lastPurgeCall < 30 * 60 * 1000) return
  lastPurgeCall = now
  try {
    const { data: files } = await supabase.storage.from('catalogo').list('conversations', { limit: 200 })
    if (!files || files.length === 0) return
    const cutoff = now - (24 * 60 * 60 * 1000)
    const toDelete = files
      .filter((f: any) => f.name !== '.emptyFolderPlaceholder' && f.created_at && new Date(f.created_at).getTime() < cutoff)
      .map((f: any) => `conversations/${f.name}`)
    if (toDelete.length > 0) {
      console.log(`[Meta Proxy] Purgando ${toDelete.length} archivos expirados (>24h)...`)
      await supabase.storage.from('catalogo').remove(toDelete)
    }
  } catch (_) {}
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'send_message'

  // Verificación oficial de Webhook de Meta (GET)
  if (req.method === 'GET' && url.searchParams.get('hub.mode') === 'subscribe') {
    const challenge = url.searchParams.get('hub.challenge')
    return new Response(challenge || 'ok', { status: 200 })
  }

  try {
    let body: any = {}
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}))
    }

    // 0. RECEPCIÓN DE WEBHOOK ENTRANTE DE META (MENSAJES Y ESTADOS)
    if (req.method === 'POST' && (body.object === 'whatsapp_business_account' || Array.isArray(body.entry))) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Limpieza automática no-bloqueante de archivos mayores a 24 horas
        void purgeExpiredInboundMedia(supabase)

        const entries = body.entry || []
        for (const entry of entries) {
          const changes = entry.changes || []
          for (const change of changes) {
            const value = change.value
            if (!value) continue

            const phoneNumberId = value.metadata?.phone_number_id

            // A) ACTUALIZACIÓN DE ESTADO (DELIVERED / READ / FAILED)
            if (Array.isArray(value.statuses)) {
              for (const st of value.statuses) {
                const wamid = st.id
                const newStatus = st.status === 'read' ? 'read' : (st.status === 'delivered' ? 'delivered' : st.status)
                if (wamid && newStatus) {
                  await supabase
                    .from('messages')
                    .update({ status: newStatus })
                    .eq('wamid', wamid)
                    .catch(() => {})
                }
              }
            }

            // B) MENSAJES ENTRANTES DE CLIENTES
            if (Array.isArray(value.messages) && value.messages.length > 0) {
              // Resolver Tenant por Phone Number ID
              let tenantId: string | null = null
              if (phoneNumberId) {
                const { data: allTenants } = await supabase
                  .from('tenants')
                  .select('id, config')
                
                const matchedTenant = allTenants?.find((t: any) => 
                  String(t.config?.whatsapp?.meta_phone_number_id || '').trim() === String(phoneNumberId).trim()
                )
                if (matchedTenant) {
                  tenantId = matchedTenant.id
                }
              }

              // Fallback: si no coincide el phone_number_id, buscar si hay algún tenant con meta_cloud
              if (!tenantId) {
                const { data: fallbackTenants } = await supabase
                  .from('tenants')
                  .select('id, config')
                const fallback = fallbackTenants?.find((t: any) => t.config?.whatsapp?.provider === 'meta_cloud')
                if (fallback) tenantId = fallback.id
              }

              if (!tenantId) {
                console.warn('[Meta Webhook] No tenant found for phone_number_id:', phoneNumberId)
                continue
              }

              const contacts = value.contacts || []

              for (const msg of value.messages) {
                const wamid = msg.id
                if (!wamid) continue

                // Evitar duplicados
                const { data: existing } = await supabase
                  .from('messages')
                  .select('id')
                  .eq('wamid', wamid)
                  .maybeSingle()

                if (existing) {
                  console.log('[Meta Webhook] Mensaje duplicado ignorado:', wamid)
                  continue
                }

                const fromRaw = String(msg.from || '').replace(/\D/g, '')
                const contactObj = contacts.find((c: any) => String(c.wa_id || '').replace(/\D/g, '') === fromRaw)
                const pushName = contactObj?.profile?.name || fromRaw

                let content = ''
                const msgType = msg.type || 'text'
                if (msgType === 'text') {
                  content = msg.text?.body || ''
                } else if (msgType === 'image') {
                  const caption = msg.image?.caption ? `\n${msg.image.caption}` : ''
                  let storedUrl = ''
                  const mediaId = msg.image?.id
                  if (mediaId) {
                    try {
                      const { data: gCfg } = await supabase.from('global_config').select('bank_details').eq('id', 1).maybeSingle()
                      const neuroApiKey = gCfg?.bank_details?.neuroapi_master_api_key || Deno.env.get('NEUROAPI_MASTER_KEY')
                      if (neuroApiKey) {
                        const mRes = await fetch(`https://api.neurochat.com.ec/api/v1/neuroapi/messaging/media/${mediaId}`, {
                          headers: { 'x-api-key': neuroApiKey }
                        })
                        if (mRes.ok) {
                          const buf = await mRes.arrayBuffer()
                          const filePath = `conversations/inbound_${mediaId}.jpg`
                          const { error: upErr } = await supabase.storage.from('catalogo').upload(filePath, new Uint8Array(buf), {
                            contentType: mRes.headers.get('content-type') || 'image/jpeg',
                            upsert: true
                          })
                          if (!upErr) {
                            const { data: pubData } = supabase.storage.from('catalogo').getPublicUrl(filePath)
                            if (pubData?.publicUrl) storedUrl = pubData.publicUrl
                          }
                        }
                      }
                    } catch (e) {
                      console.warn('[Meta Webhook] Error cacheando imagen en storage:', e)
                    }
                  }
                  content = storedUrl ? `[image] ${storedUrl}|imagen.jpg${caption}` : `[image] (imagen de WhatsApp)${caption}`
                } else if (msgType === 'audio') {
                  let storedUrl = ''
                  const mediaId = msg.audio?.id
                  if (mediaId) {
                    try {
                      const { data: gCfg } = await supabase.from('global_config').select('bank_details').eq('id', 1).maybeSingle()
                      const neuroApiKey = gCfg?.bank_details?.neuroapi_master_api_key || Deno.env.get('NEUROAPI_MASTER_KEY')
                      if (neuroApiKey) {
                        const mRes = await fetch(`https://api.neurochat.com.ec/api/v1/neuroapi/messaging/media/${mediaId}`, {
                          headers: { 'x-api-key': neuroApiKey }
                        })
                        if (mRes.ok) {
                          const buf = await mRes.arrayBuffer()
                          const filePath = `conversations/inbound_${mediaId}.ogg`
                          const { error: upErr } = await supabase.storage.from('catalogo').upload(filePath, new Uint8Array(buf), {
                            contentType: mRes.headers.get('content-type') || 'audio/ogg',
                            upsert: true
                          })
                          if (!upErr) {
                            const { data: pubData } = supabase.storage.from('catalogo').getPublicUrl(filePath)
                            if (pubData?.publicUrl) storedUrl = pubData.publicUrl
                          }
                        }
                      }
                    } catch (e) {
                      console.warn('[Meta Webhook] Error cacheando audio en storage:', e)
                    }
                  }
                  content = storedUrl ? `[audio] ${storedUrl}|audio.ogg` : `[audio] (nota de voz)`
                } else if (msgType === 'document') {
                  const filename = msg.document?.filename || 'documento.pdf'
                  const caption = msg.document?.caption ? `\n${msg.document.caption}` : ''
                  let storedUrl = ''
                  const mediaId = msg.document?.id
                  if (mediaId) {
                    try {
                      const { data: gCfg } = await supabase.from('global_config').select('bank_details').eq('id', 1).maybeSingle()
                      const neuroApiKey = gCfg?.bank_details?.neuroapi_master_api_key || Deno.env.get('NEUROAPI_MASTER_KEY')
                      if (neuroApiKey) {
                        const mRes = await fetch(`https://api.neurochat.com.ec/api/v1/neuroapi/messaging/media/${mediaId}`, {
                          headers: { 'x-api-key': neuroApiKey }
                        })
                        if (mRes.ok) {
                          const buf = await mRes.arrayBuffer()
                          const ext = filename.split('.').pop() || 'pdf'
                          const filePath = `conversations/inbound_${mediaId}.${ext}`
                          const { error: upErr } = await supabase.storage.from('catalogo').upload(filePath, new Uint8Array(buf), {
                            contentType: mRes.headers.get('content-type') || 'application/pdf',
                            upsert: true
                          })
                          if (!upErr) {
                            const { data: pubData } = supabase.storage.from('catalogo').getPublicUrl(filePath)
                            if (pubData?.publicUrl) storedUrl = pubData.publicUrl
                          }
                        }
                      }
                    } catch (e) {
                      console.warn('[Meta Webhook] Error cacheando documento en storage:', e)
                    }
                  }
                  content = storedUrl ? `[document] ${storedUrl}|${filename}${caption}` : `[document] |${filename}${caption}`
                } else if (msgType === 'video') {
                  const caption = msg.video?.caption ? `\n${msg.video.caption}` : ''
                  let storedUrl = ''
                  const mediaId = msg.video?.id
                  if (mediaId) {
                    try {
                      const { data: gCfg } = await supabase.from('global_config').select('bank_details').eq('id', 1).maybeSingle()
                      const neuroApiKey = gCfg?.bank_details?.neuroapi_master_api_key || Deno.env.get('NEUROAPI_MASTER_KEY')
                      if (neuroApiKey) {
                        const mRes = await fetch(`https://api.neurochat.com.ec/api/v1/neuroapi/messaging/media/${mediaId}`, {
                          headers: { 'x-api-key': neuroApiKey }
                        })
                        if (mRes.ok) {
                          const buf = await mRes.arrayBuffer()
                          const filePath = `conversations/inbound_${mediaId}.mp4`
                          const { error: upErr } = await supabase.storage.from('catalogo').upload(filePath, new Uint8Array(buf), {
                            contentType: mRes.headers.get('content-type') || 'video/mp4',
                            upsert: true
                          })
                          if (!upErr) {
                            const { data: pubData } = supabase.storage.from('catalogo').getPublicUrl(filePath)
                            if (pubData?.publicUrl) storedUrl = pubData.publicUrl
                          }
                        }
                      }
                    } catch (e) {
                      console.warn('[Meta Webhook] Error cacheando video en storage:', e)
                    }
                  }
                  content = storedUrl ? `[video] ${storedUrl}|video.mp4${caption}` : `[video] (video de WhatsApp)${caption}`
                } else {
                  content = msg.text?.body || 'Mensaje recibido'
                }

                if (!content.trim()) continue

                // 1. Buscar o crear la conversación
                let conversation: any = null
                const { data: convs } = await supabase
                  .from('conversations')
                  .select('id, unread')
                  .eq('tenant_id', tenantId)
                  .eq('phone', fromRaw)
                  .order('time', { ascending: false })
                  .limit(1)

                if (convs && convs.length > 0) {
                  conversation = convs[0]
                } else {
                  const { data: newConv, error: convErr } = await supabase
                    .from('conversations')
                    .insert({
                      tenant_id: tenantId,
                      name: pushName,
                      phone: fromRaw,
                      status: 'activa',
                      agent: 'humano',
                      unread: 0,
                      last_msg: content.substring(0, 100),
                      time: new Date().toISOString(),
                    })
                    .select()
                    .single()

                  if (!convErr && newConv) {
                    conversation = newConv
                  }
                }

                if (!conversation) {
                  console.error('[Meta Webhook] No se pudo resolver la conversación para:', fromRaw)
                  continue
                }

                // 2. Insertar mensaje (esto dispara Realtime y sonido en /conversations)
                const { error: msgErr } = await supabase
                  .from('messages')
                  .insert({
                    tenant_id: tenantId,
                    conversation_id: conversation.id,
                    role: 'user',
                    content: content,
                    time: new Date().toISOString(),
                    wamid: wamid,
                    payload: msg,
                    status: 'delivered',
                  })

                if (msgErr) {
                  console.error('[Meta Webhook] Error al insertar mensaje:', msgErr)
                  continue
                }

                // 3. Actualizar conversación (último mensaje y no leídos)
                await supabase
                  .from('conversations')
                  .update({
                    last_msg: content.substring(0, 100),
                    time: new Date().toISOString(),
                    unread: (conversation.unread || 0) + 1,
                    status: 'activa',
                  })
                  .eq('id', conversation.id)
              }
            }
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (webhookErr: any) {
        console.error('[Meta Webhook Error]:', webhookErr)
        return new Response(JSON.stringify({ ok: true, error: webhookErr.message }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 1. PROBAR CONEXIÓN / ESTADO DEL NÚMERO
    if (action === 'test_connection') {
      const phoneNumberId = body.phone_number_id || url.searchParams.get('phone_number_id')
      const accessToken = body.access_token || url.searchParams.get('access_token')

      if (!phoneNumberId || !accessToken) {
        return new Response(JSON.stringify({ ok: false, error: 'Faltan credenciales (phone_number_id o access_token)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const metaRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status,status`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const metaData = await metaRes.json().catch(() => ({}))
      if (!metaRes.ok) {
        return new Response(JSON.stringify({
          ok: false,
          error: metaData.error?.message || `Error HTTP ${metaRes.status}`,
          details: metaData,
        }), {
          status: metaRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        ok: true,
        phone: metaData.display_phone_number || '',
        verified_name: metaData.verified_name || '',
        quality_rating: metaData.quality_rating || 'GREEN',
        status: metaData.status || 'CONNECTED',
        data: metaData,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. ENVIAR MENSAJE DE TEXTO O MULTIMEDIA
    if (action === 'send_message') {
      const { phone_number_id, access_token, to, text, mediaUrl, mediaType, caption, fileName } = body

      if (!phone_number_id || !access_token) {
        return new Response(JSON.stringify({ ok: false, error: 'Faltan credenciales de Meta Cloud' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!to || (!text && !mediaUrl)) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta destinatario o contenido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const cleanNumber = String(to).replace(/\D/g, '')

      let payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanNumber,
      }

      if (mediaUrl) {
        let type = 'image'
        if (mediaType === 'document' || mediaType === 'pdf') {
          type = 'document'
        } else if (mediaType === 'audio') {
          type = 'audio'
        } else if (mediaType === 'video') {
          type = 'video'
        }

        payload.type = type
        const mediaObj: Record<string, unknown> = { link: mediaUrl }
        if (caption && type !== 'audio') mediaObj.caption = caption
        if (fileName && type === 'document') mediaObj.filename = fileName
        payload[type] = mediaObj
      } else {
        payload.type = 'text'
        payload.text = {
          preview_url: false,
          body: text,
        }
      }

      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${phone_number_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const metaData = await metaRes.json().catch(() => ({}))
      if (!metaRes.ok) {
        return new Response(JSON.stringify({
          ok: false,
          error: metaData.error?.message || `Error HTTP ${metaRes.status}`,
          code: metaData.error?.code,
          details: metaData,
        }), {
          status: metaRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        ok: true,
        messageId: metaData.messages?.[0]?.id || '',
        data: metaData,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. INTERCAMBIO DE CÓDIGO OAUTH (EMBEDDED SIGNUP)
    if (action === 'exchange_code') {
      const { code, app_id, app_secret, phone_number_id: inputPhoneId, waba_id: inputWabaId } = body
      if (!code || !app_id || !app_secret) {
        return new Response(JSON.stringify({ ok: false, error: 'Faltan parámetros de intercambio (code, app_id, app_secret)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log(`[Meta Proxy] Exchanging code for app_id: ${app_id}`)

      const candidateUris = [
        body.redirect_uri !== undefined ? body.redirect_uri : '',
        '',
        'http://localhost:8080',
        'http://localhost:8080/',
        'https://klynn.com.do',
        'https://app.klynn.com.do',
      ]

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      let tokenRes: any, tokenData: any
      try {
        for (const uri of candidateUris) {
          const uriParam = uri !== '' ? `&redirect_uri=${encodeURIComponent(uri)}` : `&redirect_uri=`
          const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${app_id}&client_secret=${app_secret}&code=${code}${uriParam}`
          
          tokenRes = await fetch(tokenUrl, { method: 'GET', signal: controller.signal })
          tokenData = await tokenRes.json().catch(() => ({}))

          if (tokenRes.ok && tokenData.access_token) {
            console.log(`[Meta Proxy] Successfully exchanged code with redirect_uri: "${uri}"`)
            break
          }

          // Si el error no es de redirect_uri, no tiene sentido reintentar con otras URIs
          if (!tokenData.error?.message?.includes('redirect_uri')) {
            break
          }
        }
      } catch (err: any) {
        return new Response(JSON.stringify({
          ok: false,
          error: err.name === 'AbortError' ? 'Tiempo de espera agotado al conectar con Meta (15s)' : (err.message || 'Error al conectar con Meta'),
        }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (!tokenRes.ok || !tokenData.access_token) {
        return new Response(JSON.stringify({
          ok: false,
          error: tokenData.error?.message || 'Error al intercambiar código con Meta',
          details: tokenData,
        }), {
          status: tokenRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const accessToken = tokenData.access_token
      let phoneId = inputPhoneId || ''
      let wabaId = inputWabaId || ''
      let displayPhone = ''
      let verifiedName = ''

      // Si no se proporcionó waba_id, intentamos descubrirlo a través de debug_token
      if (!wabaId) {
        try {
          const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${app_id}|${app_secret}`
          const debugRes = await fetch(debugUrl, { method: 'GET' })
          const debugData = await debugRes.json().catch(() => ({}))
          
          const granularScopes = debugData?.data?.granular_scopes || []
          const waScope = granularScopes.find((s: any) => s.scope === 'whatsapp_business_management')
          if (waScope && waScope.target_ids && waScope.target_ids.length > 0) {
            wabaId = waScope.target_ids[0]
          }
        } catch (e) {
          console.warn('[Meta Proxy] Could not inspect token for WABA ID:', e)
        }
      }

      // Si tenemos WABA ID pero no phoneId, consultamos los teléfonos de la WABA
      if (wabaId && !phoneId) {
        try {
          const phonesUrl = `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${accessToken}`
          const phonesRes = await fetch(phonesUrl, { method: 'GET' })
          const phonesData = await phonesRes.json().catch(() => ({}))
          if (phonesData?.data && phonesData.data.length > 0) {
            phoneId = phonesData.data[0].id
            displayPhone = phonesData.data[0].display_phone_number || ''
            verifiedName = phonesData.data[0].verified_name || ''
          }
        } catch (e) {
          console.warn('[Meta Proxy] Could not fetch phone numbers for WABA:', e)
        }
      }

      // Si tenemos phoneId pero aún no displayPhone o verifiedName, consultamos el número
      if (phoneId && !displayPhone) {
        try {
          const phoneRes = await fetch(
            `https://graph.facebook.com/v21.0/${phoneId}?fields=id,verified_name,display_phone_number,quality_rating,status`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          )
          const phoneData = await phoneRes.json().catch(() => ({}))
          if (phoneRes.ok) {
            displayPhone = phoneData.display_phone_number || ''
            verifiedName = phoneData.verified_name || ''
          }
        } catch (e) {
          console.warn('[Meta Proxy] Could not fetch phone details:', e)
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        access_token: accessToken,
        phone_number_id: phoneId,
        waba_id: wabaId,
        phone: displayPhone,
        verified_name: verifiedName,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: false, error: 'Acción no reconocida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Meta Cloud Proxy error:', error)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
