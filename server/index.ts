/** Starts the server process: configuration from the environment, SQLite persistence, real clock. */
import { createServer } from './app'
import { createSessionRepository, openDatabase } from './db'
import { loadEnvironment } from './environment'
import { systemClock } from './session/clock'

const { port, databasePath } = loadEnvironment(process.env)
const repository = createSessionRepository(openDatabase(databasePath))

createServer({ repository, clock: systemClock }).listen(port, () => {
  console.log(`Question Burst server listening on http://localhost:${port}`)
})
