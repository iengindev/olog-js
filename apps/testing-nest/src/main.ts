import { NestFactory } from '@nestjs/core'
import { OlogService } from '@olog-js/nest'

import { AppModule } from './app.module'

const Start = async (): Promise<void> => {
  const App = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  App.useLogger(App.get(OlogService))
  App.enableShutdownHooks()

  await App.listen(3000)
}

void Start()
