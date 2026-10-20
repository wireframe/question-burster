import { createSessionRequest } from './api'
import { AppShell } from './components/AppShell'
import { pageColumn, primaryButton } from './components/ui'
import { parseRoute, sessionPath, type Route } from './route'
import { CreateSession } from './screens/CreateSession'
import { SessionScreen } from './screens/SessionScreen'

function goToSession(id: string) {
  location.href = sessionPath(id)
}

export function App() {
  const route = parseRoute(location.pathname)
  return (
    <AppShell showBrand={route.name !== 'session'}>
      <RoutedScreen route={route} />
    </AppShell>
  )
}

function RoutedScreen({ route }: { route: Route }) {
  switch (route.name) {
    case 'create':
      return <div className={pageColumn}><CreateSession createSession={createSessionRequest} onCreated={goToSession} /></div>
    case 'session':
      return <SessionScreen sessionId={route.id} />
    case 'notFound':
      return <NotFound />
  }
}

function NotFound() {
  return (
    <div className={`${pageColumn} space-y-6 py-12 text-center`}>
      <h1 className="text-3xl font-bold">Not found</h1>
      <a href="/" className={primaryButton}>Start a new session</a>
    </div>
  )
}
