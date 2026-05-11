// IndexNow verification file. Bing/Yandex fetch /indexnow/<key> and expect the
// key as the response body. We compare against the env-configured key.
import { indexNowKey } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (key !== indexNowKey()) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(key, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  });
}
