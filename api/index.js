/**
 * Vercel serverless entry — same Express app as local `node server/index.js`.
 * Routes like /api/demo/redeem are rewritten here (see vercel.json).
 */
import app from '../server/index.js'

export default app
