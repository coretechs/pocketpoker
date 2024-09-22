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
		INSTANCE = VERSION + "_" + Date.now(),
		TABLES = {},
		SESSIONS = [];

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
//app.locals.clientjs = process.env.NODE_ENV !== "DEV" ? uglifyES.minify(app.locals.clientjs).code : app.locals.clientjs;

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
	let p = {};
	let t = {};
	console.log("new socket connection: " + socket.id);
	
	socket.on("join", (playerId, playerName, tableName, next) => {
		if(tableName === "") tableName = "House Table";

		console.log("socket joining: " + socket.id, playerId, playerName, tableName);

		if(TABLES[tableName]) t = TABLES[tableName];
		else {
			t = new poker.Table(tableName);
			TABLES[tableName] = t;
		}

		p = t.getPlayer(playerId) ? t.getPlayer(playerId) : new poker.Player(playerId, playerName);	
		addSession(socket.id, p);

		if(t.join(p)) {
			socket.join(t.name)
			io.to(t.name).emit("player joined", p.name);
			next(tableName, t.players[t.button].name);
		}
		console.log("[server.js] table players: ", t.players);
		updatePlayerList(t);
	});

	socket.on("leave", next => {
		console.log("socket leaving: " + socket.id);
		if(t.players && t.players.length) leave(p, t, socket);
		next();
	});

	socket.on("disconnect", () => {
		console.log("socket disconnected: " + socket.id);
		if(t.players && t.players.length) leave(p, t, socket);
	});

	socket.on("switch seat", (playerName1, playerName2) => {
		let playerId1 = SESSIONS.find(p => p.name === playerName1).id,
			playerId2 = SESSIONS.find(p => p.name === playerName2).id;
		if(playerId1 && playerId2) t.switchSeats(playerId1, playerId2);
		io.to(t.name).emit("message", playerName1 + " switched seats with " + playerName2);	
		updatePlayerList(t);
	});

	socket.on("deal", () => {
		t.deal();
		for(let i = 0; i < t.players.length; i++) {
			let p = SESSIONS.find(p => p.id === t.players[i].id),
				socketid = p.socketid ? p.socketid : false;

			if(socketid) {
				//console.log("emitting hand: ", t.players[i].hand, " to socket: ", socketid);
				io.to(socketid).emit("hand", t.players[i].hand);
			}
		}
	});

	socket.on("flop", () => {
		t.flop()
		io.to(t.name).emit("cards", t.cards);
	});

	socket.on("turn", () => {
		t.turn();
		io.to(t.name).emit("cards", [t.cards[3]]);
	});

	socket.on("river", () => {
		t.river();
		io.to(t.name).emit("cards", [t.cards[4]]);
	});

	socket.on("result", () => {
		t.result();
		io.to(t.name).emit("winner", t.winner);
	});

	socket.on("end hand", () => {
		t.nextRound();
		io.to(t.name).emit("end hand", t.players[t.button].name);
		updatePlayerList(t);
	});

	socket.on("fold", () => {
		io.to(t.name).emit("message", "player " + p.name + " folds");	
		p.fold();
	});

	socket.on("error", error => {
		console.log("socket error: " + socket.id + ": " + error);
	});

	socket.onAny((event, ...args) => {
		console.log(event, args);
	});
});

function updatePlayerList (table) {
	let players = table.players,
		playerList = players.map((p, idx) => ({ "name" : p.name, "dealer" : (idx === table.button) ? true : false }));
	io.emit("player list", playerList);
}

function addSession (socketid, player) {
	//for (let [id] of io.of("/").sockets) {}
	SESSIONS.push({ "socketid": socketid, "id": player.id, "name" : player.name });
	console.log(SESSIONS.length + " player(s) connected");
	console.log("[server.js] SESSIONS: ", SESSIONS);
}

function removeSession (playerId) {
	let idx = SESSIONS.findIndex(p => p.id === playerId);
 	SESSIONS.splice(idx, 1);
 	console.log("[server.js] SESSIONS: ", SESSIONS);
}

function leave (player, table, socket) {
	console.log("[server.js] leaving: ", player.name);
	let idx = table.players.findIndex(p => p.id === player.id),
		idx2 = SESSIONS.findIndex(s => s.id === player.id);

	if(idx >= 0) {
		if(table.leave(player.name)) {
		// if player is dealer ^^^
			if(table.players.length) {
		//		console.log("sending end hand", table.players);
				io.to(table.name).emit("end hand", table.players[table.button].name);
			}
			else delete TABLES[table.name];
		}
		socket.leave(table.name);
		io.to(table.name).emit("player left", player.name);
	}

	if(idx2 >= 0) removeSession(player.id);
	
	console.log("[server.js] table players: ", table.players);
	updatePlayerList(table);
}

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