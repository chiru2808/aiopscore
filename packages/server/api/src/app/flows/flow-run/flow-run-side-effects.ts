
import {
    FlowRun,
    isFlowRunStateTerminal,
} from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { eventsHooks } from '../../helper/application-events'
import { flowRunHooks } from './flow-run-hooks'

export const flowRunSideEffects = (log: FastifyBaseLogger) => ({
    async onFinish(flowRun: FlowRun): Promise<void> {
        if (!isFlowRunStateTerminal({
            status: flowRun.status,
            ignoreInternalError: true,
        })) {
            return
        }
        await flowRunHooks(log).onFinish(flowRun)

    },
    async onResume(flowRun: FlowRun): Promise<void> {

    },
    async onStart(flowRun: FlowRun): Promise<void> {
       

    },
})

