export default defineEventHandler(async (event) => {
  const { id, response, toolCalls, simulateStream } = await readBody(event)
  if (!id || (response === undefined && !toolCalls)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID and response (or toolCalls) are required'
    })
  }

  try {
    resolveRequest(id, response, toolCalls, simulateStream)
    return { success: true }
  } catch (error: any) {
    throw createError({
      statusCode: 404,
      statusMessage: error.message
    })
  }
})
