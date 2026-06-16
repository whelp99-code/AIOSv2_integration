import { listLifecycleSummary } from "@/lib/lifecycle/lifecycle-api";

export async function GET() {
  return Response.json({ summary: listLifecycleSummary() });
}
