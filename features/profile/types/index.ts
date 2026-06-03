export type UserProfile = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  country: string | null;
};

export type ExchangeApiKey = {
  id: string;
  exchange: string;
  apiKeyHint: string; // last 4 chars only — never return full key to client
  createdAt: string;
  updatedAt: string;
};

export type UpsertProfileInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // 'YYYY-MM-DD'
  gender: UserProfile["gender"];
  country: string;
};

export type SaveApiKeyInput = {
  apiKey: string;
  apiSecret: string;
};
