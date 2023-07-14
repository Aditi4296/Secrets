//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User",userSchema);

app.get("/",(req,res)=>{
    res.render("home");
});

app.get("/login",(req,res)=>{
    res.render("login");
});

app.get("/register",(req,res)=>{
    res.render("register");
});

app.post("/register",(req,res)=>{

    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        // Store hash in your password DB.
        const newUser = new User({
            email: req.body.username,
            // password: req.body.password
            // password: md5(req.body.password)
            password: hash
        })
        newUser.save().then( () => {
            res.render("secrets");
          }).catch( (err) => {
            console.log('There was an error', e.message);
          });
    });
    
});

app.post("/login",(req,res)=>{
    
    const username = req.body.username;
    const password = req.body.password;
    // const password = md5(req.body.password);

    User.findOne({email: username})
    .then(function(foundUser){
        // if(foundUser){
        //     if(foundUser.password === password){
        //         res.render("secrets");
        //     }
        //     else{
        //         console.log("Wrong password");
        //     }
        // }else{
        //     console.log("User not found");
        // }
        if(foundUser){
            bcrypt.compare(password, foundUser.password).then(function(result) {
                // result == true
                if(result == true)
                {
                    res.render("secrets");
                }
            });
            bcrypt.compare(password, foundUser.password).then(function(result) {
                // result == false
                if(result == false)
                {
                    console.log("Wrong password");
                }
            });
        }
        
        
    })
    .catch(function(err){
        console.log(err);
    });
});


app.listen(3000, function(){
    console.log("Server started on port 3000.");
})