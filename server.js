var bodyParser = require('body-parser')
var mongoose = require('mongoose')
var bcrypt = require('bcryptjs')
var express = require('express')
var sessions = require("client-sessions")

var app = express()
app.use(express.static('./public'))

// sessions middleware
var sessionsMiddleware = sessions({
    cookieName: 'auth-cookie',  // front-end cookie name
    secret: 'DR@G0N$',        // the encryption password : keep this safe
    requestKey: 'session',    // we can access our sessions at req.session,
    duration: (86400 * 1000) * 7, // one week in milliseconds
    cookie: {
        ephemeral: false,     // when true, cookie expires when browser is closed
        httpOnly: true,       // when true, the cookie is not accesbile via front-end JavaScript
        secure: false         // when true, cookie will only be read when sent over HTTPS
    }
}) // encrypted cookies!
app.use(sessionsMiddleware)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

/** Database setup **/
mongoose.connect('mongodb://localhost/jail', function(err) {
    if( err ) {
        console.error('Could not connect to the Mongo Jailhouse!')
    } else {
        console.info("Connected to the Jailhouse!")
    }
})

var User = mongoose.model('user', mongoose.Schema({
    username : { type: String, required: true, unique: true },
    password : { type: String, required: true },
    role     : { type: String, required: true }
}))

/*
app.get('/example', protected, function(req, res){ res.send('example') })

function protected(req, res, next) {
    if( req.session.user.role === 'someRole' ) {
        // do something and call next()
    } else {
        // send down a forbidden response (status code 403)
    }
}
*/

function checkIfLoggedIn(req, res, next) {
    if( req.session.uid ) {
        console.log("user is logged in")
        next()
    } else {
        console.warn('not logged in!')
        res.status(403).send("failed to log in")
    }
}

function checkIfLoggedInForAjax(req, res, next){
    console.log('session? ', req.session)
    if ( req.session.uid ) {
        console.log("user is logged in")
        next()
    }
    else {
        console.log("not logged in")
        res.send({failure:'not logged in'})
    }
}

// return session object (if logged out will be empty {})
app.use(function(req, res, next){
    console.log('session? if {} then logged out:', req.session)
    next()
})

app.get('/dashboard', checkIfLoggedIn, function(req, res){
    User.findOne({_id: req.session.uid}, function(err, user){
        if ( user ) {
            res.send(`Hello, ${user.username}. Welcome to your dashboard!
                <a href="/logout">Log Out</a>
            `)
        }
        else {
            res.send("you don't belong here!")
        }
    })
})

// login page
app.get('/', function(req, res){
    res.sendFile('./html/login.html', {root:'./public'})
    console.log('login page')
})

// jail
app.get('/jail', function(req, res, next){
    res.sendFile('./html/jail.html', {root:'./public'})
    console.log('in jail')
})

// lobby = warden, guard, visitor
app.get('/lobby', function(req, res, next){
    User.findOne({_id: req.session.uid}, function(err, user){
        if( user.role !== 'warden' && user.role !== 'guard' && user.role !== 'visitor' ) {
            res.send(403, `<h2>Trying to enter the Lobby, but you are not a warden, guard, or vistor!</h2>`)
            next()
        } else {
            res.sendFile('./html/lobby.html', {root:'./public'})
            console.log(`in lobby`)
        }
    })
})

// visitor's lounge = warden, guard, visitor
app.get('/visitors-lounge', function(req, res, next){
    User.findOne({_id: req.session.uid}, function(err, user){
        if( user.role !== 'warden' && user.role !== 'guard' && user.role !== 'visitor' ) {
            res.send(403, `<h2>Trying to enter the Vistor's Lounge, but you are not a warden, guard, or vistor!</h2>`)
            next()
        } else {
            res.sendFile('./html/visitors-lounge.html', {root:'./public'})
            console.log(`in vistor's lounge`)
        }
    })
})

// cafeteria = warden, guard, prisoner
app.get('/cafeteria', function(req, res, next){
    User.findOne({_id: req.session.uid}, function(err, user){
        if( user.role !== 'warden' && user.role !== 'guard' && user.role !== 'prisoner' ) {
            res.send(403, `<h2>Trying to enter the Cafeteria, but you are not a warden, guard, or prisoner!</h2>`)
            next()
        } else {
            res.sendFile('./html/cafeteria.html', {root:'./public'})
            console.log(`in cafeteria`)
        }
    })
})

// warden's office = warden
app.get('/wardens-office', function(req, res, next){
    User.findOne({_id: req.session.uid}, function(err, user){
        if( user.role !== 'warden' ) {
            res.send(403, `<h2>Trying to enter the Warden's Office, but you are not a warden!</h2>`)
            next()
        } else {
            res.sendFile('./html/wardens-office.html', {root:'./public'})
            console.log(`in warden's office`)
        }
    })
})

// eve's cell = warden, guard, eve
app.get('/cell-e', function(req, res, next){
    User.findOne({_id: req.session.uid}, function(err, user){
        if( user.role !== 'warden' && user.role !== 'guard' && user.username !== 'eve' ) {
            res.send(403, `<h2>Trying to enter Eve's cell, but you are not a warden, guard, or Eve!</h2>`)
            next()
        } else {
            res.sendFile('./html/cell-e.html', {root:'./public'})
            console.log(`in eve's cell`)
        }
    })
})

//  mallory's cell = warden, guard, mallory
app.get('/cell-m', function(req, res, next){
    User.findOne({_id: req.session.uid}, function(err, user){
        if( user.role !== 'warden' && user.role !== 'guard' && user.username !== 'mallory' ) {
            res.send(403, `<h2>Trying to enter Mallory's cell, but you are not a warden, guard, or Mallory!</h2>`)
            next()
        } else {
            res.sendFile('./html/cell-m.html', {root:'./public'})
            console.log(`in mallory's cell`)
        }
    })
})

// user info
app.get('/me', checkIfLoggedInForAjax, function(req, res){
    User.findOne({_id: req.session.uid},
    function(err, user){
        res.send(user)
    })
})

// logout
app.get('/logout', function(req, res){
    req.session.reset()
    res.redirect('/')
})

app.post('/login', function(req, res) { // form post submission
    console.info('auth.login.payload:', req.body)

    User.findOne({ username: req.body.username }, function(err, user) {
        if( err) {
            console.log('MongoDB error:', err)
            res.status(500).send("failed to find user")
        }
        else if( !user ) {
            console.log('No user found!')
            res.status(403).send("<h1>Login failed</h1>")
        } else {
            console.log('auth.login.user', user)
            // at this point, user.password is hashed!
            bcrypt.compare(req.body.password, user.password, function(bcryptErr, matched) {
                // matched will be === true && false
                if( bcryptErr ) {
                    console.error('MongoDB error:', bcryptErr)
                    res.status(500).send("mongodb error")
                } else if ( !matched ) {
                    // forbidden, bad password
                    console.warn('Password did not match!')
                    res.status(403).send("failed to log in")
                } else {
                    req.session.uid = user._id; // this is what keeps our user session on the backend!
                    res.send({ success: 'Login success' }) // send a success message
                }
            })
        }
    })
})



app.listen(8080)
