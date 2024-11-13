export type ApiCredentials = {
  username: string;
  password: string;
};

export async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit = {},
  providedCredentials?: ApiCredentials
) {
  if (!providedCredentials) throw new Error("No API credentials found");

  const { username, password } = providedCredentials;
  const headers = new Headers(options.headers);
  headers.set("Authorization", "Basic " + btoa(`${username}:${password}`));

  return fetch(endpoint, {
    ...options,
    headers,
  });
}
