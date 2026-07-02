type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
  statusText?: string;
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_NOT_FOUND:
    "No encontramos una cuenta con esos datos. Revisa el correo o inicia con Google si ese fue tu primer método.",
  CREDENTIAL_ACCOUNT_NOT_FOUND:
    "Esta cuenta todavía no tiene contraseña. Inicia con Google y crea una contraseña desde Perfil.",
  INVALID_EMAIL_OR_PASSWORD: "Correo o contraseña incorrectos.",
  INVALID_PASSWORD: "La contraseña actual no es correcta.",
  INVALID_OTP: "Código incorrecto o expirado. Intenta de nuevo.",
  INVALID_TOKEN: "Código incorrecto o expirado. Intenta de nuevo.",
  OTP_EXPIRED: "El código expiró. Puedes pedir uno nuevo e intentarlo otra vez.",
  LINKED_ACCOUNT_ALREADY_EXISTS: "Google ya esta conectado a otra cuenta.",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "Google ya esta conectado a esta cuenta.",
  USER_ALREADY_EXISTS:
    "Ya existe una cuenta con este correo. Inicia sesión con tu método actual y conéctalo desde Perfil.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Ya existe una cuenta con este correo. Inicia sesión con tu método actual y conéctalo desde Perfil.",
};

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function extractAuthError(error: unknown): AuthErrorLike {
  if (!error || typeof error !== "object") return {};

  const candidate = error as Record<string, unknown>;
  const nested =
    candidate.error && typeof candidate.error === "object"
      ? (candidate.error as Record<string, unknown>)
      : candidate;

  return {
    code: typeof nested.code === "string" ? nested.code : undefined,
    message: typeof nested.message === "string" ? nested.message : undefined,
    status: typeof nested.status === "number" ? nested.status : undefined,
    statusText:
      typeof nested.statusText === "string" ? nested.statusText : undefined,
  };
}

export function getAuthErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la operación. Intenta de nuevo.",
) {
  const { code, message, status, statusText } = extractAuthError(error);

  if (code) {
    const mapped = AUTH_ERROR_MESSAGES[normalizeCode(code)];
    if (mapped) return mapped;
  }

  if (message) {
    const mapped = AUTH_ERROR_MESSAGES[normalizeCode(message)];
    if (mapped) return mapped;
    return message;
  }

  if (status === 401) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (status === 409) {
    return "Ese método ya está asociado a una cuenta. Inicia sesión con el método original y conéctalo desde Perfil.";
  }
  if (statusText) return statusText;

  return fallback;
}
