export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
};

export type JwtPayload = {
  userId: string;
};
