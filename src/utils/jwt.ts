import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'armoredmart-jwt-secret-key-2024';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'armoredmart-refresh-secret-key-2024';

// Token Expiry Configuration (configurable via env)
const ACCESS_TOKEN_EXPIRY_HOURS = parseInt(process.env.ACCESS_TOKEN_EXPIRY_HOURS || '2', 10);
const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7', 10);

export const generateTokens = (userId: string, sessionId?: string) => {
  const payload = { userId, ...(sessionId && { sessionId }) };
  const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: `${ACCESS_TOKEN_EXPIRY_HOURS}h` });
  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` });
  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};
