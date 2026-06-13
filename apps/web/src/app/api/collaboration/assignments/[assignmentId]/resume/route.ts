import { POST as executePost } from '../../../execute/route'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await params
  const body = await request.json()

  return executePost(
    new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        ...body,
        resumeAssignmentId: assignmentId,
      }),
    }),
  )
}
