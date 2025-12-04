import dotenv from 'dotenv'
dotenv.config();

export const GITHUB_API_KEY = process.env.GITHUB_API_KEY 
export const GITHUB_APP_ID = process.env.GITHUB_APP_ID
export const NEON_CONNECTION_STRING = process.env.NEON_CONNECTION_STRING
export const AUTH_API_KEY = process.env.AUTH_API_KEY
export const TEST_MODE = process.env.TEST_MODE === 'true' 
export const MAX_USERS_PER_REQUEST = 1000
