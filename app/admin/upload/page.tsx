import { UploadForm } from "@/components/upload-form"
import { redirect } from "next/navigation"
import { createClient as createServerClient } from "@/lib/supabase/server"

export default async function AdminUploadPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <header className="mb-6">
        <h1 className="text-balance text-2xl font-semibold">Upload New Product Image</h1>
      </header>

      <section>
        <UploadForm />
      </section>
    </main>
  )
}
