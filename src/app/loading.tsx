// src/app/loading.tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="h-9 w-64" />
      <div className="mt-6 grid gap-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex-row items-center gap-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-40" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}