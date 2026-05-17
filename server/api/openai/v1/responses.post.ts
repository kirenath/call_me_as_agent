export default defineEventHandler(async (event) => {
  const settings = getSettings()
  if (settings.enableApiKeyAuth) {
    const authHeader = getHeader(event, 'authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (token !== settings.apiKey) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: Invalid API Key'
      })
    }
  }

  const body = await readBody(event)
  console.log('[OpenAI Responses] Received request:', body)

  const requestId = Math.random().toString(36).substring(2, 15)
  const now = Math.floor(Date.now() / 1000)

  // Token counting
  let promptTokens = 0
  let completionTokens = 0
  const estimateTokens = (obj: any) => Math.ceil(JSON.stringify(obj).length / 3)
  promptTokens = estimateTokens(body.input || body.instructions)

  const request = await addRequest('openai-responses', body)

  if (body.stream) {
    setResponseHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    })
    event.node.res.flushHeaders()

    const sendEvent = (eventName: string, data: any) => {
      if (!event.node.res.writableEnded) {
        event.node.res.write(`event: ${eventName}\ndata: ${JSON.stringify({ type: eventName, ...data })}\n\n`)
      }
    }

    // 1. Send response.created
    sendEvent('response.created', {
      response: {
        id: `resp_${requestId}`,
        object: 'response',
        created: now,
        model: body.model || 'gpt-4o',
        status: 'in_progress'
      }
    })

    // Setup keep-alive
    const keepAliveTimer = setInterval(() => {
      if (!event.node.res.writableEnded) {
        event.node.res.write(': keep-alive\n\n')
      }
    }, (settings.keepAliveInterval || 15) * 1000)

    let outputIndex = 0

    return new Promise<void>((resolve) => {
      request.onData = async (chunk) => {
        const speed = chunk.simulateStream ? (settings.streamSpeed || 30) : 0
        const itemId = `item_${Math.random().toString(36).substring(2, 9)}`

        // Handle Content
        if (chunk.content) {
          const content = chunk.content
          completionTokens += Math.ceil(content.length / 3)

          sendEvent('response.output_item.added', {
            response_id: `resp_${requestId}`,
            output_index: outputIndex,
            item: { id: itemId, type: 'message', role: 'assistant', content: [] }
          })

          if (speed === 0) {
            sendEvent('response.output_text.delta', {
              response_id: `resp_${requestId}`,
              item_id: itemId,
              output_index: outputIndex,
              content_index: 0,
              delta: content
            })
          } else {
            for (let i = 0; i < content.length; i++) {
              sendEvent('response.output_text.delta', {
                response_id: `resp_${requestId}`,
                item_id: itemId,
                output_index: outputIndex,
                content_index: 0,
                delta: content[i]
              })
              await new Promise(r => setTimeout(r, speed))
            }
          }

          sendEvent('response.output_text.done', {
            response_id: `resp_${requestId}`,
            item_id: itemId,
            output_index: outputIndex,
            content_index: 0,
            text: content
          })
          sendEvent('response.output_item.done', {
            response_id: `resp_${requestId}`,
            output_index: outputIndex,
            item: { id: itemId, type: 'message', role: 'assistant', content: [{ type: 'text', text: content }] }
          })
          outputIndex++
        }

        // Handle Tool Calls
        if (chunk.toolCalls && chunk.toolCalls.length > 0) {
          chunk.toolCalls.forEach((tc) => {
            const tcItemId = tc.id || `item_tc_${Math.random().toString(36).substring(2, 7)}`
            const toolName = tc.function?.name || (tc as any).name
            const formattedArgs = typeof tc.function?.arguments === 'string' ? tc.function.arguments : JSON.stringify(tc.function?.arguments || (tc as any).input || {})
            
            completionTokens += Math.ceil(formattedArgs.length / 3)

            sendEvent('response.output_item.added', {
              response_id: `resp_${requestId}`,
              output_index: outputIndex,
              item: { id: tcItemId, type: 'function_call', name: toolName, arguments: '' }
            })
            sendEvent('response.function_call_arguments.delta', {
              response_id: `resp_${requestId}`,
              item_id: tcItemId,
              output_index: outputIndex,
              delta: formattedArgs
            })
            sendEvent('response.function_call_arguments.done', {
              response_id: `resp_${requestId}`,
              item_id: tcItemId,
              output_index: outputIndex,
              arguments: formattedArgs
            })
            sendEvent('response.output_item.done', {
              response_id: `resp_${requestId}`,
              output_index: outputIndex,
              item: { id: tcItemId, type: 'function_call', name: toolName, arguments: formattedArgs }
            })
            outputIndex++
          })
        }

        if (chunk.isFinal) {
          clearInterval(keepAliveTimer)
          // Send response.completion
          sendEvent('response.completion', {
            response_id: `resp_${requestId}`,
            status: 'completed'
          })
          // Send response.done with dummy final output array (stateless server won't buffer everything easily)
          sendEvent('response.done', {
            response: {
              id: `resp_${requestId}`,
              object: 'response',
              status: 'completed',
              output: [], 
              usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens }
            }
          })
          event.node.res.write('data: [DONE]\n\n')
          event.node.res.end()
          resolve()
        }
      }

      event.node.req.on('close', () => {
        clearInterval(keepAliveTimer)
        finishRequest(request.id)
        resolve()
      })
    })
  } else {
    // Non-streaming: Wait for final
    return new Promise((resolve) => {
      const finalOutput: any[] = []
      request.onData = (chunk) => {
        if (chunk.content) {
          completionTokens += Math.ceil(chunk.content.length / 3)
          finalOutput.push({ id: `item_${Math.random().toString(36).substring(2, 7)}`, type: 'message', role: 'assistant', content: chunk.content })
        }
        if (chunk.toolCalls) {
          chunk.toolCalls.forEach(tc => {
            const formattedArgs = typeof tc.function?.arguments === 'string' ? tc.function.arguments : JSON.stringify(tc.function?.arguments || (tc as any).input || {})
            completionTokens += Math.ceil(formattedArgs.length / 3)
            finalOutput.push({ id: tc.id || `item_tc_${Math.random().toString(36).substring(2, 7)}`, type: 'function_call', name: tc.function?.name || (tc as any).name, arguments: formattedArgs })
          })
        }
        if (chunk.isFinal) {
          resolve({
            id: `resp_${requestId}`,
            object: 'response',
            created: now,
            model: body.model || 'gpt-4o',
            status: 'completed',
            output: finalOutput,
            usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens }
          })
        }
      }
    })
  }
})
