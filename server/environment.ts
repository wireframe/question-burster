/** Reads server config from an environment with defaults; errors name the variable and never echo its value. */

export interface Environment {
  port: number
  databasePath: string
}

const DEFAULT_PORT = 3001
const DEFAULT_DATABASE_PATH = 'data/question-burst.db'

export function loadEnvironment(env: NodeJS.ProcessEnv): Environment {
  return {
    port: env.PORT ? parsePort(env.PORT) : DEFAULT_PORT,
    databasePath: env.DATABASE_PATH || DEFAULT_DATABASE_PATH,
  }
}

function parsePort(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error('Invalid PORT')
  return Number(value)
}
