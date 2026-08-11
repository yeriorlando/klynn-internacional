import { createFileRoute, Link } from "@tanstack/react-router";
import { BLOG_POSTS } from "@/lib/blog-data";
import { LandingNavbar } from "@/components/klynn/LandingNavbar";
import { motion } from "framer-motion";
import { useState } from "react";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog de Klynn — Consejos y Estrategias para Lavanderías en RD" },
      { 
        name: "description", 
        content: "Aprende a gestionar mejor tu lavandería con nuestros consejos sobre tecnología, operaciones, finanzas y normativa DGII en República Dominicana." 
      }
    ],
  }),
  component: BlogIndex,
});

const CATEGORIES = [
  { id: "ALL", label: "TODOS" },
  { id: "Operaciones", label: "OPERACIONES" },
  { id: "Tecnología", label: "TECNOLOGÍA" },
  { id: "Finanzas", label: "FINANZAS" },
  { id: "Logística", label: "LOGÍSTICA" },
  { id: "Marketing", label: "MARKETING" },
  { id: "DGII", label: "DGII" },
  { id: "Estrategia", label: "ESTRATEGIA" },
];

function BlogIndex() {
  const [activeCategory, setActiveCategory] = useState("ALL");

  const filteredPosts = activeCategory === "ALL" 
    ? BLOG_POSTS 
    : BLOG_POSTS.filter((post) => post.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#faf6ee]/30 font-['Plus_Jakarta_Sans',sans-serif]">
      <LandingNavbar />
      
      <main className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
        {/* HEADER SECTION MATCHING HTML HUM-07 DESIGN */}
        <header className="mb-12 text-center">
          <div className="mb-3 inline-flex items-center justify-center gap-2 text-[11px] font-['JetBrains_Mono',monospace] font-bold uppercase tracking-[0.08em] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-[#F0B900]" />
            BLOG DE KLYNN
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#0f172a] mb-4 text-balance font-['Plus_Jakarta_Sans',sans-serif]">
            Conocimiento para <span className="text-[#1B4B73]">tu lavandería.</span>
          </h1>

          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto text-balance leading-relaxed">
            Estrategias, tecnología, fiscalidad DGII y consejos prácticos para hacer crecer tu lavandería en República Dominicana.
          </p>

          {/* INTERACTIVE CATEGORY FILTER PILLS */}
          <div className="mt-8 flex flex-wrap justify-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-['JetBrains_Mono',monospace] font-bold tracking-[0.06em] uppercase transition-all duration-200 border ${
                    isActive
                      ? "bg-[#133857] text-white border-[#133857] shadow-sm"
                      : "bg-white text-slate-500 border-[#e2e8f0] hover:border-[#1B4B73] hover:text-[#1B4B73]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* POSTS GRID MATCHING HUM-07 CARDS PIXEL-PERFECT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, i) => (
            <Link 
              key={post.slug} 
              to="/blog/$slug" 
              params={{ slug: post.slug }}
              className="block group h-full text-left no-underline"
            >
              <motion.article
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                style={{
                  boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)"
                }}
                className="flex h-full flex-col justify-between rounded-[20px] border-[1.5px] border-[#e2e8f0] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#1B4B73]/50 hover:shadow-[0_12px_32px_-4px_rgba(15,23,42,0.12),0_4px_12px_-2px_rgba(15,23,42,0.08)]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="rounded-full bg-[#F0B900] px-2.5 py-1 text-[10.5px] font-['JetBrains_Mono',monospace] font-bold tracking-[0.08em] uppercase text-[#133857] inline-block">
                      {post.category}
                    </span>
                    <span className="text-[11px] font-['JetBrains_Mono',monospace] text-slate-400">
                      {post.date}
                    </span>
                  </div>

                  <h2 className="text-[1.15rem] font-bold text-[#0f172a] mb-2 leading-[1.3] font-['Plus_Jakarta_Sans',sans-serif] group-hover:text-[#1B4B73] transition-colors">
                    {post.title}
                  </h2>

                  <p className="text-[0.875rem] text-slate-600 line-clamp-3 leading-normal mb-6 font-['Plus_Jakarta_Sans',sans-serif]">
                    {post.excerpt}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#f1f5f9] pt-3 text-[0.8125rem] font-['Plus_Jakarta_Sans',sans-serif]">
                  <span className="font-semibold text-slate-500">{post.author}</span>
                  <span className="font-bold text-[#1B4B73] group-hover:translate-x-0.5 transition-transform">
                    Leer más →
                  </span>
                </div>
              </motion.article>
            </Link>
          ))}
        </div>
      </main>

      {/* FOOTER CTA BANNER */}
      <section className="bg-slate-900 text-white py-16 px-6 mt-16 border-t border-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">¿Quieres modernizar tu lavandería hoy mismo?</h2>
          <p className="text-slate-300 max-w-xl mx-auto mb-8 text-base leading-relaxed">
            Prueba Klynn 14 días gratis sin compromiso. Facturación con NCF, tickets por WhatsApp y cuadre de caja.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/registro">
              <button className="h-12 px-8 bg-[#F0B900] hover:bg-[#D4A300] text-[#133857] rounded-full font-bold shadow-md transition-colors">
                Comenzar prueba gratis →
              </button>
            </Link>
            <a href="https://wa.link/vxstq4" target="_blank" rel="noreferrer">
              <button className="h-12 px-8 bg-transparent hover:bg-slate-800 text-white rounded-full font-semibold border border-slate-700 transition-colors">
                Hablar con un experto
              </button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

