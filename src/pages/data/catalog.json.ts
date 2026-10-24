import { clientCatalog } from '../../lib/catalog';

// Product list for search, the bag and the wishlist.
export function GET() {
  return new Response(JSON.stringify(clientCatalog()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
