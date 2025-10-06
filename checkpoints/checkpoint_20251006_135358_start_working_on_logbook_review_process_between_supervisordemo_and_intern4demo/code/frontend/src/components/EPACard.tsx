import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type EPACardProps = {
  code: string
  title: string
  description: string
  milestone?: string
}

export function EPACard({ code, title, description, milestone }: EPACardProps) {
  return (
    <Card className="rounded-card border borderLight bg-backgroundCard shadow-psychpath">
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between">
          <span className="font-headings text-2xl text-textDark">{code}</span>
          {milestone ? (
            <span className="rounded-full bg-accentOrange/10 px-2 py-1 text-xs font-labels text-accentOrange">
              Milestone {milestone}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="font-labels text-sm text-textLight">{title}</div>
          <p className="font-body text-sm text-textDark">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default EPACard


