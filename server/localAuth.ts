import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { User } from "@shared/schema";

export function setupLocalAuth() {
  passport.use(
    "local-signup",
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
        passReqToCallback: true,
      },
      async (req, username, password, done) => {
        try {
          const { email, fullName, firstName, lastName } = req.body;

          if (!username || !password || !email) {
            return done(null, false, { message: "All fields are required" });
          }

          const existingUserByUsername = await storage.getUserByUsername(username);
          if (existingUserByUsername) {
            return done(null, false, { message: "Username already exists" });
          }

          const existingUserByEmail = await storage.getUserByEmail(email);
          if (existingUserByEmail) {
            return done(null, false, { message: "Email already exists" });
          }

          const hashedPassword = await bcrypt.hash(password, 10);

          const newUser = await storage.createLocalUser({
            username,
            email,
            password: hashedPassword,
            fullName,
            firstName,
            lastName,
          });

          return done(null, newUser);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.use(
    "local-login",
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username, password, done) => {
        try {
          const user = await storage.getUserByUsername(username);

          if (!user) {
            return done(null, false, { message: "Invalid username or password" });
          }

          if (!user.password) {
            return done(null, false, { message: "Please use Replit Auth to login" });
          }

          const isValidPassword = await bcrypt.compare(password, user.password);

          if (!isValidPassword) {
            return done(null, false, { message: "Invalid username or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Note: serialization is handled in replitAuth.ts to support both auth methods
}
