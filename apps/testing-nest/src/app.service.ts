import { Injectable } from '@nestjs/common'
import { OlogLogger, SetRequestMeta } from '@olog-js/nest'

@Injectable()
export class AppService {
  constructor(private readonly logger: OlogLogger) {}

  findOne(id: string): void {
    SetRequestMeta({ userId: id })
    this.logger.info('Loading user', { id })
  }
}
