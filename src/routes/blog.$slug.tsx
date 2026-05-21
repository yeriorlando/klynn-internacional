import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BLOG_POSTS } from "@/lib/blog-data";
import { LandingNavbar } from "@/components/klynn/LandingNavbar";
import { motion } from "framer-motion";
import { Calendar, User, ArrowLeft, Share2, MessageCircle, Droplets, Rocket } from "lucide-react";
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
    <div className="min-h-screen bg-background pb-24">
      <style dangerouslySetInnerHTML={{ __html: `
        .blog-content h3 { 
          margin-top: 2.5rem !important; 
          margin-bottom: 1.25rem !important; 
          display: block !important;
          color: hsl(var(--primary)) !important;
          font-weight: 700 !important;
          font-size: 1.5rem !important;
        }
        .blog-content p { 
          margin-bottom: 1.5rem !important; 
          line-height: 1.75 !important;
        }
        .blog-content ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin-bottom: 1.5rem !important;
          display: block !important;
        }
        .blog-content ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin-bottom: 1.5rem !important;
          display: block !important;
        }
        .blog-content li {
          margin-bottom: 1rem !important;
          line-height: 1.75 !important;
        }
        .blog-content li::marker {
          color: hsl(var(--primary)) !important;
        }
        .blog-content li strong {
          color: hsl(var(--foreground)) !important;
        }
      `}} />
      <LandingNavbar />

      
      <article className="mx-auto max-w-3xl px-6 pt-24">
        <header className="mb-12">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Volver al blog
          </Link>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(post.date).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{post.category}</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-display leading-tight mb-8">
            {post.title}
          </h1>

          <div className="flex items-center justify-between border-y border-border py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-white shadow-sm">
                <Droplets className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold">{post.author}</div>
                <div className="text-xs text-muted-foreground">Especialistas en Lavanderías</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="rounded-full h-9 w-9 p-0">
                <Share2 className="h-4 w-4" />
              </Button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Mira este artículo de Klynn: ${post.title} https://klynn.com.do/blog/${post.slug}`)}`} target="_blank">
                <Button variant="ghost" size="sm" className="rounded-full h-9 w-9 p-0 text-emerald-600">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </header>

        <div 
          className="blog-content prose prose-slate prose-lg max-w-none 
          prose-headings:font-display prose-headings:text-foreground
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-strong:text-foreground prose-strong:font-bold
          prose-li:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: post.content }} 
        />

        <section className="mt-20 p-12 rounded-3xl bg-primary text-white text-center shadow-2xl relative overflow-hidden">
          {/* Círculos decorativos de fondo */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-display mb-4">¿Te gustó lo que leíste?</h2>
            <p className="opacity-90 mb-8 max-w-md mx-auto text-lg">
              Klynn te ayuda a aplicar estos consejos y más con tecnología diseñada específicamente para tu lavandería en RD.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/registro">
                <Button variant="secondary" className="font-bold h-12 px-8 gap-2 shadow-lg hover:shadow-xl transition-all">
                  <Rocket className="h-5 w-5" />
                  Probar Klynn Gratis
                </Button>
              </Link>
              <a href="https://wa.link/vxstq4" target="_blank" rel="noreferrer">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none font-bold h-12 px-8 gap-2 shadow-lg hover:shadow-xl transition-all">
                  <MessageCircle className="h-5 w-5" />
                  Hablar con un experto
                </Button>
              </a>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
