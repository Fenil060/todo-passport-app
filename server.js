const express = require("express");
const app = express();
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const flash = require('connect-flash');
const User = require('./models/user.js');
const Todo = require('./models/todo.js');
const path = require('path');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/auth-app')
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB connection error:", err));

// Session config
app.use(session({
  secret: "mysupersecretcode",
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));

app.use(flash());

// Passport setup
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Flash + current user middleware
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.user;
  next();
});

// ================= MIDDLEWARE =================
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  req.flash('error', 'You must be logged in first!');
  res.redirect("/login");
};

// ================= ROUTES =================

// Home
app.get("/", (req, res) => {
  res.render("home");
});

// Signup
app.get("/signup", (req, res) => res.render("signup"));
app.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const newUser = new User({ username, email });
    const registeredUser = await User.register(newUser, password);
    req.login(registeredUser, err => {
      if (err) return next(err);
      req.flash('success', 'Welcome to Wanderlust!');
      res.redirect("/todos");
    });
  } catch (e) {
    req.flash('error', e.message);
    res.redirect("/signup");
  }
});

// Login
app.get("/login", (req, res) => res.render("login"));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
        // Send a response indicating user doesn't exist
        return res.render('login', { error: "User does not exist. Please sign up." });
    }

    // If user exists, check password...
});

// Logout
app.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash('success', "Logged out successfully!");
    res.redirect("/login");
  });
});

// ================= TODOS ROUTES =================

// List todos
app.get("/todos", isLoggedIn, async (req, res) => {
  const todos = await Todo.find({ user: req.user._id });
  res.render("todos", { user: req.user, todos });
});

// Add todo
app.post("/todos", isLoggedIn, async (req, res) => {
  const { text } = req.body;
  await Todo.create({ text, user: req.user._id });
  req.flash('success', "Todo added!");
  res.redirect("/todos");
});

// Mark todo complete
app.post("/todos/:id/complete", isLoggedIn, async (req, res) => {
  await Todo.findByIdAndUpdate(req.params.id, { completed: true });
  req.flash('success', "Todo completed!");
  res.redirect("/todos");
});

// Delete todo
app.post("/todos/:id/delete", isLoggedIn, async (req, res) => {
  await Todo.findByIdAndDelete(req.params.id);
  req.flash('success', "Todo deleted!");
  res.redirect("/todos");
});

// ============================================

app.listen(8080, () => {
  console.log("Server running at http://localhost:8080");
});

