// AIOS v1 Proxy Handler
// Proxies requests to the legacy AIOS v1 system

const AIOS_V1_BASE_URL = process.env.AIOS_V1_URL || "http://localhost:3101";

export interface ProxyRequest {
  method: string;
  path: string;
  body?: any;
  headers?: Record<string, string>;
}

export interface ProxyResponse {
  status: number;
  data: any;
  headers?: Record<string, string>;
}

export async function proxyToAIOSv1(request: ProxyRequest): Promise<ProxyResponse> {
  const { method, path, body, headers = {} } = request;
  
  try {
    const response = await fetch(`${AIOS_V1_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    return {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    console.error("AIOS v1 proxy error:", error);
    return {
      status: 500,
      data: { error: "Failed to proxy request to AIOS v1" },
    };
  }
}

export function getAIOSv1Url(): string {
  return AIOS_V1_BASE_URL;
}
