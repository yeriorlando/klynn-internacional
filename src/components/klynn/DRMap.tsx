'use client';

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MapPin, Store, Sparkles, Receipt, Droplets } from 'lucide-react';
import { DR_PROVINCE_PATHS } from './DRMapPaths';

interface ProvinceData {
    id: string;
    name: string;
    laundries: number;
    orders: number;
    color: string;
}

const PROVINCES_DATA: Record<string, ProvinceData> = {
    "Santo Domingo": { id: "SD", name: "Santo Domingo", laundries: 48, orders: 3450, color: "#0064e6" },
    "Distrito Nacional": { id: "DN", name: "Distrito Nacional", laundries: 38, orders: 2820, color: "#1D4ED8" },
    "Santiago": { id: "ST", name: "Santiago", laundries: 17, orders: 1180, color: "#2563EB" },
    "San Cristóbal": { id: "SC", name: "San Cristóbal", laundries: 16, orders: 1120, color: "#3B82F6" },
    "La Vega": { id: "VE", name: "La Vega", laundries: 15, orders: 1050, color: "#60A5FA" },
    "La Romana": { id: "LR", name: "La Romana", laundries: 14, orders: 980, color: "#0D9488" },
    "Duarte": { id: "DU", name: "Duarte", laundries: 14, orders: 920, color: "#0E7490" },
    "Puerto Plata": { id: "PP", name: "Puerto Plata", laundries: 13, orders: 880, color: "#0284C7" },
    "San Juan": { id: "SJ", name: "San Juan", laundries: 13, orders: 850, color: "#0369A1" },
    "La Altagracia": { id: "LA", name: "La Altagracia", laundries: 15, orders: 1020, color: "#E0A82E" },
    "Espaillat": { id: "ES", name: "Espaillat", laundries: 12, orders: 790, color: "#D97706" },
    "San Pedro de Macorís": { id: "PM", name: "San Pedro de Macorís", laundries: 12, orders: 780, color: "#B45309" },
    "Azua": { id: "AZ", name: "Azua", laundries: 11, orders: 740, color: "#4F46E5" },
    "Peravia": { id: "PV", name: "Peravia", laundries: 11, orders: 720, color: "#4338CA" },
    "Monseñor Nouel": { id: "MN", name: "Monseñor Nouel", laundries: 11, orders: 710, color: "#10B981" },
    "Valverde": { id: "VA", name: "Valverde", laundries: 10, orders: 680, color: "#059669" },
    "Barahona": { id: "BH", name: "Barahona", laundries: 10, orders: 650, color: "#047857" },
    "Monte Plata": { id: "MP", name: "Monte Plata", laundries: 10, orders: 620, color: "#065F46" },
    "Sánchez Ramírez": { id: "SR", name: "Sánchez Ramírez", laundries: 10, orders: 610, color: "#06B6D4" },
    "María Trinidad Sánchez": { id: "MT", name: "María Trinidad Sánchez", laundries: 10, orders: 600, color: "#0891B2" },
    "Hermanas Mirabal": { id: "HM", name: "Hermanas Mirabal", laundries: 10, orders: 590, color: "#1E40AF" },
    "Bahoruco": { id: "BA", name: "Bahoruco", laundries: 10, orders: 550, color: "#1D4ED8" },
    "Samaná": { id: "SA", name: "Samaná", laundries: 11, orders: 730, color: "#1E3A8A" },
    "El Seibo": { id: "ESB", name: "El Seibo", laundries: 10, orders: 520, color: "#111827" },
    "Hato Mayor": { id: "HMA", name: "Hato Mayor", laundries: 10, orders: 510, color: "#374151" },
    "Monte Cristi": { id: "MC", name: "Monte Cristi", laundries: 10, orders: 490, color: "#4B5563" },
    "Elías Piña": { id: "EP", name: "Elías Piña", laundries: 10, orders: 450, color: "#6B7280" },
    "San José de Ocoa": { id: "JO", name: "San José de Ocoa", laundries: 10, orders: 480, color: "#9CA3AF" },
    "Santiago Rodríguez": { id: "SRO", name: "Santiago Rodríguez", laundries: 10, orders: 460, color: "#D1D5DB" },
    "Independencia": { id: "IN", name: "Independencia", laundries: 10, orders: 440, color: "#E5E7EB" },
    "Dajabón": { id: "DA", name: "Dajabón", laundries: 10, orders: 470, color: "#F3F4F6" },
    "Pedernales": { id: "PE", name: "Pedernales", laundries: 10, orders: 420, color: "#F9FAFB" }
};

