import { createSessionRequest } from './api'
import { AppShell } from './components/AppShell'
import { primaryButton } from './components/ui'
import { parseRoute } from './route'
import { CreateSession } from './screens/CreateSession'
import { SessionScreen } from './screens/SessionScreen'

function goToSession(id: string) {
  location.href = '/s/' + id
}

export function App() {
  return (
    <AppShell>
      <RoutedScreen />
    </AppShell>
  )
}

function RoutedScreen() {
  const route = parseRoute(location.pathname)
  switch (route.name) {
    case 'create':
      return <CreateSession createSession={createSessionRequest} onCreated={goToSession} />
    case 'session':
      return <SessionScreen sessionId={route.id} />
    case 'notFound':
      return <NotFound />
  }
}

function NotFound() {
  return (
    <div className="space-y-6 py-12 text-center">
      <h1 className="text-3xl font-bold">Not found</h1>
      <a href="/" className={primaryButton}>Start a new session</a>
    </div>
  )
}
