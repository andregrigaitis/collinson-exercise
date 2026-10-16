const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/graphql'

type GraphQLResponse<T> = {
  data?: T
  errors?: { message: string }[]
}

export async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  })
  const body = (await response.json()) as GraphQLResponse<T>
  if (body.errors?.length || !body.data) {
    throw new Error(body.errors?.[0]?.message ?? `Request failed: ${response.status}`)
  }
  return body.data
}
