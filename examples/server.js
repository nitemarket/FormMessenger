var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var hostname = 'localhost';
var port = 3000;

var app = express();

app.use(morgan('dev'));

app.use(express.static(__dirname + '/public'));

var userRouter = express.Router();

userRouter.use(cookieParser('12345-67890-09876-54321'));

userRouter.use(bodyParser.urlencoded({extended: false}));
userRouter.use(bodyParser.json());

//home
userRouter.route('')
.all(function(req, res, next) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    next();
})
.get(function(req, res, next) {
    if(req.signedCookies.cuser === '1') {
        res.end("<div>User is signed in.</div><a href=\"user/signout\">Sign out</a>");
    } else {
        res.end("<div>User is not signed in.</div><a href=\"/\">Sign in</a>");
    }
});

//sign in
userRouter.route('/signin')
.post(function(req, res, next) {
    var json = {};
    if(req.body.email == 'cas@gmail.com' && req.body.password == 'qwe123'){
        res.cookie('cuser', '1', {signed: true});
        json = {loggedin: 1};
        
    } else {
        json = {loggedin: 0};
    }
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(json));
});

userRouter.route('/signup')
.post(function(req, res, next) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(req.body, null, 3));
});

userRouter.route('/signout')
.get(function(req, res, next) {
    res.cookie("cuser", "", {expires: new Date()});
    res.redirect('/user');
});

userRouter.route('/forget-password')
.post(function(req, res, next) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(req.body, null, 3));
});

userRouter.route('/subscribe')
.post(function(req, res, next) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(req.body, null, 3));
});

app.use('/user', userRouter);

app.listen(port, hostname, function(){
    console.log(`Server running at http://${hostname}:${port}`);
})