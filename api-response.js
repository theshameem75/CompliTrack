export function apiResponseMessage(response, fallback = "Request completed successfully.") {
  if (!response) return fallback;
  const candidates = [response.message, response.Message, response.data?.message, response.data?.Message, response.error_description, response.errorDescription, response.statusText];
  const message = candidates.find((value) => typeof value === "string" && value.trim());
  return message?.trim() || fallback;
}

export function apiErrorMessage(error, fallback = "Request failed.") {
  const body = error?.body || error?.response || error;
  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors.map((item) => item?.message || item?.Message || String(item)).join("; ");
  }
  return apiResponseMessage(body, error?.message || fallback);
}
