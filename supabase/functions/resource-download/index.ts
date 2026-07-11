import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, rgb, degrees, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1?target=deno"

// Serves a resource file to an APPROVED member, stamping PDFs with a personal
// watermark (name · email · date) on every page as a leak deterrent. Restricted
// resources additionally require an approved access request. Non-PDF files are
// streamed back unchanged (still gated). The private bucket is never exposed.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
const err = (msg: string, status = 400) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { ...cors, "Content-Type": "application/json" } })

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const URL = Deno.env.get("SUPABASE_URL") ?? ""
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    const authClient = createClient(URL, ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    })
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return err("Not signed in", 401)

    const svc = createClient(URL, SERVICE)
    const { data: prof } = await svc.from("profiles").select("approved, is_admin, full_name").eq("id", user.id).single()
    const approved = prof?.approved || prof?.is_admin
    if (!approved) return err("Membership not approved", 403)

    const { resource_id } = await req.json()
    const { data: res } = await svc.from("resources").select("title, file_path, is_restricted").eq("id", resource_id).single()
    if (!res || !res.file_path) return err("Resource not found", 404)

    // restricted files require an approved access request (admins bypass)
    if (res.is_restricted && !prof?.is_admin) {
      const { data: rq } = await svc.from("resource_requests")
        .select("id").eq("resource_id", String(resource_id)).eq("requester_id", user.id).eq("status", "approved").limit(1)
      if (!rq || rq.length === 0) return err("Access to this restricted file has not been approved", 403)
    }

    const { data: blob, error: dlErr } = await svc.storage.from("resources").download(res.file_path)
    if (dlErr || !blob) return err("File unavailable", 404)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const isPdf = res.file_path.toLowerCase().endsWith(".pdf") || (blob.type || "").includes("pdf")

    const nameFromFile = res.file_path.split("/").pop() || "resource"
    const safeName = (res.title || nameFromFile).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 80)

    if (!isPdf) {
      return new Response(bytes, {
        headers: { ...cors, "Content-Type": blob.type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${safeName}"` },
      })
    }

    // stamp every page
    const who = (prof?.full_name || user.email || "member").toString()
    const stamp = `${who} · ${user.email ?? ""} · ${new Date().toISOString().slice(0, 10)}`
    const pdf = await PDFDocument.load(bytes)
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize()
      // diagonal, faint, across the middle
      page.drawText(stamp, {
        x: width * 0.08, y: height * 0.42, size: Math.max(12, Math.min(24, width / 28)),
        font, color: rgb(0.6, 0.6, 0.6), opacity: 0.22, rotate: degrees(30),
      })
      // footer line
      page.drawText(`ImaarishaSRHR — confidential · issued to ${stamp} · do not distribute`, {
        x: 24, y: 14, size: 7, font, color: rgb(0.5, 0.5, 0.5), opacity: 0.6,
      })
    }
    const out = await pdf.save()
    return new Response(out, {
      headers: { ...cors, "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName.replace(/\.pdf$/i, "")}.pdf"` },
    })
  } catch (e) {
    return err(String(e), 500)
  }
})
