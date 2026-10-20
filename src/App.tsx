import { createSessionRequest } from './api'
import { parseRoute } from './route'
import { CreateSession } from './screens/CreateSession'
import { SessionScreen } from './screens/SessionScreen'

function goToSession(id: string) {
  location.href = '/s/' + id
}

export function App() {
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
    <>
      <h1>Not found</h1>
      <a href="/">Start a new session</a>
    </>
  )
}
