import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Media type mapping for WaSender message objects
const MEDIA_KEYS: Record<string, string> = {
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio',
    documentMessage: 'document',
    stickerMessage: 'image',
};

/**
 * Detects media in a WaSender message object.
 * Returns { type, mediaInfo } or null if no media found.
 */
function findMedia(messageObj: any): { type: string; mediaInfo: any } | null {
    if (!messageObj) return null;
    for (const [key, type] of Object.entries(MEDIA_KEYS)) {
        if (messageObj[key]) {
            return { type, mediaInfo: messageObj[key] };
        }
    }
    return null;
}

function unwrapMessageData(data: any): any {
    if (Array.isArray(data)) return data[0] || null;

    const messages = data?.messages;
    if (messages) return Array.isArray(messages) ? messages[0] : messages;

    if (data?.data?.key || data?.data?.message) return data.data;
    return data || null;
}

function isTruthyFlag(value: unknown): boolean {
    return value === true || value === 1 || String(value).toLowerCase() === 'true';
}

function isOutgoingMessage(body: any, messageData: any, key: any): boolean {
    return [
        key?.fromMe,
        messageData?.fromMe,
        messageData?.data?.key?.fromMe,
        body?.fromMe,
        body?.data?.fromMe,
        body?.data?.key?.fromMe,
    ].some(isTruthyFlag);
}

/**
 * Calls WaSender's decrypt-media endpoint to get a temporary public URL (1 hour).
 * Must send the original message structure as documented by WaSender.
 */
