"use strict"

const 	compress = require("compression"),
		socketio = require("socket.io"),
		uglifyES = require("uglify-es"),
		express = require("express"),
		favicon = require("serve-favicon"),
		poker = require("./poker"),
		http = require("http"),
		cors = require("cors"),
		fs = require("fs"),
		app = express();

const   VERSION = JSON.parse(fs.readFileSync("package.json")).version,
		INSTANCE = VERSION + "_" + Date.now();

const 	server = http.createServer(app);
const 	io = socketio(server, {
			cors: {
				origin: "*"
			}
  		});

app.set("json spaces", 2);
app.use(cors());
app.use(favicon(__dirname + "/images/favicon.ico"));
app.use("/css", express.static(__dirname + "/css"));
app.use("/images", express.static(__dirname + "/images"));
app.use(compress());

app.locals.clientcss = fs.readFileSync(__dirname + "/css/client.css", "utf8");
app.locals.clientjs = fs.readFileSync(__dirname + "/client/client.js", "utf8");
app.locals.clientjs = process.env.NODE_ENV !== "DEV" ? uglifyES.minify(app.locals.clientjs).code : app.locals.clientjs;

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/html/index.html");
});

app.get("/client.css", (req, res, next) => {
	res.type("text/css");
	res.send(app.locals.clientcss);
	next();
});

app.get("/client.js", (req, res, next) => {
	res.type("application/javascript");
	res.send(app.locals.clientjs);
	next();
});

io.on("connection", socket => {
	const p = new poker.Player(socket.id, "");
	console.log("new socket connection: " + socket.id);
	
	let t = {};

	//global socket list
	const users = [];
	for (let [id] of io.of("/").sockets) {
		users.push(id);
	}
	console.log(users.length + " socket(s) connected");
	console.log(users);
	io.emit("users", users);
	
	socket.on("join", (playerName, tableName, next) => {
		p.name = playerName;
		if(poker.tables[tableName]) t = poker.tables[tableName];
		else {
			t = new poker.Table(tableName);
			poker.tables[tableName] = t;
		}
		t.join(p);
		socket.join(t.name)
		io.to(t.name).emit("player joined", p.name);
		console.log(socket.id, p.name, "joining", t.name);
		next(t.players[t.button].name);
	});

	socket.on("leave", next => {
		t.leave(p.name);
		io.to(t.name).emit("player left", p.name, socket.id);
		socket.leave(t.name);
		console.log(socket.id, "leaving", t.name);
		if(t.players.length === 0) t.button = 0;
		next();
	});

	socket.on("disconnect", () => {
		//cleanup
		console.log("socket disconnected: " + socket.id);
		if(t.players && t.players.length === 0) t.button = 0;
	});

	socket.on("error", error => {
		console.log("socket error: " + socket.id + ": " + error);
	});

	socket.on("deal", () => {
		t.deal(t);
		for(let i = 0; i < t.players.length; i++) {
			console.log(t.players[i]);
			io.to(t.players[i].socketid).emit("hand", t.players[i].hand);
		}
	});

	socket.on("flop", () => {
		t.flop()
		io.to(t.name).emit("cards", t.cards);
	});

	socket.on("turn", () => {
		t.turn();
		io.to(t.name).emit("cards", t.cards);
	});

	socket.on("river", () => {
		t.river();
		io.to(t.name).emit("cards", t.cards);
	});

	socket.on("result", () => {
		t.result();
		io.to(t.name).emit("winner", t.winner);
	});

	socket.on("end hand", () => {
		t.nextRound();
		io.to(t.name).emit("end hand", t.players[t.button].name);
	});

	socket.on("fold", () => {
		io.to(t.name).emit("message", "player " + p.name + " folds");	
		p.hand = ["YY", "ZZ"];
	});

	socket.onAny((event, ...args) => {
		console.log(event, args);
	});
});

function init (next) {
	//timer
	//setInterval(function () {}, 3000);
	next();
}

init(() => {
	server.listen(8442, () => {
		console.log("Express server started on port " + server.address().port);
	});
});

process.once("SIGUSR2",() => {
	server.close(() => {
		process.kill(process.pid, "SIGUSR2");
	});
});