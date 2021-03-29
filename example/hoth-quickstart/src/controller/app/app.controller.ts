import {Controller, GET, Hook, Inject} from '@hoth/decorators';
import {FastifyReply, FastifyRequest} from 'fastify';
import Calculator from '../../lib/calculator/index.service';

@Controller('/app')
export default class AppController {

    @Inject(Calculator)
    private readonly service!: Calculator;

    @Hook('preHandler')
    async preHandler() {
        console.log('in controller');
    }

    @GET()
    getApp(req: FastifyRequest, reply: FastifyReply) {
        reply.log.info(`config test value ${req.$appConfig.get('test')}`);
        reply.log.error({err: new Error('hello1')});
        reply.log.warn('test error');
        reply.log.addNotice('foo', 'test');
        reply.log.addPerformance('foo', 1.3322);
        console.log(this.service.add(1, 1));
        reply.send('ok');
    }
}
