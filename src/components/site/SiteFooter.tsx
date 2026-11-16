import { site } from '@/config/site'

/** PLACEHOLDER: el agente de "shell" lo sustituye por el pie real. */
export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink bg-ink py-8 text-cream">
      <div className="container-pop">© {new Date().getFullYear()} {site.name}</div>
    </footer>
  )
}
