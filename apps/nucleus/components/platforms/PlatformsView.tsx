'use client'

import { PlatformRow } from '@/lib/supabase/platforms'

type Props = {
  platforms: PlatformRow[]
}

export function PlatformsView({ platforms }: Props) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Platforms</h1>
        <p className="mt-1 text-sm text-gray-500">
          Technology-owned platform groups
        </p>
      </div>

      {platforms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
          <p className="text-sm font-medium text-gray-700">
            No platforms configured yet.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Platforms will appear here once they have been added by an
            administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {platforms.map((platform) => (
            <div
              key={platform.platform_id}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-gray-900">
                  {platform.platform_name}
                </h2>
                <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500">
                  {platform.platform_code}
                </span>
              </div>
              {platform.platform_description && (
                <p className="mt-2 text-sm text-gray-600">
                  {platform.platform_description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
