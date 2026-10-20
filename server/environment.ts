interface Environment {
  port: number
  databasePath: string
  anthropicApiKey: string
}

const DEFAULT_PORT = 3001
const DEFAULT_DATABASE_PATH = 'data/question-burst.db'

export function loadEnvironment(env: NodeJS.ProcessEnv): Environment {
  return {
    port: env.PORT ? parsePort(env.PORT) : DEFAULT_PORT,
    databasePath: env.DATABASE_PATH || DEFAULT_DATABASE_PATH,
    anthropicApiKey: required(env, 'ANTHROPIC_API_KEY'),
  }
}

function parsePort(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error('Invalid PORT')
  return Number(value)
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (!value) throw new Error(`Missing required environment variable ${name}`)
  return value
}
