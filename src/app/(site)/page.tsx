import { site } from '@/config/site'

export default function HomePage() {
  return (
    <div className="container-pop py-20">
      <h1 className="text-5xl">{site.name}</h1>
      <p className="mt-4 text-xl">{site.tagline}</p>
    </div>
  )
}
