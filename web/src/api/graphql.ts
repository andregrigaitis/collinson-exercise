const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/graphql'

type GraphQLResponse<T> = {
  data?: T
  errors?: { message: string; extensions?: { code?: string } }[]
}

/** A failed request. `code` is the GraphQL `extensions.code`, if the server sent one. */
export class GraphQLRequestError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'GraphQLRequestError'
    this.code = code
  }
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
    const error = body.errors?.[0]
    throw new GraphQLRequestError(
      error?.message ?? `Request failed: ${response.status}`,
      error?.extensions?.code,
    )
  }
  return body.data
}
