import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">AIOSv2 Integration</h1>
      <p className="text-xl text-gray-600 mb-8">Unified Development Platform</p>
      <div className="flex gap-4">
        <Link
          href="/auth/signin"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Sign In
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          Dashboard
        </Link>
      </div>
    </main>
  )
}
