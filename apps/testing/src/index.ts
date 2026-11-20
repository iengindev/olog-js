import { Logger, Filter, Enrich, Pretty } from '@olog-js/core'
import { FileTransport } from '@olog-js/transport-file'

const UseLogger = new Logger({
  level: 'debug',
  context: 'app',
  transports: [
    new FileTransport({
      path: 'logs/app.log',
      maxSize: '10MB',
      interval: 'daily',
      maxFiles: 14,
      compress: true,
    }),
    new FileTransport({
      name: 'errors',
      path: 'logs/error.log',
      level: 'error',
      format: Pretty({ colors: false }),
    }),
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
