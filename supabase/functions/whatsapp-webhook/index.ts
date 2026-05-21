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

            // Detect WASender API Event
            const isWasender = body.event && body.data;
            
            if (isWasender) {
                console.log('WaSender event received:', body.event);
                
                if (body.event === 'messages.received') {
                    const rawMessages = body.data?.messages;
                    if (!rawMessages) return new Response('No message data', { status: 200 });

                    // Handle array or single message object format
                    const messageData = Array.isArray(rawMessages) ? rawMessages[0] : rawMessages;
                    if (!messageData) return new Response('No message data', { status: 200 });

                    const key = messageData.key;
                    if (key?.fromMe) {
                        return new Response('Ignore outgoing message', { status: 200 });
                    }

                    // Extract cleaned telephone number and ID
                    const from = key?.cleanedSenderPn || key?.remoteJid?.split('@')[0];
                    const wamid = key?.id;
                    const pushName = messageData.pushName || body.data?.pushName || from;

                    // Resolve tenant ID from query parameter
                    const tenantId = url.searchParams.get('tenant_id');
                    if (!tenantId) {
                        console.error('No tenant_id provided in webhook URL');
                        return new Response('No tenant_id provided', { status: 200 });
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
                        messageData.message?.extendedTextMessage?.contextInfo?.stanzaId || 
                        messageData.message?.imageMessage?.contextInfo?.stanzaId || 
                        messageData.message?.videoMessage?.contextInfo?.stanzaId || 
                        messageData.message?.documentMessage?.contextInfo?.stanzaId || 
                        messageData.message?.audioMessage?.contextInfo?.stanzaId || 
                        messageData.message?.locationMessage?.contextInfo?.stanzaId;

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

                    // --- MEDIA DETECTION ---
                    const rawMessageObj = messageData.message || {};
                    const media = findMedia(rawMessageObj);
                    let content: string;

                    if (media) {
                        // Try to get the tenant's WaSender API key for decrypt-media
                        let decryptedUrl: string | null = null;
                        try {
                            const { data: tenantData } = await supabase
                                .from('tenants')
                                .select('config')
                                .eq('id', tenantId)
                                .single();

                            const waConfig = tenantData?.config?.whatsapp;
                            if (waConfig?.api_key) {
                                decryptedUrl = await decryptMedia(
                                    waConfig.api_key,
                                    key,
                                    rawMessageObj,
                                    waConfig.base_url || 'https://wasenderapi.com'
                                );
                            }
                        } catch (e) {
                            console.error('Error fetching tenant config for media decrypt:', e);
                        }

                        const caption = messageData.messageBody || media.mediaInfo.caption || '';

                        if (decryptedUrl) {
                            // Store as [type] url|filename format for UI rendering
                            let filenameSuffix = '';
                            if (media.type === 'document') {
                                const filename = media.mediaInfo.title || media.mediaInfo.filename || media.mediaInfo.fileName || 'document.pdf';
                                filenameSuffix = `|${filename}`;
                            } else if (media.type === 'image') {
                                const filename = media.mediaInfo.title || media.mediaInfo.filename || media.mediaInfo.fileName || 'imagen.png';
                                filenameSuffix = `|${filename}`;
                            }
                            content = `[${media.type}] ${decryptedUrl}${filenameSuffix}`;
                            if (caption) content += `\n${caption}`;
                        } else {
                            // Fallback: couldn't decrypt, store type indicator
                            content = caption || `📎 ${media.type === 'image' ? '📷 Imagen' : media.type === 'video' ? '🎥 Video' : media.type === 'audio' ? '🎤 Audio' : '📄 Documento'} recibido`;
                        }
                    } else {
                        // Plain text message
                        content = messageData.messageBody || messageData.message?.conversation || '(mensaje vacío)';
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

                    // Short display text for conversation list (no URL)
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
                            .single()
                        
                        if (insertErr) {
                            console.error('Error inserting conversation:', insertErr);
                            throw insertErr;
                        }
                        conversation = newConv;
                    }

                    if (!conversation) throw new Error('Failed to resolve conversation')

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
                    })

                    if (msgInsertErr) {
                        console.error('Error inserting message:', msgInsertErr);
                        throw msgInsertErr;
                    }

                    // 3. Update Conversation details
                    const { error: convUpdateErr } = await supabase.from('conversations').update({
                        last_msg: lastMsgPreview,
                        time: new Date().toISOString(),
                        unread: (conversation.unread || 0) + 1,
                        status: 'activa'
                    }).eq('id', conversation.id)

                    if (convUpdateErr) {
                        console.error('Error updating conversation:', convUpdateErr);
                        throw convUpdateErr;
                    }
                }
                
                return new Response('ok', { status: 200 })
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
