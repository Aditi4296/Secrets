//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "This will be a little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
// mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

//plugins should be when there is mongoose object and not simple javascript object
userSchema.plugin(passportLocalMongoose);     //hash,salt and save in db
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// passport.serializeUser(function(user, done) {
//     done(null, user.id);
//   });
  
//   passport.deserializeUser(async function(id, done) {
//     User.findById(id, function(err, user) {
//         done(err, user);
//       });
//   });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb){
        console.log(profile);
        User.findOrCreate({googleId: profile.id}, function(err,user){
            return cb(err,user);
        });
    }
));

app.get("/",(req,res)=>{
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate("google", {scope: ["profile"]})
);

app.get("/auth/google/secrets",
passport.authenticate("google",{
    // successRedirect: "/secrets",
    failureRedirect: "/login"}),
function(req,res){
    //Successful authentication, redirect home
    res.redirect("/secrets");
}
);



app.get("/login",(req,res)=>{
    res.render("login");
});

app.get("/register",(req,res)=>{
    res.render("register");
});


// app.get("/secrets",(req,res)=>{
//      if(req.isAuthenticated()){
//         res.render("secrets");
//      }else{
//         res.redirect("/login");
//      }
// });

app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}})
    .then(function(foundUsers){
        if (foundUsers) {
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
      })
      .catch(function(err){
            console.log(err);
        });
    });

    
  app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  });
  
  app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
  
  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
    // console.log(req.user.id);
  
    User.findById(req.user.id)
    .then(function(foundUser){
      
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save()
          .then((secret)=>{
            res.redirect("/secrets");
          })
          .catch(function(err){
            console.log(err);
        })
    }
      })
      .catch(function(err){
        console.log(err);
    });
    });

app.get("/logout",(req,res)=>{
    req.logout(function(err) {
        if (err) { return next(err); }
    res.redirect("/");
    });
});


app.post("/register",(req,res)=>{

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     // Store hash in your password DB.
    //     const newUser = new User({
    //         email: req.body.username,
    //         // password: req.body.password
    //         // password: md5(req.body.password)
    //         password: hash
    //     })
    //     newUser.save().then( () => {
    //         res.render("secrets");
    //       }).catch( (err) => {
    //         console.log('There was an error', e.message);
    //       });
    // });

    User.register({username: req.body.username}, req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })
    
});

app.post("/login",(req,res)=>{
    
    // const username = req.body.username;
    // const password = req.body.password;
    // // const password = md5(req.body.password);

    // User.findOne({email: username})
    // .then(function(foundUser){
    //     // if(foundUser){
    //     //     if(foundUser.password === password){
    //     //         res.render("secrets");
    //     //     }
    //     //     else{
    //     //         console.log("Wrong password");
    //     //     }
    //     // }else{
    //     //     console.log("User not found");
    //     // }
    //     if(foundUser){
    //         bcrypt.compare(password, foundUser.password).then(function(result) {
    //             // result == true
    //             if(result == true)
    //             {
    //                 res.render("secrets");
    //             }
    //         });
    //         bcrypt.compare(password, foundUser.password).then(function(result) {
    //             // result == false
    //             if(result == false)
    //             {
    //                 console.log("Wrong password");
    //             }
    //         });
    //     }
        
        
    // })
    // .catch(function(err){
    //     console.log(err);
    // });

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        })
    }})
});


app.listen(3000, function(){
    console.log("Server started on port 3000.");
})