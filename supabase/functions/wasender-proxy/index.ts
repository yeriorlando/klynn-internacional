import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Proxy Edge Function for WaSender API calls from the browser.
 * Bypasses CORS restrictions and authorization requirements for images and audio.
 * 
 * POST /wasender-proxy?action=upload
 * POST /wasender-proxy?action=send
 * GET  /wasender-proxy?action=media&url=<url>&api_key=<api_key>
 */
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'send'

    // Handle media proxy (GET request to download/render images and audio without CORS)
    if (req.method === 'GET' && action === 'media') {
        try {
            const mediaUrl = url.searchParams.get('url')
            const api_key = url.searchParams.get('api_key')

            if (!mediaUrl) {
                return new Response('Missing url parameter', { status: 400, headers: corsHeaders })
            }

            console.log(`Proxying GET media from: ${mediaUrl}`)

            const headers: HeadersInit = {}
            if (api_key) {
                headers['Authorization'] = `Bearer ${api_key}`
            }

            const res = await fetch(mediaUrl, {
                method: 'GET',
                headers
            })

            if (!res.ok) {
                console.error(`Failed to fetch media. Status: ${res.status}`)
                return new Response(`Error fetching media: ${res.statusText}`, { status: res.status, headers: corsHeaders })
            }

            const contentType = res.headers.get('Content-Type') || 'application/octet-stream'
            const arrayBuffer = await res.arrayBuffer()

            return new Response(arrayBuffer, {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000'
                }
            })
        } catch (error: any) {
            console.error('Media proxy error:', error)
            return new Response(error.message, { status: 500, headers: corsHeaders })
        }
    }

    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const { api_key, base_url, ...payload } = body
        
        if (!api_key) {
            return new Response(JSON.stringify({ error: 'Missing api_key' }), { 
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            })
        }

        const base = (base_url || 'https://wasenderapi.com').replace(/\/$/, '')
        
        let endpoint: string
        if (action === 'upload') {
            endpoint = `${base}/api/upload`
        } else {
            endpoint = `${base}/api/send-message`
        }

        console.log(`Proxying ${action} to ${endpoint}`)

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${api_key}`,
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        const responseText = await res.text()
        console.log(`Proxy response: ${res.status} ${responseText.substring(0, 300)}`)

        return new Response(responseText, {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error: any) {
        console.error('Proxy error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