const PROVINCES_WITH_MARKERS = [
    "Santo Domingo", "Distrito Nacional", "Azua", "Bahoruco", "Barahona", "Sánchez Ramírez", 
    "La Altagracia", "La Vega", "Valverde", "Monte Cristi", "Monte Plata",
    "María Trinidad Sánchez", "Puerto Plata", "San Cristóbal",
    "Duarte", "San Juan", "San Pedro de Macorís", "Santiago"
];

// Helper to find the center of a path for the marker
function getPathCenter(d: string) {
    const coords = d.match(/[\d.]+\s+[\d.]+/g) || [];
    if (coords.length === 0) return { x: 0, y: 0 };

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    coords.forEach(point => {
        const [x, y] = point.split(/\s+/).map(Number);
        if (!isNaN(x) && !isNaN(y)) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
    });

    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

const ProvinceCard = ({ province, position }: { province: ProvinceData, position: { x: number, y: number } }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed z-[100] pointer-events-none"
            style={{
                left: position.x,
                top: position.y - 190,
                x: '-50%'
            }}
        >
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 shadow-2xl rounded-[2rem] p-5 min-w-[260px] overflow-hidden relative">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />

                <div className="flex items-center gap-3 mb-4 relative">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg rotate-3"
                        style={{ backgroundColor: province.color }}
                    >
                        <MapPin size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-0.5">
                            {province.name}
                        </h3>
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                            Impacto Activo
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 relative">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Store size={14} className="text-primary" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Lavanderías</span>
                        </div>
                        <div className="text-xl font-black text-slate-900 tracking-tighter">
                            {province.laundries.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Receipt size={14} className="text-emerald-500" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Órdenes/Mes</span>
                        </div>
                        <div className="text-xl font-black text-slate-900 tracking-tighter">
                            {province.orders.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default function DRMap() {
    const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [mounted, setMounted] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const totals = useMemo(() => {
        return Object.entries(PROVINCES_DATA).reduce((acc, [name, current]) => {
            if (PROVINCES_WITH_MARKERS.includes(name)) {
                return {
                    laundries: acc.laundries + current.laundries,
                    orders: acc.orders + current.orders,
                    count: acc.count + 1
                };
            }
            return acc;
        }, { laundries: 0, orders: 0, count: 0 });
    }, []);

    const provinceMarkers = useMemo(() => {
        return PROVINCES_WITH_MARKERS.map(name => {
            const d = DR_PROVINCE_PATHS[name];
            if (!d) return null;
            return { name, center: getPathCenter(d) };
        }).filter(m => m !== null);
    }, []);

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    return (
        <section className="py-24 px-6 bg-slate-50/50 overflow-hidden" ref={sectionRef}>
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center mb-16">

                    {/* LEFT COLUMN: THE MAP */}
                    <div className="lg:col-span-7 relative" onMouseMove={handleMouseMove}>
                        {/* Map Container with Ocean Background */}
                        <div className="relative aspect-[1.47/1] bg-[#e3f2fd]/50 rounded-[3rem] p-4 md:p-8 border-2 border-slate-100 shadow-sm group overflow-hidden">
                            {/* World Map Texture / Ocean Waves decor */}
                            <div className="absolute inset-0 opacity-20 pointer-events-none"
                                style={{
                                    backgroundImage: `radial-gradient(#0064e6 1px, transparent 1px)`,
                                    backgroundSize: '30px 30px'
                                }}
                            />

                            {/* Decorative background orbs (Ocean depths) */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-blue-400/10 rounded-full blur-[120px] -z-0" />

                            {/* SVG Map */}
                            <svg
                                viewBox="0 0 10000 6536"
                                className="w-full h-full relative z-10"
                            >
                                {Object.entries(DR_PROVINCE_PATHS).map(([name, d]) => (
                                    <motion.path
                                        key={name}
                                        d={d}
                                        fill={hoveredProvince === name ? (PROVINCES_DATA[name]?.color || '#0064e6') : '#ffffff'}
                                        stroke={hoveredProvince === name ? 'white' : '#cbd5e1'}
                                        strokeWidth={hoveredProvince === name ? 60 : 25}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{
                                            duration: 0.5,
                                            delay: Math.random() * 0.3,
                                            type: "spring",
                                            stiffness: 120
                                        }}
                                        onMouseEnter={() => setHoveredProvince(name)}
                                        onMouseLeave={() => setHoveredProvince(null)}
                                        className="cursor-pointer origin-center transition-colors duration-200"
                                        style={{
                                            filter: hoveredProvince === name ? 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' : 'none',
                                            strokeLinejoin: 'round'
                                        }}
                                    />
                                ))}

                                {/* Markers Layer */}
                                {provinceMarkers.map((marker, i) => (
                                    <motion.g
                                        key={`marker-${i}`}
                                        initial={{ opacity: 0, scale: 0 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.5 + i * 0.05, type: "spring" }}
                                    >
                                        <circle
                                            cx={marker!.center.x}
                                            cy={marker!.center.y}
                                            r="160"
                                            fill="#0064e6"
                                            fillOpacity="0.15"
                                            className="animate-pulse"
                                        />
                                        <circle
                                            cx={marker!.center.x}
                                            cy={marker!.center.y}
                                            r="100"
                                            fill="#0064e6"
                                        />
                                        <circle
                                            cx={marker!.center.x}
                                            cy={marker!.center.y}
                                            r="50"
                                            fill="white"
                                        />
                                        {/* Stylized Pin Shape */}
                                        <path
                                            d={`M ${marker!.center.x} ${marker!.center.y} l -60 -120 a 70 70 0 1 1 120 0 z`}
                                            fill="#0064e6"
                                            transform={`translate(0, -40) scale(1.4)`}
                                            style={{ transformOrigin: `${marker!.center.x}px ${marker!.center.y}px` }}
                                        />
                                    </motion.g>
                                ))}
                            </svg>

                            {/* Tooltip Card following mouse */}
                            <AnimatePresence>
                                {hoveredProvince && PROVINCES_DATA[hoveredProvince] && (
                                    <ProvinceCard
                                        province={PROVINCES_DATA[hoveredProvince]}
                                        position={mousePos}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: TEXT CONTENT (Centered with Map) */}
                    <div className="lg:col-span-5 space-y-8 flex flex-col justify-center min-h-[400px]">
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="text-[#0064e6] font-extrabold text-[12px] uppercase tracking-widest flex items-center gap-1.5"
                            >
                                🇩🇴 Presencia Nacional Klynn (Proyección cercana)
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4"
                            >
                                Impulsando lavanderías<br />
                                <span className="text-[#0064e6]">
                                    en toda la República
                                </span>
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="text-lg text-slate-500 font-medium leading-relaxed max-w-lg mb-4"
                            >
                                <strong>Klynn</strong> es la plataforma tecnológica líder que moderniza la labor operativa de lavanderías y tintorerías en todo el territorio dominicano. Desde Santo Domingo hasta Punta Cana, simplificamos la facturación con NCF, control de caja y entregas a domicilio.
                            </motion.p>

                            {/* COMPACT STATS CARDS (Horizontal 4 Columns under the text) */}
                            <div className="grid grid-cols-4 gap-2 pt-2">
                                {[
                                    { label: "Provincias", value: totals.count.toString(), icon: MapPin, color: "bg-blue-50 text-[#0064e6]" },
                                    { label: "Lavanderías", value: `+${totals.laundries.toLocaleString()}`, icon: Store, color: "bg-emerald-50 text-emerald-600" },
                                    { label: "Órdenes / Año", value: `+${((totals.orders * 12) / 1000).toFixed(0)}K`, icon: Receipt, color: "bg-blue-50 text-blue-600" },
                                    { label: "Satisfacción", value: "99.9%", icon: Droplets, color: "bg-purple-50 text-purple-600" }
                                ].map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.9, y: 15 }}
                                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.08 * i }}
                                        className="bg-white p-2.5 rounded-[1.2rem] border border-slate-100 shadow-sm group hover:shadow-md hover:border-[#0064e6]/30 transition-all duration-300 flex flex-col items-center text-center justify-between min-h-[95px]"
                                    >
                                        <div className={`w-7 h-7 ${stat.color} rounded-lg flex items-center justify-center mb-1 group-hover:scale-105 transition-transform duration-300`}>
                                            <stat.icon size={14} />
                                        </div>
                                        <div className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider mb-1 leading-none">
                                            {stat.label}
                                        </div>
                                        <div className="text-sm font-black text-slate-900 tracking-tighter" suppressHydrationWarning>
                                            {mounted ? stat.value : ''}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
