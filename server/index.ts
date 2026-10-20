import { createClaudeLlm } from './ai/claude-client'
import { groupQuestions, type GroupingInput } from './ai/group-questions'
import { createServer } from './app'
import { createSessionRepository, openDatabase } from './db'
import { loadEnvironment } from './environment'
import { systemClock } from './session/clock'

const { port, databasePath, anthropicApiKey } = loadEnvironment(process.env)
const repository = createSessionRepository(openDatabase(databasePath))
const llm = createClaudeLlm({ apiKey: anthropicApiKey })
const group = (input: GroupingInput) => groupQuestions(llm, input)

createServer({ repository, clock: systemClock, group }).listen(port, () => {
  console.log(`Question Burst server listening on http://localhost:${port}`)
})
