import { createFileRoute, Link } from "@tanstack/react-router";
import { BLOG_POSTS } from "@/lib/blog-data";
import { LandingNavbar } from "@/components/klynn/LandingNavbar";
import { motion } from "framer-motion";
import { Calendar, User, ArrowRight, BookOpen, Droplets, Rocket, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog de Klynn — Consejos para Lavanderías en RD" },
      { 
        name: "description", 
        content: "Aprende a gestionar mejor tu lavandería con nuestros consejos sobre tecnología, operaciones y finanzas en República Dominicana." 
      }
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      
      <main className="mx-auto max-w-7xl px-6 py-24">
        <header className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary uppercase tracking-widest">
            <BookOpen className="h-3.5 w-3.5" /> Conocimiento para tu negocio
          </div>
          <h1 className="text-4xl md:text-6xl font-display mb-6 text-balance">
            Blog de <span className="text-primary">Klynn</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
            Estrategias, tecnología y consejos prácticos para hacer crecer tu lavandería en República Dominicana.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {BLOG_POSTS.map((post, i) => (
            <Link 
              key={post.slug} 
              to="/blog/$slug" 
              params={{ slug: post.slug }}
              className="block group"
            >
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex h-full flex-col rounded-3xl border border-border bg-surface overflow-hidden shadow-card hover:shadow-elegant transition-all hover:-translate-y-1"
              >
                <div className="p-8 flex flex-col h-full">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(post.date).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{post.category}</span>
                  </div>
                  <h2 className="text-2xl font-display mb-4 group-hover:text-primary transition-colors text-balance">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground mb-6 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center font-bold text-white shadow-sm">
                        <Droplets className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-primary hover:gap-2 transition-all">
                      Leer más <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </motion.article>
            </Link>
          ))}
        </div>

      </main>

      <section className="bg-surface-elevated py-20 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center bg-primary rounded-[2rem] p-12 text-white shadow-2xl relative overflow-hidden">
          {/* Círculos decorativos de fondo */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <h2 className="text-3xl font-display mb-4">¿Te gustó lo que leíste?</h2>
            <p className="text-primary-foreground/90 mb-8 text-lg max-w-2xl mx-auto">
              Klynn te ayuda a aplicar estos consejos y más con tecnología diseñada específicamente para el mercado de lavanderías en RD.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/registro">
                <Button size="lg" variant="secondary" className="font-bold gap-2 px-8 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                  <Rocket className="h-5 w-5" />
                  Probar Klynn Gratis
                </Button>
              </Link>
              <a href="https://wa.link/vxstq4" target="_blank" rel="noreferrer">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white border-none font-bold gap-2 px-8 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                  <MessageCircle className="h-5 w-5" />
                  Hablar con un experto
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
