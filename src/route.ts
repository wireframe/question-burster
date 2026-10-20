export type Route = { name: 'create' } | { name: 'session'; id: string } | { name: 'notFound' }

const SESSION_PATH = /^\/s\/([^/]+)$/

export function parseRoute(pathname: string): Route {
  if (pathname === '/') return { name: 'create' }
  const sessionMatch = SESSION_PATH.exec(pathname)
  return sessionMatch ? { name: 'session', id: sessionMatch[1] } : { name: 'notFound' }
}
