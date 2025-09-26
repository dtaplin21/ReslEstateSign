import { registerRoutes } from '../server/routes';
import express from 'express';

const app = express();

// Initialize routes once
let isInitialized = false;

export default async function handler(req: any, res: any) {
  if (!isInitialized) {
    await registerRoutes(app);
    isInitialized = true;
  }
  
  return app(req, res);
}