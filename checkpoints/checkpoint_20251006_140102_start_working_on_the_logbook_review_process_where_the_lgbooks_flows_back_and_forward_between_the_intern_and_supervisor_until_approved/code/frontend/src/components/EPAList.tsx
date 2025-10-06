import { useEffect, useState } from 'react'
import EPACard from '@/components/EPACard'
import { Link } from 'react-router-dom'
import { API_URL } from '@/lib/api'
import type { EPACardProps } from '@/components/EPACard'

export default function EPAList() {
  const [epas, setEpas] = useState<EPACardProps[]>([])

  useEffect(() => {
    fetch(`${API_URL}/api/epas/`)
      .then((r) => r.json())
      .then((data) => setEpas(data))
      .catch((e) => console.error(e))
  }, [])

  return (
    <section id="epas" className="grid gap-4 md:grid-cols-2">
      {epas.map((e) => (
        <Link key={e.code} to={`/epa/${encodeURIComponent(e.code)}`}>
          <EPACard code={e.code} title={e.title} description={e.description} />
        </Link>
      ))}
    </section>
  )
}


