import { ApEdition, FlowRun, isFailedState, isFlowRunStateTerminal, isNil, RunEnvironment } from '@activepieces/shared'
import dayjs from 'dayjs'
import { FastifyBaseLogger } from 'fastify'
import { system } from '../../helper/system/system'

const paidEditions = [ApEdition.CLOUD, ApEdition.ENTERPRISE].includes(system.getEdition())
export const flowRunHooks = (log: FastifyBaseLogger) => ({
    async onFinish(flowRun: FlowRun): Promise<void> {
        if (!isFlowRunStateTerminal({
            status: flowRun.status,
            ignoreInternalError: true,
        })) {
            return
        }
        if (isFailedState(flowRun.status) && flowRun.environment === RunEnvironment.PRODUCTION && !isNil(flowRun.failedStep?.name)) {
            const date = dayjs(flowRun.created).toISOString()
            const issueToAlert = {
                projectId: flowRun.projectId,
                flowVersionId: flowRun.flowVersionId,
                flowId: flowRun.flowId,
                created: date,
            }

            // CE: No alerts functionality
            if (paidEditions) {
                log.info({ flowRunId: flowRun.id }, '[FlowRunHooks] CE - alerts not supported')
            }
        }
        if (!paidEditions) {
            return
        }
    },
})
