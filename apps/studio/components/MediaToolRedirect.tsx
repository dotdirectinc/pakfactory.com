import { useEffect } from 'react'
import { useWorkspace } from 'sanity'
import { useRouter } from 'sanity/router'

export function MediaToolRedirect() {
  const router = useRouter()
  const { basePath } = useWorkspace()

  useEffect(() => {
    router.navigateUrl({ path: `${basePath}/media`, replace: true })
  }, [router, basePath])

  return (
    <div style={{ padding: '1.5rem', opacity: 0.6, fontSize: 13 }}>
      Opening Media Library…
    </div>
  )
}
