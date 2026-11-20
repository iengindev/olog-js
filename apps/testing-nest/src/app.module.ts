import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { OlogModule } from '@olog-js/nest'
import { FileTransport } from '@olog-js/transport-file'

import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    OlogModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        level: config.get('LOG_LEVEL', 'info'),
        transports: [new FileTransport({ path: 'logs/app.log', interval: 'daily', maxFiles: 14 })],
        http: {
          exclude: ['health'],
        },
      }),
    }),
  ],
  controllers: [
    AppController,
  ],
  providers: [
    AppService,
  ],
})

export class AppModule {}
