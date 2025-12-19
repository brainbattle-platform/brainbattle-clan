export type MessagingUser = {
  id: string;
  roles: string[];
};

export type AccessTokenPayload = {
  sub: string;
  roles?: string[];
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
};
