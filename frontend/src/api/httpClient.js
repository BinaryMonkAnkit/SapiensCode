// src/api/httpClient.js
import { HTTP_BASE_URL } from '../config/env';

export async function httpClient(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const { stream = false, body, headers, ...fetchOptions } = options;

  // Format body cleanly: Stringify objects, but leave strings as-is
  let formattedBody = body;
  if (body && typeof body === 'object') {
    formattedBody = JSON.stringify(body);
  }

  const response = await fetch(`${HTTP_BASE_URL}${cleanEndpoint}`, {
    method: fetchOptions.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...fetchOptions,
    body: formattedBody,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Server Error (${response.status}): ${errorText || response.statusText}`);
  }

  // If streaming, return the raw response immediately so getReader() can hook into response.body
  if (stream) {
    return response;
  }

  return response.json();
}