async function decryptMedia(
    apiKey: string,
    messageKey: any,
    rawMessage: any,
    baseUrl: string
): Promise<string | null> {
    try {
        const base = baseUrl.replace(/\/$/, '') || 'https://wasenderapi.com';
        
        // WaSender expects the full original message structure
        const payload = {
            data: {
                messages: {
                    key: { id: messageKey.id },
                    message: rawMessage
                }
            }
        };

        console.log('decrypt-media request:', JSON.stringify(payload).substring(0, 500));

        const res = await fetch(`${base}/api/decrypt-media`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseText = await res.text();
        console.log('decrypt-media response:', res.status, responseText.substring(0, 500));

        if (!res.ok) {
            console.error('decrypt-media failed:', res.status, responseText);
            return null;
        }

        const data = JSON.parse(responseText);
        return data.publicUrl || data.data?.publicUrl || null;
    } catch (err) {
        console.error('decrypt-media error:', err);
        return null;
    }
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)

    // Webhook Verification (GET)
    if (req.method === 'GET') {
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')

        if (mode && token) {
            if (mode === 'subscribe') {
                console.log('Webhook verified successfully')
                return new Response(challenge, { status: 200 })
            }
        }
        return new Response('Verification failed', { status: 403 })
    }

    // Handle Incoming Events (POST)
    if (req.method === 'POST') {
        try {
            const body = await req.json()
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            // RAW LOGGING for audit/webhook_logs if table exists
            try {
                await supabase.from('webhook_logs').insert({
                    payload: body,
                    headers: Object.fromEntries(req.headers.entries())
                })
            } catch (e) {
                // Ignore if webhook_logs table does not exist
                console.log("Could not write raw webhook log", e)
            }

            // Detect provider format
            const isWasender = body.event === 'messages.received' && body.data;
            const isEvolution = (body.event === 'messages.upsert' || body.event === 'MESSAGES_UPSERT') && body.data;

            if (isWasender || isEvolution) {
                console.log(`WhatsApp event received (${isEvolution ? 'Evolution' : 'WASender'}):`, body.event);

                let messageData: any = null;
                let key: any = null;
                let from = '';
                let wamid = '';
                let pushName = '';
                let rawMessageObj: any = {};
                let tenantId = url.searchParams.get('tenant_id') || '';

                if (isWasender) {
                    const rawMessages = body.data?.messages;
                    if (!rawMessages) return new Response('No message data', { status: 200 });
                    messageData = unwrapMessageData(body.data);
                    if (!messageData) return new Response('No message data', { status: 200 });
                    key = messageData.key;
                    if (isOutgoingMessage(body, messageData, key)) {
                        return new Response('Ignore outgoing message', { status: 200 });
                    }

                    from = key?.cleanedSenderPn || key?.remoteJid?.split('@')[0];
                    wamid = key?.id;
                    pushName = messageData.pushName || body.data?.pushName || from;
                    rawMessageObj = messageData.message || {};
                } else if (isEvolution) {
                    messageData = unwrapMessageData(body.data);
                    if (!messageData) return new Response('No message data', { status: 200 });
                    key = messageData.key || messageData.data?.key;
                    if (isOutgoingMessage(body, messageData, key)) {
                        return new Response('Ignore outgoing message', { status: 200 });
                    }

                    pushName = messageData.pushName || body.pushName || '';
                    let rawSender = key?.remoteJid || '';

                    // Klynn only stores direct customer chats. Statuses, newsletters,
                    // broadcasts and groups must never create conversations or alerts.
                    if (
                        !rawSender ||
                        rawSender === 'status@broadcast' ||
                        rawSender.endsWith('@g.us') ||
                        rawSender.includes('@newsletter') ||
                        rawSender.endsWith('@broadcast')
                    ) {
                        return new Response('Ignore non-customer event', { status: 200 });
                    }
                    
                    // Si remoteJid es un LID (@lid), buscar el JID real (@s.whatsapp.net)
                    if (rawSender.endsWith('@lid')) {
                        const alt = key?.remoteJidAlt || messageData?.remoteJidAlt || key?.participant || key?.cleanedSenderPn;
                        if (alt && !alt.endsWith('@lid')) {
                            rawSender = alt;
                        } else if (body.instance) {
                            try {
                                const evoUrl = Deno.env.get('KLYNN_CONNECT_URL') || 'https://wa.klynn.com.do';
                                const evoKey = Deno.env.get('KLYNN_CONNECT_APIKEY') || 'klynn_evolution_secret_key_2026';
                                const contRes = await fetch(`${evoUrl}/chat/findContacts/${body.instance}`, {
                                    method: 'POST',
                                    headers: { 'apikey': evoKey, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({})
                                });
                                const contData = await contRes.json().catch(() => []);
                                if (Array.isArray(contData)) {
                                    // Buscar contacto por pushName o coincidencia
                                    const match = contData.find((c: any) => 
                                        c.remoteJid && 
                                        c.remoteJid.endsWith('@s.whatsapp.net') && 
                                        pushName && 
                                        (c.pushName === pushName || c.name === pushName)
                                    );
                                    if (match?.remoteJid) {
                                        rawSender = match.remoteJid;
                                    }
                                }
                            } catch (e) {
                                console.error("Error resolviendo LID en Evolution:", e);
                            }
                        }
                    }

                    from = rawSender.split('@')[0].split(':')[0].replace(/\D/g, '');
                    wamid = key?.id;
                    if (!pushName) pushName = from;
                    rawMessageObj = messageData.message || {};

                    // Si no viene tenant_id en query params, resolver por nombre de instancia
                    if (!tenantId && body.instance) {
                        const rawSlug = String(body.instance).replace(/^klynn_/, '');
                        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSlug);
                        let matchedTenant: any = null;
                        if (isUuid) {
                            const { data } = await supabase.from('tenants').select('id').eq('id', rawSlug).maybeSingle();
                            matchedTenant = data;
                        } else {
                            const { data } = await supabase.from('tenants').select('id').eq('slug', rawSlug).maybeSingle();
                            matchedTenant = data;
                        }
                        if (matchedTenant?.id) {
                            tenantId = matchedTenant.id;
                        }
                    }

                    // Intentar vincular con cliente o conversación previa si el número es un identificador LID
                    if (tenantId && (rawSender.endsWith('@lid') || from.length > 12)) {
                        // 1. Buscar en conversaciones activas previas por nombre
                        if (pushName) {
                            const { data: existConv } = await supabase
                                .from('conversations')
                                .select('phone')
                                .eq('tenant_id', tenantId)
                                .eq('name', pushName)
                                .limit(1)
                                .maybeSingle();
                            if (existConv?.phone && existConv.phone.length <= 11) {
                                from = existConv.phone;
                            }
                        }
                        
                        // 2. Buscar en tabla de clientes
                        if (from.length > 12 && pushName) {
                            const { data: matchedClient } = await supabase
                                .from('clientes')
                                .select('telefono')
                                .eq('tenant_id', tenantId)
                                .ilike('nombre', `%${pushName}%`)
                                .limit(1)
                                .maybeSingle();
                            if (matchedClient?.telefono) {
                                const cleanCliPhone = matchedClient.telefono.replace(/\D/g, '');
                                if (cleanCliPhone) {
                                    from = cleanCliPhone.length === 10 ? `1${cleanCliPhone}` : cleanCliPhone;
                                }
                            }
                        }
                    }
                }

                if (!/^\d{7,15}$/.test(from)) {
                    console.log('[whatsapp-webhook] Event ignored: invalid or missing customer phone');
                    return new Response('Invalid customer phone. Event ignored.', { status: 200 });
                }

                if (!tenantId) {
                    console.error('No tenant_id resolved for webhook');
                    return new Response('No tenant_id resolved', { status: 200 });
                }

                // 🛑 VALIDACIÓN DE SEGURIDAD ESTRICTA:
                // Solo procesar e insertar mensajes si la lavandería tiene su WhatsApp activado y CONECTADO
                const { data: tenantRecord } = await supabase
                    .from('tenants')
                    .select('config')
                    .eq('id', tenantId)
                    .maybeSingle();

                const wa = tenantRecord?.config?.whatsapp;
                const { data: globalConfig } = await supabase
                    .from('global_config')
                    .select('bank_details')
                    .eq('id', 1)
                    .maybeSingle();
                const activeProvider = globalConfig?.bank_details?.whatsapp_engine || 'klynn_connect';
                const incomingProvider = isWasender ? 'wasender' : 'klynn_connect';

                // Solo el proveedor seleccionado en /admin puede alimentar la bandeja.
                // Esto evita que dos webhooks activos inserten el mismo mensaje.
                if (incomingProvider !== activeProvider) {
                    console.log(`[whatsapp-webhook] Evento de ${incomingProvider} ignorado; proveedor activo: ${activeProvider}`);
                    return new Response('Inactive WhatsApp provider ignored.', { status: 200 });
                }

                const isKlynnConnectOpen = Boolean(wa?.enabled && wa?.klynn_connect_status === 'open');
                const isWasenderConnected = Boolean(wa?.enabled && wa?.is_connected);
                const isActiveProviderConnected = activeProvider === 'klynn_connect'
                    ? isKlynnConnectOpen
                    : isWasenderConnected;

                if (!isActiveProviderConnected) {
                    console.log(`[whatsapp-webhook] Lavandería ${tenantId} tiene WhatsApp DESCONECTADO. Mensaje entrante descartado.`);
                    return new Response('WhatsApp desconectado para este negocio. Mensaje ignorado.', { status: 200 });
                }

                // --- DEDUPLICATION: skip if wamid already exists ---
                if (wamid) {
                    const { data: existing } = await supabase
                        .from('messages')
                        .select('id')
                        .eq('wamid', wamid)
                        .limit(1);
                    if (existing && existing.length > 0) {
                        console.log('Duplicate wamid, skipping:', wamid);
                        return new Response('Duplicate message', { status: 200 });
                    }
                }

                // --- QUOTED MESSAGE / REPLY DETECTION ---
                const quotedWamid = 
                    rawMessageObj.extendedTextMessage?.contextInfo?.stanzaId || 
                    rawMessageObj.imageMessage?.contextInfo?.stanzaId || 
                    rawMessageObj.videoMessage?.contextInfo?.stanzaId || 
                    rawMessageObj.documentMessage?.contextInfo?.stanzaId || 
                    rawMessageObj.audioMessage?.contextInfo?.stanzaId || 
                    rawMessageObj.locationMessage?.contextInfo?.stanzaId;

                let replyToId: string | null = null;
                if (quotedWamid) {
                    const { data: quotedMsg } = await supabase
                        .from('messages')
                        .select('id')
                        .eq('wamid', quotedWamid)
                        .limit(1);
                    if (quotedMsg && quotedMsg.length > 0) {
                        replyToId = quotedMsg[0].id;
                    }
                }

                // --- CONTENT EXTRACTION & MEDIA DETECTION ---
                const media = findMedia(rawMessageObj);
                let content = '';

                if (media) {
                    let mediaUrl: string | null = null;

                    if (isEvolution) {
                        let rawB64 = body.data?.base64 || 
                                     body.data?.message?.base64 || 
                                     messageData?.base64 || 
                                     rawMessageObj?.base64 || 
                                     media.mediaInfo?.base64;

                        // Si no viene en el webhook, obtenerlo directamente de Evolution API
                        if (!rawB64 && body.instance) {
                            try {
                                const evoRes = await fetch(`https://wa.klynn.com.do/chat/getBase64FromMediaMessage/${body.instance}`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'apikey': 'klynn_evolution_secret_key_2026',
                                    },
                                    body: JSON.stringify({
                                        message: messageData,
                                        convertToMp4: false,
                                    }),
                                });
                                if (evoRes.ok) {
                                    const evoData = await evoRes.json();
                                    if (evoData.base64) {
                                        rawB64 = evoData.base64;
                                        if (evoData.mimetype) media.mediaInfo.mimetype = evoData.mimetype;
                                        if (evoData.fileName) media.mediaInfo.fileName = evoData.fileName;
                                    }
                                }
                            } catch (err) {
                                console.error('Error fetching base64 from Evolution:', err);
                            }
                        }

                        mediaUrl = `https://api.klynn.com.do/functions/v1/klynn-connect-proxy?action=media&wamid=${wamid}`;
                    } else if (isWasender) {
                        try {
                            const { data: tenantData } = await supabase
                                .from('tenants')
                                .select('config')
                                .eq('id', tenantId)
                                .single();

                            const waConfig = tenantData?.config?.whatsapp;
                            if (waConfig?.api_key) {
                                mediaUrl = await decryptMedia(
                                    waConfig.api_key,
                                    key,
                                    rawMessageObj,
                                    waConfig.base_url || 'https://wasenderapi.com'
                                );
                            }
                        } catch (e) {
                            console.error('Error fetching tenant config for media decrypt:', e);
                        }
                    }

                    const caption = messageData.messageBody || media.mediaInfo?.caption || rawMessageObj.imageMessage?.caption || '';

                    if (mediaUrl) {
                        let filenameSuffix = '';
                        if (media.type === 'document') {
                            const filename = media.mediaInfo.title || media.mediaInfo.filename || media.mediaInfo.fileName || 'document.pdf';
                            filenameSuffix = `|${filename}`;
                        } else if (media.type === 'image') {
                            const filename = media.mediaInfo.title || media.mediaInfo.filename || media.mediaInfo.fileName || 'imagen.png';
                            filenameSuffix = `|${filename}`;
                        }
                        content = `[${media.type}] ${mediaUrl}${filenameSuffix}`;
                        if (caption) content += `\n${caption}`;
                    } else {
                        content = caption || `📎 ${media.type === 'image' ? '📷 Imagen' : media.type === 'video' ? '🎥 Video' : media.type === 'audio' ? '🎤 Audio' : '📄 Documento'} recibido`;
                    }
                } else {
                    content = messageData.messageBody || 
                              rawMessageObj.conversation || 
                              rawMessageObj.extendedTextMessage?.text || 
                              '';
                }

                if (!content.trim()) {
                    console.log('[whatsapp-webhook] Event ignored: no supported customer content');
                    return new Response('Empty or unsupported message. Event ignored.', { status: 200 });
                }

                // 1. Resolve or create Conversation
                const { data: convs, error: selectErr } = await supabase
                    .from('conversations')
                    .select('id, unread')
                    .eq('tenant_id', tenantId)
                    .eq('phone', from)
                    .order('time', { ascending: false });

                if (selectErr) {
                    console.error('Error selecting conversation:', selectErr);
                }

                let conversation = convs && convs.length > 0 ? convs[0] : null;

                const lastMsgPreview = media 
                    ? `📎 ${media.type === 'image' ? '📷 Imagen' : media.type === 'video' ? '🎥 Video' : media.type === 'audio' ? '🎤 Audio' : '📄 Documento'}`
                    : content.substring(0, 100);

                if (!conversation) {
                    const { data: newConv, error: insertErr } = await supabase
                        .from('conversations')
                        .insert({
                            tenant_id: tenantId,
                            name: pushName,
                            phone: from,
                            status: 'activa',
                            agent: 'humano',
                            unread: 0,
                            last_msg: lastMsgPreview,
                            time: new Date().toISOString()
                        })
                        .select()
                        .single();
                    
                    if (insertErr) {
                        if (insertErr.code === '23505') {
                            const { data: existingConversation } = await supabase
                                .from('conversations')
                                .select('id, unread')
                                .eq('tenant_id', tenantId)
                                .eq('phone', from)
                                .maybeSingle();
                            conversation = existingConversation;
                        } else {
                            console.error('Error inserting conversation:', insertErr);
                            throw insertErr;
                        }
                    } else {
                        conversation = newConv;
                    }
                }

                if (!conversation) throw new Error('Failed to resolve conversation');

                // 2. Insert Message into database
                const { error: msgInsertErr } = await supabase.from('messages').insert({
                    tenant_id: tenantId,
                    conversation_id: conversation.id,
                    role: 'user',
                    content: content,
                    time: new Date().toISOString(),
                    wamid: wamid,
                    payload: body,
                    status: 'delivered',
                    reply_to_id: replyToId
                });

                if (msgInsertErr) {
                    if (msgInsertErr.code === '23505') {
                        console.log('Duplicate message rejected by unique index:', wamid);
                        return new Response('Duplicate message', { status: 200 });
                    }
                    console.error('Error inserting message:', msgInsertErr);
                    throw msgInsertErr;
                }

                // 3. Update Conversation details
                const { error: convUpdateErr } = await supabase.from('conversations').update({
                    last_msg: lastMsgPreview,
                    time: new Date().toISOString(),
                    unread: (conversation.unread || 0) + 1,
                    status: 'activa'
                }).eq('id', conversation.id);

                if (convUpdateErr) {
                    console.error('Error updating conversation:', convUpdateErr);
                    throw convUpdateErr;
                }

                return new Response('ok', { status: 200 });
            }

            return new Response('Event ignored', { status: 200 })
        } catch (error: any) {
            console.error('Webhook processing error:', error)
            return new Response(JSON.stringify({ error: error.message }), { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
            })
        }
    }

    return new Response('Not allowed', { status: 405 })
})
