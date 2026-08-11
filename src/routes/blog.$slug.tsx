import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BLOG_POSTS } from "@/lib/blog-data";
import { LandingNavbar } from "@/components/klynn/LandingNavbar";
import { ArrowLeft, Share2, MessageCircle, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = BLOG_POSTS.find((p) => p.slug === params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData.post.title} — Blog de Klynn` },
      { name: "description", content: loaderData.post.excerpt },
      { property: "og:title", content: loaderData.post.title },
      { property: "og:description", content: loaderData.post.excerpt },
      { property: "og:type", content: "article" },
    ],
  }),
  component: BlogPostView,
});

function BlogPostView() {
  const { post } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <style dangerouslySetInnerHTML={{ __html: `
        .blog-content h3 { 
          margin-top: 2.5rem !important; 
          margin-bottom: 1rem !important; 
          display: block !important;
          color: #1B4B73 !important;
          font-weight: 700 !important;
          font-size: 1.35rem !important;
        }
        .blog-content p { 
          margin-bottom: 1.25rem !important; 
          line-height: 1.75 !important;
          color: #334155 !important;
          font-size: 1.0625rem !important;
        }
        .blog-content ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin-bottom: 1.25rem !important;
          display: block !important;
        }
        .blog-content ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin-bottom: 1.25rem !important;
          display: block !important;
        }
        .blog-content li {
          margin-bottom: 0.5rem !important;
          line-height: 1.75 !important;
          color: #334155 !important;
        }
        .blog-content li::marker {
          color: #1B4B73 !important;
        }
        .blog-content li strong, .blog-content p strong {
          color: #0f172a !important;
          font-weight: 600 !important;
        }
      `}} />
      <LandingNavbar />

      <article className="mx-auto max-w-3xl px-6 pt-12 md:pt-16">
        <header className="mb-10">
          <Link to="/blog" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-[#1B4B73] transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Volver al blog
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <span className="rounded-full bg-[#F0B900] px-3 py-1 text-[10px] font-mono font-bold tracking-wider uppercase text-[#133857]">
              {post.category}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {post.date}
            </span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight mb-6">
            {post.title}
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            {post.excerpt}
          </p>

          <div className="flex items-center justify-between border-y border-slate-200 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#1B4B73] flex items-center justify-center font-bold text-white shadow-sm">
                <Droplets className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">{post.author}</div>
                <div className="text-xs text-slate-500">Especialistas en Gestión de Lavanderías & Tecnología RD</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="rounded-full h-9 w-9 p-0 text-slate-500 hover:text-slate-900">
                <Share2 className="h-4 w-4" />
              </Button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Mira este artículo de Klynn: ${post.title} https://klynn.com.do/blog/${post.slug}`)}`} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm" className="rounded-full h-9 w-9 p-0 text-emerald-600 hover:bg-emerald-50">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </header>

        <div 
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }} 
        />

        <section className="mt-16 p-8 md:p-12 rounded-3xl bg-slate-900 text-white text-center shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Aplica estos consejos en tu lavandería</h2>
            <p className="text-slate-300 mb-8 max-w-md mx-auto text-base leading-relaxed">
              Klynn te da todas las herramientas para gestionar caja, NCF, WhatsApp y sucursales sin complicaciones.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/registro">
                <button className="h-12 px-8 bg-[#F0B900] hover:bg-[#D4A300] text-[#133857] rounded-full font-bold shadow-md transition-colors">
                  Probar Klynn Gratis 14 días →
                </button>
              </Link>
              <a href="https://wa.link/vxstq4" target="_blank" rel="noreferrer">
                <button className="h-12 px-8 bg-transparent hover:bg-slate-800 text-white rounded-full font-semibold border border-slate-700 transition-colors">
                  Consultar por WhatsApp
                </button>
              </a>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}

