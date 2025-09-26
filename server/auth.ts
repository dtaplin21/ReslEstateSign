import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";

// Environment-aware session configuration for Vercel
const getSessionStore = async () => {
  // Use memory store for now - in production Vercel deployment, 
  // configure with your preferred session store (Redis, etc.)
  return new session.MemoryStore();
};

export async function setupAuth(app: Express): Promise<void> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    store: await getSessionStore(),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialization
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Mock authentication strategy for development/demo
  // In production, replace with proper OAuth, SAML, or other auth providers
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email: string, password: string, done) => {
    try {
      // Mock authentication - in production, verify credentials properly
      // For demo purposes, create/get user based on email
      const userId = `demo_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const newUser = {
        id: userId,
        email,
        firstName: 'Demo',
        lastName: 'User',
      };
      await storage.upsertUser(newUser);
      const user = await storage.getUser(userId);
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  // Auth routes
  app.post('/api/auth/login', passport.authenticate('local'), (req: any, res) => {
    res.json({ 
      success: true, 
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
      }
    });
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  app.get('/api/auth/user', (req: any, res) => {
    if (req.isAuthenticated()) {
      res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        }
      });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};