import React, { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import {
  Sparkles, ShieldCheck, ArrowRightLeft, Plus, Mic, Image, FileText, Paperclip,
  Trash2, StopCircle, Search, Bot, User, Clock, Send, AlertTriangle, Check, 
  CheckCheck, Loader2, Reply, X, Smile, Phone, MessageSquare, UserPlus
} from "lucide-react";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { toast } from "sonner";
import { playNotificationSoundDebounced } from "@/lib/notificationSound";
import { ClienteDialog } from "@/components/klynn/ClienteDialog";

function BoringAvatar({ name, size }: { name: string; size: number }) {
  const colors = ["#00686c", "#32c2b9", "#edecb3", "#fad928", "#ff9915"];
  
  let hash = 0;
  const seed = name || "User";
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const bg = colors[hash % colors.length];
  const color1 = colors[(hash + 1) % colors.length];
  const color2 = colors[(hash + 2) % colors.length];
  
  const cx1 = 10 + (hash % 20);
  const cy1 = 10 + ((hash >> 2) % 20);
  const r1 = 12 + ((hash >> 4) % 12);

  const cx2 = 5 + ((hash >> 6) % 30);
  const cy2 = 5 + ((hash >> 8) % 30);
  const r2 = 8 + ((hash >> 10) % 10);

  const isSmile = (hash >> 12) % 2 === 0;
  const mouthY = 22 + ((hash >> 14) % 3);
  const mouthPath = isSmile 
    ? `M 15 ${mouthY} Q 20 ${mouthY + 4.5} 25 ${mouthY}`
    : `M 15 ${mouthY + 2} Q 20 ${mouthY} 25 ${mouthY + 2}`;

  const eyeXOffset = (hash >> 16) % 3;
  const eyeY = 17 + ((hash >> 18) % 2);
  const faceColor = "#000000";

  return (
    <svg 
      viewBox="0 0 40 40" 
      width={size} 
      height={size} 
      style={{ borderRadius: 'inherit', display: 'block' }}
    >
      <mask id={`mask-${hash}`}>
        <rect width="40" height="40" rx="20" fill="white" />
      </mask>
      <g mask={`url(#mask-${hash})`}>
        <rect width="40" height="40" fill={bg} />
        <circle cx={cx1} cy={cy1} r={r1} fill={color1} opacity="0.85" />
        <circle cx={cx2} cy={cy2} r={r2} fill={color2} opacity="0.75" />
        
        <g transform={`rotate(${(hash >> 20) % 30 - 15} 20 20)`}>
          <circle cx={15 + eyeXOffset} cy={eyeY} r="1.8" fill={faceColor} />
          <circle cx={25 - eyeXOffset} cy={eyeY} r="1.8" fill={faceColor} />
          <path 
            d={mouthPath} 
            stroke={faceColor} 
            strokeWidth="1.8" 
            fill="none" 
            strokeLinecap="round" 
          />
        </g>
      </g>
    </svg>
  );
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, "");
  
  if (clean.length === 11 && clean.startsWith("1")) {
    return `+1 (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7)}`;
  } else if (clean.length === 10) {
    return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  
  return phone.startsWith("+") ? phone : `+${phone}`;
}

interface DBConversation {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  last_msg: string;
  time: string;
  unread: number;
  status: 'activa' | 'finalizada';
  agent: 'ia' | 'humano';
}

interface DBMessage {
  id: string;
  tenant_id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  wamid?: string;
  payload?: any;
  reply_to_id?: string | null;
  reactions?: { emoji: string; from: string }[] | null;
  status?: string;
}

export const Route = createFileRoute("/t/$slug/conversations")({
  component: ConversationsPage,
});

const loadLamejs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).lamejs) {
      resolve((window as any).lamejs);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.all.min.js';
    script.onload = () => resolve((window as any).lamejs);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

function formatShortMessageContent(content: string): string {
  if (!content) return '';
  
  // Format matching attachment: [type] url|filename
  const mediaRegex = /^\[(image|video|audio|document)\]\s*(https?:\/\/[^\s|]+)(?:\|([^]+))?/;
  const match = content.match(mediaRegex);
  
  if (match) {
    const type = match[1];
    const filename = match[3];
    
    const typeLabels: Record<string, string> = {
      image: '📷 Imagen',
      video: '🎥 Video',
      audio: '🎤 Audio',
      document: '📄 Documento'
    };
    
    const label = typeLabels[type] || '📎 Archivo';
    
    if (filename) {
      return `${label}: ${filename}`;
    }
    return label;
  }
  
  return content;
}

function ConversationsPage() {
  const user = useRequireAuth();
  const [conversations, setConversations] = useState<DBConversation[]>([]);
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [activeMediaModalUrl, setActiveMediaModalUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<DBMessage | null>(null);
  const [switchingAgent, setSwitchingAgent] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [convToDeleteId, setConvToDeleteId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Media Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showSaveClientModal, setShowSaveClientModal] = useState(false);
  const [clientToSave, setClientToSave] = useState<any>(null);

  const handleOpenSaveClientModal = async () => {
    const selectedConversation = conversations.find(c => c.id === selectedConvId);
    if (!selectedConversation || !tenant) return;

    const rawPhone = selectedConversation.phone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const rdPhone = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
    const formattedPhone = rdPhone.length === 10 
      ? `${rdPhone.slice(0, 3)}-${rdPhone.slice(3, 6)}-${rdPhone.slice(6)}`
      : rdPhone;

    try {
      const { data: existingClient, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("tenant_id", tenant.id)
        .or(`telefono.eq.${formattedPhone},telefono.eq.${rdPhone}`)
        .maybeSingle();

      if (existingClient) {
        toast.info("ℹ️ Este contacto ya está registrado como cliente. Cargando perfil...");
        setClientToSave(existingClient);
      } else {
        const isNumeric = (val: string) => /^\+?\d+$/.test(val.replace(/\s/g, ""));
        const defaultName = selectedConversation.name && !isNumeric(selectedConversation.name) 
          ? selectedConversation.name 
          : "";
        
        setClientToSave({
          nombre: defaultName,
          apellido: "",
          telefono: formattedPhone,
          tipo: "Consumidor Final"
        });
      }
    } catch (e) {
      console.error(e);
      setClientToSave({
        nombre: selectedConversation.name || "",
        apellido: "",
        telefono: formattedPhone,
        tipo: "Consumidor Final"
      });
    }

    setShowSaveClientModal(true);
  };

  const isDarkTheme = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const tenant = user && user.tenant && user.tenant.id !== '__loading__' ? user.tenant : null;
  const tenantId = tenant?.id;
  const wa = tenant?.config?.whatsapp;

  const getProxiedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("wasenderapi.com")) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiKey = wa?.api_key || "";
      return `${supabaseUrl}/functions/v1/wasender-proxy?action=media&url=${encodeURIComponent(url)}&api_key=${encodeURIComponent(apiKey)}`;
    }
    return url;
  };

  const formatLastMsg = (msg: string | null | undefined) => {
    if (!msg) return "";
    if (msg.startsWith("[image]")) {
      const parts = msg.replace("[image]", "").trim().split("|");
      return `📷 Imagen${parts[1] ? ': ' + parts[1] : ''}`;
    }
    if (msg.startsWith("[video]")) {
      return "🎥 Video";
    }
    if (msg.startsWith("[audio]")) {
      return "🎙️ Nota de voz";
    }
    if (msg.startsWith("[document]")) {
      const parts = msg.replace("[document]", "").trim().split("|");
      return `📄 ${parts[1] || "Documento"}`;
    }
    return msg;
  };

  // 1. Fetch Conversations
  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Conversación eliminada con éxito");
      
      setConversations(prev => prev.filter(c => c.id !== id));
      if (selectedConvId === id) {
        setSelectedConvId(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error al eliminar conversación: " + err.message);
    }
  };

  const fetchConversations = async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('time', { ascending: false });

      if (error) {
        console.error("Error loading conversations:", error);
      } else {
        // Self-healing & Deduplication: clean up duplicate threads for the same phone number (keeping the latest one)
        const seenPhones = new Set<string>();
        const validConversations: typeof data = [];
        const duplicateIds: string[] = [];

        (data || []).forEach(c => {
          if (!c.phone || c.phone === 'undefined' || c.phone === 'null' || c.phone === '') {
            duplicateIds.push(c.id);
            return;
          }
          
          if (seenPhones.has(c.phone)) {
            // Already seen a newer one (ordered by time desc), so this is an older duplicate thread
            duplicateIds.push(c.id);
          } else {
            seenPhones.add(c.phone);
            validConversations.push(c);
          }
        });

        if (duplicateIds.length > 0) {
          // Silently purge legacy duplicate threads from database
          supabase.from('conversations').delete().in('id', duplicateIds).then(({ error }) => {
            if (error) console.error("Error cleaning duplicate conversations:", error);
          });
        }

        setConversations(validConversations || []);
        
        // Reset selected conv if it was invalid/deleted or not set
        const isSelectedConvValid = selectedConvId && (validConversations || []).some(c => c.id === selectedConvId);
        if (validConversations && validConversations.length > 0 && !isSelectedConvValid) {
          setSelectedConvId(validConversations[0].id);
        } else if (!validConversations || validConversations.length === 0) {
          setSelectedConvId(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchConversations();
    }
  }, [tenantId]);

  // 2. Fetch Messages for selected conversation
  const fetchMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('time', { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
    } else {
      setMessages(data || []);
      // Reset unread count for this conversation in DB
      await supabase
        .from('conversations')
        .update({ unread: 0 })
        .eq('id', convId);
      
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread: 0 } : c));
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      localStorage.setItem('klynn_active_chat_id', selectedConvId);
    } else {
      localStorage.removeItem('klynn_active_chat_id');
    }
    return () => {
      localStorage.removeItem('klynn_active_chat_id');
    };
  }, [selectedConvId]);

  useEffect(() => {
    if (!selectedConvId || !tenantId) return;
    fetchMessages(selectedConvId);

    // Setup real-time postgres channels subscription for instant updates
    const channel = supabase
      .channel(`chat_tenant:${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row && row.tenant_id === tenantId) {
            fetchConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as DBMessage;
            if (newMsg && newMsg.tenant_id === tenantId) {
              const activeChatId = localStorage.getItem('klynn_active_chat_id');
              if (newMsg.role === 'user' && newMsg.conversation_id !== selectedConvId && newMsg.conversation_id !== activeChatId) {
                playNotificationSoundDebounced();
              }
              if (newMsg.conversation_id === selectedConvId) {
                setMessages(prev => {
                  if (prev.some(m => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
                
                // Reset unread count immediately in DB and state for the active chat
                supabase
                  .from('conversations')
                  .update({ unread: 0 })
                  .eq('id', selectedConvId)
                  .then();
                setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, unread: 0 } : c));
              }
            }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConvId, tenantId]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Loading indicator for auth
  if (!user || user.tenant.id === '__loading__') {
    return <GlobalPageLoader text="Cargando centro de mensajes WhatsApp..." minHeight="h-[calc(100vh-6rem)] min-h-[550px]" />;
  }

  // --- AUDIO RECORDING LOGIC ---
  const loadLamejs = async () => {
    if ((window as any).lamejs) return (window as any).lamejs;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js';
    document.body.appendChild(script);
    return new Promise((resolve) => {
      script.onload = () => resolve((window as any).lamejs);
    });
  };

  const startRecording = async () => {
    try {
      const lamejs = await loadLamejs();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 44100 });
      const source = audioContext.createMediaStreamSource(stream);
      
      // ScriptProcessorNode for wide cross-browser compatibility
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      const mp3encoder = new lamejs.Mp3Encoder(1, 44100, 128);
      const mp3Data: any[] = [];
      
      processor.onaudioprocess = (e) => {
        const left = e.inputBuffer.getChannelData(0);
        const samples = new Int16Array(left.length);
        for (let i = 0; i < left.length; i++) {
          const s = Math.max(-1, Math.min(1, left[i]));
          samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        const mp3buf = mp3encoder.encodeBuffer(samples);
        if (mp3buf.length > 0) {
          mp3Data.push(new Uint8Array(mp3buf));
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      // Store on window temporarily to access inside callbacks
      (window as any)._audioRecorder = {
        stream,
        audioContext,
        source,
        processor,
        mp3encoder,
        mp3Data
      };
      
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      toast.error("❌ Permiso denegado o no se detecta micrófono. Asegúrate de usar HTTPS.");
    }
  };

  const stopRecording = async () => {
    const rec = (window as any)._audioRecorder;
    if (!rec || !isRecording) return;
    
    clearInterval(timerRef.current);
    setIsRecording(false);
    
    try {
      rec.processor.disconnect();
      rec.source.disconnect();
      rec.audioContext.close();
      rec.stream.getTracks().forEach((track: any) => track.stop());
      
      const mp3buf = rec.mp3encoder.flush();
      if (mp3buf.length > 0) {
        rec.mp3Data.push(new Uint8Array(mp3buf));
      }
      
      const audioBlob = new Blob(rec.mp3Data, { type: 'audio/mpeg' });
      await uploadAndSendMedia(audioBlob, 'audio');
    } catch (err: any) {
      console.error("Error stops recording:", err);
      toast.error("❌ Error al procesar audio");
    } finally {
      delete (window as any)._audioRecorder;
    }
  };

  const cancelRecording = () => {
    const rec = (window as any)._audioRecorder;
    if (!rec || !isRecording) return;
    
    clearInterval(timerRef.current);
    setIsRecording(false);
    
    try {
      rec.processor.disconnect();
      rec.source.disconnect();
      rec.audioContext.close();
      rec.stream.getTracks().forEach((track: any) => track.stop());
      toast.info("🎙️ Grabación cancelada");
    } catch (err: any) {
      console.error("Error cancelling recording:", err);
    } finally {
      delete (window as any)._audioRecorder;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- MEDIA UPLOAD LOGIC ---
  const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('video/') ? 'video' : 'document';
    
    await uploadAndSendMedia(file, type);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadAndSendMedia = async (file: File | Blob, type: string) => {
    if (!wa || !wa.enabled || !wa.api_key) {
      toast.error("❌ WhatsApp no está configurado en tu sucursal");
      return;
    }
    setUploading(true);
    try {
      const base64Data = await fileToBase64(file);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Upload through proxy to avoid CORS
      const response = await fetch(`${supabaseUrl}/functions/v1/wasender-proxy?action=upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          api_key: wa.api_key,
          base_url: wa.base_url || 'https://wasenderapi.com',
          base64: base64Data
        }),
      });

      const result = await response.json().catch(() => ({}));
      const success = result.success === true;
      const publicUrl = result.publicUrl || result.data?.url || result.url;

      if (!success || !publicUrl) {
        throw new Error(result.message || result.error || "Error al subir archivo");
      }

      await handleSend(type, publicUrl, file instanceof File ? file.name : 'audio.ogg');
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(`❌ Error al subir archivo: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // --- SEND MESSAGE LOGIC ---
  const handleSend = async (type = 'text', mediaUrl?: string, filename?: string) => {
    if ((type === 'text' && !messageText.trim()) || !selectedConvId) return;

    const currentMsg = messageText;
    const originalReplyingTo = replyingTo;

    if (type === 'text') {
      setMessageText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '36px';
      }
    }
    setReplyingTo(null);

    if (!wa || !wa.enabled || !wa.api_key) {
      toast.error("❌ WhatsApp no está configurado o habilitado en Configuración");
      if (type === 'text') setMessageText(currentMsg);
      return;
    }

    const selectedConv = conversations.find(c => c.id === selectedConvId);
    if (!selectedConv) return;

    const cleanPhone = selectedConv.phone.replace(/\D/g, '');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // Build request body using WaSender's unified /api/send-message format
    let requestBody: any = { 
      api_key: wa.api_key,
      base_url: wa.base_url || 'https://wasenderapi.com',
      to: cleanPhone, 
      instance_id: wa.instance 
    };

    if (type === 'text') {
      requestBody.text = currentMsg;
    } else if (type === 'image') {
      requestBody.imageUrl = mediaUrl;
    } else if (type === 'audio') {
      requestBody.audioUrl = mediaUrl;
      requestBody.ptt = true;
    } else if (type === 'video') {
      requestBody.videoUrl = mediaUrl;
    } else if (type === 'document') {
      requestBody.documentUrl = mediaUrl;
      requestBody.filename = filename || 'document';
    }

    if (originalReplyingTo && originalReplyingTo.wamid) {
      const parsedId = parseInt(originalReplyingTo.wamid, 10);
      if (!isNaN(parsedId)) {
        requestBody.replyTo = parsedId;
      }
    }

    try {
      // Send through proxy to avoid CORS
      const res = await fetch(`${supabaseUrl}/functions/v1/wasender-proxy?action=send`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok || resData.status === 'error') {
        throw new Error(resData.message || `HTTP ${res.status}`);
      }

      const wamid = resData.data?.id || `wsnd_${Date.now()}`;
      const displayContent = type === 'text' ? currentMsg : `[${type}] ${mediaUrl}${filename ? '|' + filename : ''}`;

      // Insert message into DB from client
      const { data: newMsg, error: insertErr } = await supabase
        .from('messages')
        .insert({
          tenant_id: tenant.id,
          conversation_id: selectedConvId,
          role: 'assistant',
          content: displayContent,
          wamid: wamid,
          payload: resData,
          status: 'sent',
          reply_to_id: originalReplyingTo ? originalReplyingTo.id : null,
          time: new Date().toISOString()
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Update conversation in DB
      await supabase
        .from('conversations')
        .update({
          last_msg: displayContent,
          time: new Date().toISOString()
        })
        .eq('id', selectedConvId);

      // Let real-time handle adding the message to UI.
      // As fallback (if real-time not active), refetch all messages.
      fetchMessages(selectedConvId);
      fetchConversations();
    } catch (err: any) {
      toast.error(`❌ Error al enviar mensaje: ${err.message}`);
      if (type === 'text') setMessageText(currentMsg);
    }
  };

  // --- IA / AGENT TOGGLE LOGIC ---
  const toggleAgent = async (convId: string, currentAgent: string) => {
    setSwitchingAgent(true);
    const newAgent = currentAgent === 'ia' ? 'humano' : 'ia';
    const { error } = await supabase
      .from('conversations')
      .update({ agent: newAgent })
      .eq('id', convId);
    
    if (error) {
      toast.error("❌ Error cambiando modo del agente");
    } else {
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, agent: newAgent } : c));
      toast.success(newAgent === 'ia' ? "🤖 IA Automática Activada" : "👤 Modo Humano Activado");
    }
    setSwitchingAgent(false);
  };

  // --- EMOJI CLICK ---
  const onEmojiClick = (emojiData: any) => {
    setMessageText(prev => prev + emojiData.emoji);
  };

  // --- START NEW CHAT ---
  const createNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatPhone.trim() || !newChatName.trim()) return;

    setIsCreatingChat(true);
    try {
      const cleanPhone = newChatPhone.replace(/\D/g, '');
      
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existing) {
        setSelectedConvId(existing.id);
        setShowNewChatModal(false);
        setNewChatPhone("");
        setNewChatName("");
        return;
      }

      // Create conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          tenant_id: tenant.id,
          name: newChatName,
          phone: cleanPhone,
          status: 'activa',
          agent: 'humano',
          unread: 0,
          last_msg: 'Conversación creada',
          time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("✅ Chat creado con éxito");
      setShowNewChatModal(false);
      setNewChatPhone("");
      setNewChatName("");
      setConversations(prev => [newConv, ...prev]);
      setSelectedConvId(newConv.id);
    } catch (err: any) {
      toast.error(`❌ Error al crear chat: ${err.message}`);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const filtered = (conversations || []).filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  const selectedConversation = conversations.find(c => c.id === selectedConvId);
  const isAiMode = selectedConversation?.agent === 'ia';

  if (isLoading) {
    return (
      <GlobalPageLoader 
        text="Cargando centro de mensajes WhatsApp..." 
        minHeight="h-[calc(100vh-6rem)] min-h-[550px]" 
      />
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Contact list sidebar */}
      <div className="w-80 border-r border-border flex flex-col bg-card shrink-0 select-none">
        <div className="p-3 border-b border-border flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversación..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            size="icon" 
            className="h-9 w-9 shrink-0 rounded-xl"
            onClick={() => setShowNewChatModal(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <MessageSquare className="h-8 w-8 opacity-20" />
              No hay conversaciones encontradas
            </div>
          ) : (
            filtered.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border/40 transition-colors group relative ${
                  conv.id === selectedConvId ? "bg-accent" : "hover:bg-muted/40"
                }`}
              >
                <div className="shrink-0 mt-0.5 rounded-xl overflow-hidden h-10 w-10">
                  <BoringAvatar
                    size={40}
                    name={conv.name || conv.phone || "U"}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-foreground truncate">{conv.name || formatPhoneNumber(conv.phone)}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0 uppercase">
                      {conv.time ? formatDistanceToNow(new Date(conv.time), { addSuffix: false, locale: es }) : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{formatLastMsg(conv.last_msg)}</p>
                  {conv.unread > 0 && (
                    <div className="flex justify-end mt-1">
                      <span className="ml-auto h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                        {conv.unread}
                      </span>
                    </div>
                  )}
                </div>

                {/* Botón de eliminación en hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConvToDeleteId(conv.id);
                    setShowDeleteModal(true);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg z-10"
                  title="Eliminar conversación"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Canvas */}
      <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative">
        {selectedConversation ? (
          <>
            {/* Header info bar */}
            <div className="border-b border-border bg-card shrink-0 z-10 shadow-sm">
              <div className="h-14 px-5 flex items-center gap-3">
                <div className="shrink-0 rounded-xl overflow-hidden h-9 w-9">
                  <BoringAvatar
                    size={36}
                    name={selectedConversation.name || selectedConversation.phone || "U"}
                  />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-bold text-foreground truncate">{selectedConversation.name || selectedConversation.phone}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
                    <span className="h-2 w-2 rounded-full inline-block bg-emerald-500 shrink-0" />
                    <span className="font-medium tracking-wide">{formatPhoneNumber(selectedConversation.phone)}</span>
                  </p>
                </div>

                {/* Save Client Button */}
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8.5 rounded-xl border-primary/20 hover:border-primary/40 text-primary hover:text-primary hover:bg-primary/5 flex items-center gap-1.5 font-bold text-xs shadow-sm transition-all active:scale-95"
                    onClick={handleOpenSaveClientModal}
                  >
                    <UserPlus className="h-4 w-4" />
                    Guardar cliente
                  </Button>
                </div>
            </div>
            </div>

            {/* Config Warning banner if API not ready */}
            {(!wa || !wa.enabled || !wa.api_key) && (
              <div className="bg-amber-50 border-b border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 p-3 px-5 flex items-start gap-3 text-amber-800 dark:text-amber-400 text-xs shrink-0 select-none z-10">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">WhatsApp no está conectado</p>
                  <p className="mt-0.5 opacity-80">Por favor, ve a Configuración &gt; pestaña WhatsApp y configura tus credenciales de WASenderAPI para habilitar el chat interactivo en vivo.</p>
                </div>
              </div>
            )}

            {/* Chat message bubbles canvas */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-5 space-y-3 flex flex-col relative"
              style={{
                backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
                backgroundBlendMode: isDarkTheme ? 'multiply' : 'overlay',
                backgroundSize: '400px',
                opacity: isDarkTheme ? 0.9 : 1
              }}
            >
              {messages.length === 0 ? (
                <div className="m-auto text-center text-xs p-6 bg-white/80 dark:bg-[#202c33]/80 rounded-2xl max-w-xs shadow-md border border-black/5">
                  <MessageSquare className="h-8 w-8 text-primary mx-auto mb-2 opacity-55 animate-pulse" />
                  <p className="font-bold text-foreground">Comienzo del chat</p>
                  <p className="text-muted-foreground mt-0.5">Envía un mensaje para iniciar la conversación con este cliente.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isSentByMe = msg.role === "assistant";
                  const showTail = idx === 0 || messages[idx - 1].role !== msg.role;
                  const repliedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

                  // Render link if message content is an attachment
                  const isMedia = msg.content.startsWith('[image]') || msg.content.startsWith('[video]') || msg.content.startsWith('[audio]') || msg.content.startsWith('[document]');
                  let mediaType = "";
                  let mediaUrl = "";
                  let mediaCaption = "";
                  let mediaFilename = "";
                  if (isMedia) {
                    const lines = msg.content.split('\n');
                    const match = lines[0].match(/^\[(\w+)\]\s*(.*)$/);
                    if (match) {
                      mediaType = match[1];
                      const parts = match[2].split('|');
                      mediaUrl = parts[0];
                      mediaFilename = parts[1] || "";
                      mediaCaption = lines.slice(1).join('\n').trim();
                    }
                  }

                  return (
                    <div key={msg.id} className={`flex ${isSentByMe ? "justify-end" : "justify-start"} mb-[2px] group animate-in fade-in-20 duration-150`}>
                      <div
                        className={`max-w-[65%] relative rounded-lg px-2 py-1 text-[15.5px] shadow-[0_1px_1px_rgba(0,0,0,0.06)] ${
                          isSentByMe
                            ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none"
                            : "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none"
                        } ${!showTail ? "rounded-tr-lg rounded-tl-lg" : ""}`}
                      >
                        {/* Reply reference bubble */}
                        {repliedMsg && (
                          <div
                            className="bg-black/5 rounded-md border-l-3 border-primary/50 p-1.5 mb-1 cursor-pointer hover:bg-black/10 transition-colors"
                            onClick={() => {
                              const el = document.getElementById(`msg-${repliedMsg.id}`);
                              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el?.classList.add('animate-pulse');
                              setTimeout(() => el?.classList.remove('animate-pulse'), 1500);
                            }}
                          >
                            <p className="text-[11px] font-bold text-primary truncate">
                              {repliedMsg.role === 'user' ? (selectedConversation?.name || 'Cliente') : 'Tú'}
                            </p>
                            <p className="text-[12px] text-muted-foreground truncate line-clamp-1">{formatShortMessageContent(repliedMsg.content)}</p>
                          </div>
                        )}

                        {/* Reply Button on hover */}
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className={`absolute top-2 ${isSentByMe ? "-left-11" : "-right-11"} p-2 rounded-full bg-white dark:bg-[#202c33] opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-gray-50 dark:hover:bg-[#2a3942] z-10 border border-black/5`}
                        >
                          <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>

                        {/* Message Tail */}
                        {showTail && (
                          <div className={`absolute top-0 w-2 h-2.5 ${
                            isSentByMe ? " -right-2 bg-[#d9fdd3] dark:bg-[#005c4b]" : " -left-2 bg-white dark:bg-[#202c33]"
                          }`}
                          style={{
                            clipPath: isSentByMe
                              ? 'polygon(0 0, 0% 100%, 100% 0)'
                              : 'polygon(100% 0, 0 0, 100% 100%)'
                          }} />
                        )}

                        {/* Content text/media renderer */}
                        <div id={`msg-${msg.id}`}>
                          {isMedia ? (
                            <div className="space-y-1 my-0.5">
                              {mediaType === 'image' && (
                                <img 
                                  src={getProxiedUrl(mediaUrl)} 
                                  alt="WhatsApp attachment" 
                                  className="rounded-xl max-h-60 object-cover max-w-full hover:scale-[1.01] transition-transform shadow-sm cursor-pointer" 
                                  onClick={() => setActiveMediaModalUrl(getProxiedUrl(mediaUrl))} 
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    const retries = parseInt(target.getAttribute('data-retry') || '0', 10);
                                    if (retries < 4) {
                                      target.setAttribute('data-retry', (retries + 1).toString());
                                      setTimeout(() => {
                                        const currentSrc = target.src;
                                        target.src = '';
                                        target.src = currentSrc;
                                      }, 1000 * (retries + 1));
                                    } else {
                                      target.style.display = 'none';
                                      const placeholder = document.createElement('div');
                                      placeholder.className = 'flex items-center gap-2 p-3 bg-black/5 rounded-xl text-xs text-muted-foreground';
                                      placeholder.innerHTML = '📷 <span class="opacity-75">Imagen (expirada)</span>';
                                      target.parentNode?.insertBefore(placeholder, target);
                                    }
                                  }}
                                />
                              )}
                              {mediaType === 'video' && (
                                <video 
                                  src={getProxiedUrl(mediaUrl)} 
                                  controls 
                                  className="rounded-xl max-h-60 max-w-full shadow-sm" 
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    const retries = parseInt(target.getAttribute('data-retry') || '0', 10);
                                    if (retries < 4) {
                                      target.setAttribute('data-retry', (retries + 1).toString());
                                      setTimeout(() => {
                                        const currentSrc = target.src;
                                        target.src = '';
                                        target.src = currentSrc;
                                      }, 1000 * (retries + 1));
                                    } else {
                                      target.style.display = 'none';
                                      const placeholder = document.createElement('div');
                                      placeholder.className = 'flex items-center gap-2 p-3 bg-black/5 rounded-xl text-xs text-muted-foreground';
                                      placeholder.innerHTML = '🎥 <span class="opacity-75">Video (expirado)</span>';
                                      target.parentNode?.insertBefore(placeholder, target);
                                    }
                                  }}
                                />
                              )}
                              {mediaType === 'audio' && (
                                <audio src={getProxiedUrl(mediaUrl)} controls className="max-w-full scale-95 origin-left" />
                              )}
                              {mediaType === 'document' && (
                                <a href={getProxiedUrl(mediaUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2 bg-black/5 hover:bg-black/10 rounded-xl transition-colors text-xs font-bold max-w-full">
                                  <FileText className="h-5 w-5 text-primary shrink-0" />
                                  <span className="truncate">{mediaFilename || mediaUrl.split('/').pop() || 'Ver Documento'}</span>
                                </a>
                              )}
                              {mediaCaption && (
                                <p className="leading-relaxed whitespace-pre-wrap text-sm mt-1">{mediaCaption}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-[15.5px] leading-snug whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>

                        {/* Bubble Timestamp and Status checks */}
                        <div className="flex items-center justify-end gap-0.5 mt-0.5 -mb-0.5 select-none">
                          <span className="text-[10px] opacity-60 text-muted-foreground">
                            {new Date(msg.time).toLocaleTimeString('es-DO', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            }).toUpperCase()}
                          </span>
                          {isSentByMe && (
                            <div className="ml-0.5">
                              {msg.status === 'read' ? (
                                <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input keyboard toolbar bar */}
            <div className="border-t border-border bg-card dark:bg-[#121b22] shrink-0 p-3 px-4 z-10 shadow-[0_-2px_5px_rgba(0,0,0,0.02)]">
              {replyingTo && (
                <div className="px-4 py-2 mb-2 border-l-4 border-primary bg-muted/30 rounded-xl flex gap-3 items-center animate-in slide-in-from-bottom-2 duration-150">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-primary">
                      Respondiendo a {replyingTo.role === 'user' ? (selectedConversation?.name || 'Cliente') : 'Tú'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{formatShortMessageContent(replyingTo.content)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full shrink-0" onClick={() => setReplyingTo(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-end gap-1.5 bg-muted/40 dark:bg-[#2a3942] rounded-2xl px-3.5 border border-border/40 min-h-11.5 h-auto py-1.5">
                  {/* Emoji Picker Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8.5 w-8.5 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-transparent p-0 transition-colors mb-0.5"
                      >
                        <Smile className="h-5.5 w-5.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[330px] p-0 border-none shadow-2xl rounded-[2rem] overflow-hidden z-50" align="start" side="top" sideOffset={4}>
                      <EmojiPicker 
                        onEmojiClick={onEmojiClick}
                        theme={isDarkTheme ? Theme.DARK : Theme.LIGHT}
                        width="100%"
                        height="380px"
                        lazyLoadEmojis
                        searchPlaceholder="Buscar emoji..."
                        skinTonesDisabled
                        previewConfig={{ showPreview: false }}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Dropdown Menu for attachments */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8.5 w-8.5 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-transparent p-0 transition-colors mb-0.5"
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 p-1.5 rounded-2xl shadow-2xl border-none bg-white dark:bg-[#233138] animate-in slide-in-from-bottom-2 duration-150 z-50" side="top" sideOffset={4}>
                      <DropdownMenuItem className="gap-3 py-2.5 rounded-xl cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="h-9 w-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                        <span className="font-bold text-sm">Documento</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-3 py-2.5 rounded-xl cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="h-9 w-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
                          <Image className="h-4.5 w-4.5" />
                        </div>
                        <span className="font-bold text-sm">Fotos y videos</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect}
                    accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
                  />

                  {/* Textarea Input field */}
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      placeholder="Escribe un mensaje..."
                      rows={1}
                      className="flex-1 max-h-[120px] text-[17px] leading-[1.45] border-none focus:outline-none focus:ring-0 bg-transparent px-2 placeholder:text-muted-foreground/60 w-full resize-none overflow-hidden dark:text-white block"
                      style={{ height: '36px', paddingTop: '8px', paddingBottom: '8px', boxSizing: 'border-box' }}
                      value={messageText}
                      onChange={(e) => {
                        const textarea = e.target;
                        setMessageText(textarea.value);
                        // Auto adjust height
                        textarea.style.height = 'auto';
                        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend('text');
                        }
                      }}
                      disabled={uploading}
                    />
                    {uploading && (
                      <div className="absolute right-1 text-primary animate-spin">
                        <Loader2 className="h-4.5 w-4.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Rectangular premium send button */}
                <div className="shrink-0">
                  <Button 
                    className="h-11.5 px-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md flex items-center gap-2 font-bold transition-all active:scale-95 border-0" 
                    onClick={() => handleSend('text')}
                    disabled={uploading || !messageText.trim()}
                  >
                    <Send className="h-4 w-4" strokeWidth={2.5} />
                    ENVIAR
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center select-none bg-background">
            <div className="h-24 w-24 rounded-[2rem] bg-muted/65 flex items-center justify-center mb-5 border border-border/10">
              <MessageSquare className="h-11 w-11 opacity-25 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Selecciona un chat en Klynn</h3>
            <p className="text-xs max-w-xs mt-1.5 text-muted-foreground/80 leading-relaxed">
              Haz clic en cualquier cliente de la barra lateral para administrar sus alertas, mensajes y respuestas de WhatsApp en tiempo real.
            </p>
            <Button 
              className="mt-6 rounded-xl gap-2 font-bold"
              onClick={() => setShowNewChatModal(true)}
            >
              <Plus className="h-4 w-4" />
              Nueva Conversación
            </Button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-[2rem] border border-border p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-lg font-bold text-foreground">Nueva Conversación</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => setShowNewChatModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={createNewChat} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Nombre del Contacto</label>
                <Input 
                  placeholder="Juan Pérez" 
                  value={newChatName}
                  onChange={e => setNewChatName(e.target.value)}
                  required
                  className="rounded-xl h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Teléfono (con código de país, ej: 18091234567)</label>
                <Input 
                  placeholder="18091234567" 
                  value={newChatPhone}
                  onChange={e => setNewChatPhone(e.target.value)}
                  required
                  type="tel"
                  className="rounded-xl h-10 text-sm"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-xl font-bold h-10 mt-2"
                disabled={isCreatingChat}
              >
                {isCreatingChat ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Iniciar Chat
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-950/25 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-[360px] rounded-[2.2rem] border border-border p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-destructive/10 text-destructive shadow-sm">
              <Trash2 className="h-6 w-6" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-display text-lg font-bold text-foreground">¿Eliminar conversación?</h3>
              <p className="text-xs md:text-[13px] text-muted-foreground leading-relaxed">
                Esta acción es permanente y eliminará todos los mensajes asociados de la base de datos de forma irrevocable.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline"
                className="h-9 flex-1 rounded-xl text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                onClick={() => {
                  setShowDeleteModal(false);
                  setConvToDeleteId(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                className="h-9 flex-1 rounded-xl text-xs md:text-sm font-bold text-white bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (convToDeleteId) {
                    deleteConversation(convToDeleteId);
                  }
                  setShowDeleteModal(false);
                  setConvToDeleteId(null);
                }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save / Edit Client Profile Modal Dialog */}
      {showSaveClientModal && (
        <ClienteDialog
          open={showSaveClientModal}
          onOpenChange={setShowSaveClientModal}
          cliente={clientToSave}
          tenant={tenant}
          onDone={(cli) => {
            setShowSaveClientModal(false);
            setClientToSave(null);
            if (cli) {
              setConversations(prev => prev.map(c => {
                if (c.id === selectedConvId) {
                  return { ...c, name: `${cli.nombre} ${cli.apellido || ""}`.trim() };
                }
                return c;
              }));
            }
          }}
        />
      )}
      {/* High Fidelity Media Preview Modal */}
      {activeMediaModalUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setActiveMediaModalUrl(null)}
        >
          <div 
            className="relative max-w-full max-h-[90vh] bg-card dark:bg-[#1f2c34] rounded-2xl overflow-hidden shadow-2xl border border-white/10 p-2 flex flex-col items-center justify-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/55 text-white hover:bg-black/80 hover:text-white transition-colors border border-white/20 shadow-lg z-50 backdrop-blur-md"
              onClick={() => setActiveMediaModalUrl(null)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* High Definition Image Element */}
            <img 
              src={activeMediaModalUrl} 
              alt="Preview" 
              className="rounded-xl max-w-full max-h-[85vh] object-contain shadow-2xl hover:scale-[1.01] transition-transform select-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
