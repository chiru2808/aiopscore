import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { ActivepiecesError, ApId, ErrorCode, FlowTemplate, FlowTriggerType, isNil } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { aiProviderService } from '../../ai/ai-provider-service'
import { z } from 'zod'

const FlowActionSchema = z.object({
    type: z.enum(['CODE', 'PIECE', 'LOOP_ON_ITEMS', 'ROUTER']),
    name: z.string(),
    displayName: z.string(),
    settings: z.record(z.unknown()),
})

const FlowTriggerSchema = z.object({
    type: z.string(),
    name: z.string(),
    displayName: z.string(),
    settings: z.record(z.unknown()),
})

const GeneratedFlowSchema = z.object({
    displayName: z.string(),
    description: z.string(),
    trigger: FlowTriggerSchema,
    actions: z.array(FlowActionSchema),
})

export const aiFlowGeneratorService = {
    async generate({ description, platformId, log }: {
        description: string
        platformId: string
        log: FastifyBaseLogger
    }): Promise<FlowTemplate> {
        // Check if AI provider is configured
        const isConfigured = await aiProviderService.isAgentConfigured()
        if (!isConfigured) {
            throw new ActivepiecesError({
                code: ErrorCode.FEATURE_DISABLED,
                params: {
                    message: 'AI provider is not configured. Please configure an AI provider in settings to use this feature.',
                },
            })
        }

        try {
            const config = await aiProviderService.getConfig('openai', platformId)
            const openai = createOpenAI({
                apiKey: config.apiKey,
            })

            const prompt = buildPrompt(description)

            const model = openai('gpt-4o-mini')

            const result = await generateObject({
                model,
                schema: GeneratedFlowSchema as any,
                prompt,
            })

            return convertToFlowTemplate(result.object)
        }
        catch (error) {
            log.error({ error, description }, 'Failed to generate flow with AI')
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Failed to generate workflow. Please try a more specific description or check your AI provider configuration.',
                },
            })
        }
    },
}

function buildPrompt(description: string): string {
    return `You are an expert workflow automation assistant for Activepieces, similar to Zapier or Make.com.

Generate a complete workflow based on the following description:
"${description}"

Guidelines:
1. The trigger should be one of: WEBHOOK, PIECE_TRIGGER, SCHEDULE, EMPTY
2. For WEBHOOK triggers, use type: "WEBHOOK", settings should include empty object
3. For SCHEDULE triggers (recurring tasks), use type: "SCHEDULE", settings should include cronExpression
4. For PIECE_TRIGGER (app-specific triggers like "New Email" or "New Row"), use type: "PIECE_TRIGGER"
5. For simpler flows or testing, use type: "EMPTY"

6. Actions can be:
   - PIECE: Integration with apps (e.g., "Send Email", "Add Row to Google Sheets", "Post to Slack")
   - CODE: Custom JavaScript code
   - ROUTER: Conditional branching based on data
   - LOOP_ON_ITEMS: Iterate over arrays

7. For PIECE actions, include:
   - pieceName: The app/service name (e.g., "gmail", "slack", "google-sheets")
   - actionName: The specific action (e.g., "send_email", "send_message")
   - input: Object with required fields for that action

8. Keep it simple and practical. Focus on common use cases.
9. Use clear, descriptive names for steps.

Example for "Send email when webhook receives data":
{
  "displayName": "Webhook to Email",
  "description": "Sends an email notification when a webhook receives data",
  "trigger": {
    "type": "WEBHOOK",
    "name": "webhook_trigger",
    "displayName": "Webhook Trigger",
    "settings": {}
  },
  "actions": [
    {
      "type": "PIECE",
      "name": "send_email",
      "displayName": "Send Email",
      "settings": {
        "pieceName": "gmail",
        "actionName": "send_email",
        "input": {
          "to": "{{webhook_trigger.body.email}}",
          "subject": "New Webhook Received",
          "body": "Data: {{webhook_trigger.body}}"
        }
      }
    }
  ]
}

Now generate a workflow for the user's description.`
}

function convertToFlowTemplate(generated: z.infer<typeof GeneratedFlowSchema>): FlowTemplate {
    // Build the action chain
    let firstAction: any = null
    let currentAction: any = null

    generated.actions.forEach((action, index) => {
        const actionNode: any = {
            name: action.name || `step_${index + 1}`,
            displayName: action.displayName,
            type: action.type,
            valid: false, // User will need to configure
            settings: action.settings,
        }

        if (!firstAction) {
            firstAction = actionNode
            currentAction = actionNode
        }
        else {
            currentAction.nextAction = actionNode
            currentAction = actionNode
        }
    })

    const trigger: any = {
        name: generated.trigger.name || 'trigger',
        displayName: generated.trigger.displayName,
        type: generated.trigger.type as FlowTriggerType,
        valid: false,
        settings: generated.trigger.settings,
        nextAction: firstAction,
    }

    return {
        name: generated.displayName,
        description: generated.description,
        tags: [],
        pieces: [],
        schemaVersion: null,
        template: {
            trigger,
            displayName: generated.displayName,
            valid: false,
            schemaVersion: null,
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        metadata: null,
    } as any
}
