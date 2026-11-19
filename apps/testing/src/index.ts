import { Logger, Filter, Enrich } from '@olog-js/core'

const UseLogger = new Logger({
  level: 'debug',
  context: 'app',
  transports: [
  ],
  processors: [
    Filter((r) => r.context !== 'healthcheck'),
    Enrich(() => ({
      pid: 123,
    })),
  ],
  redact: {
    keys: ['card'],
  },
})

UseLogger.info('Success run project', {
  port: '3000',
})

const DB = UseLogger.child({
  context: 'db',
  meta: {
    pool: 'main',
  },
})

DB.info('Connect to DB ', {
  host: 'postgre://127.0.0.1:5432/test',
  card: '123456789',
})

try {
  throw new Error('Fail load data')
} catch(err) {
  DB.error('Query failed', {
    error: err,
  })
}

await UseLogger.close()
