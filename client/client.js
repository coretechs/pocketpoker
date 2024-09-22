const URL = location.protocol + "//" + location.hostname + (location.port ? ":" + location.port : "");
const socket = io(URL, { autoConnect: true });
const crypto = window.crypto || window.msCrypto;

const APP = {
	playerId: "",
	playerName: "",
	tableName: "",
	table: {
		cards: [],
		hand: []
	},
	showCards: false
};

const DOM = {
	playerName: document.getElementById("playerName"),
	playerInput: document.getElementById("playerInput"),
	tableName: document.getElementById("tableName"),
	table: document.getElementById("table"),
	messages: document.getElementById("messages"),
	join: document.getElementById("join"),
	leave: document.getElementById("leave"),
	dealerButtons: document.getElementById("dealerButtons"),
	playerButtons: document.getElementById("playerButtons"),
	gameCards: document.getElementById("gameCards"),
	playerCards: document.getElementById("playerCards"),
	playerList: document.getElementById("playerList")
};

DOM.join.onclick = () => {
	APP.playerName = DOM.playerInput.value;
	joinTable();
};

DOM.playerInput.onkeydown = (e) => {
	if (e.keyCode === 13) {
		DOM.join.click();
		e.preventDefault();
	}
};

DOM.leave.onclick = () => {
	leaveTable();
};

DOM.playerCards.onclick = () => {
	if(APP.showCards) {
		APP.showCards = false;
		renderHand(APP.table.hand);
	}
	else {
		APP.showCards = true;
		renderHand(APP.table.hand);
	}
};

function pad (num, size) {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

function getFormattedUTCTimestamp () {
    let d = new Date();
    return d.getUTCFullYear().toString().slice(2) + "-" + pad(d.getUTCMonth() + 1,2) + "-" + pad(d.getUTCDate(), 2) + " " + pad(d.getUTCHours(), 2) + ":" + pad(d.getUTCMinutes(), 2) + ":" + pad(d.getUTCSeconds(), 2);
}

function init () {
	APP.playerId = sessionStorage.getItem("playerId") ? sessionStorage.getItem("playerId") : crypto.randomUUID();
	//getCookie("playerId").length ? getCookie("playerId") : crypto.randomUUID();
	//setCookie("playerId", APP.playerId, 1);
	sessionStorage.setItem("playerId", APP.playerId);
}

function showInputButtons (bool) {
	DOM.playerInput.hidden = !bool;
	DOM.join.hidden = !bool;
	DOM.leave.hidden = bool;
}

function reset () {
	//APP.playerName = "";
	APP.tableName = "";
	APP.showCards = false;
	DOM.playerName.innerHTML = "";
	DOM.tableName.innerHTML = "";
	//DOM.playerInput.value = "";
	
	APP.table.cards = [];
	APP.table.hand = [];
	DOM.playerButtons.innerHTML = "";
	DOM.dealerButtons.innerHTML = "";
	DOM.messages.innerHTML = "";

	DOM.gameCards.innerHTML = "";
	DOM.playerCards.innerHTML = "";
	showInputButtons(true);
	//DOM.playerInput.focus();
}

function endHand (dealerName) {
	APP.table.cards = [];
	APP.table.hand = [];
	DOM.playerButtons.innerHTML = "";
	DOM.dealerButtons.innerHTML = "";
	DOM.gameCards.innerHTML = "";
	DOM.playerCards.innerHTML = "";
	message("Dealer button moves to " + dealerName);
	if(APP.playerName === dealerName) createDealerButtons();
}

function joinTable () {
	if(APP.playerName) {
		//console.log(APP.playerId, APP.playerName);
		socket.emit("join", APP.playerId, APP.playerName, APP.tableName, (tableName, dealerName) => {
			console.log("joined table, dealer is: " + dealerName + ", table is: " + tableName);
			APP.tableName = tableName;
			DOM.tableName.innerHTML = APP.tableName;
			DOM.playerName.innerHTML = APP.playerName;
			showInputButtons(false);
			if(APP.playerName === dealerName) createDealerButtons();
		});
	}
}

function leaveTable () {
	socket.emit("leave", () => {
		console.log("leaving table");
		reset();
	});
}

function renderCards (cards) {
	if(cards) {
		for(let i = 0; i < cards.length; i++) {
			let c = document.createElement("img");
			c.classList.add("fade-in-image");
			c.src = "images/" + cards[i] + ".png";
			DOM.gameCards.appendChild(c);
		}
	}
}

function renderHand (hand) {
	DOM.playerCards.innerHTML = "";
	if(hand) {
		let h1 = document.createElement("img"),
			h2 = document.createElement("img");
		h1.classList.add("fade-in-image");
		h2.classList.add("fade-in-image");
		h1.src = "images/" + (APP.showCards ? hand[0] : "b1fv") + ".png";
		h2.src = "images/" + (APP.showCards ? hand[1] : "b1fv") + ".png";
		DOM.playerCards.appendChild(h1);
		DOM.playerCards.appendChild(h2);
	}
}

function renderPlayerList (players) {
	DOM.playerList.innerHTML = "";
	if(players) {
		for(let i = 0; i < players.length; i++) {
			let r = document.createElement("div"),
				p = document.createElement("p"),
				s = document.createElement("span"),
				nextSeat = (i === 0) ? players.length - 1 : i - 1;

			s.innerHTML = " &#9650;"
			s.onmouseover = () => s.classList.add("hover");
			s.onmouseout = () => s.classList.remove("hover");
			s.setAttribute("id", "seatArrow");

			s.onclick = () => {
				//console.log(players[i].name, players[nextSeat].name);
				socket.emit("switch seat", players[i].name, players[nextSeat].name);
			};
			p.innerHTML = players[i].name;
			p.appendChild(s);

			r.classList.add("row");
			r.appendChild(p);
			DOM.playerList.appendChild(r);
		}
	}
}

function createDealerButton (name, next) {
	let b = document.createElement("button");
	b.innerHTML = name.toUpperCase();
	b.onclick = () => {
		socket.emit(name, () => {});
		DOM.dealerButtons.removeChild(b);
		next();
	};
	DOM.dealerButtons.appendChild(b);
}

function createDealerButtons () {
	createDealerButton("end hand", () => {});
	createDealerButton("deal", () => {
		createDealerButton("flop", () => {
			createDealerButton("turn", () => {
				createDealerButton("river", () => {
					createDealerButton("result", () => {						
					});
				});
			});
		});
	});
}

function createPlayerButtons () {	
	let	f = document.createElement("button");

	f.innerHTML = "Fold";

	f.onclick = () => {
		socket.emit("fold");
		DOM.playerButtons.removeChild(f);
	};

	DOM.playerButtons.appendChild(f);
}

function message (message) {
	let m = document.createElement("p");	
	m.innerHTML = "[" + getFormattedUTCTimestamp() + "] " + message;
	DOM.messages.prepend(m);
}

socket.on("message", message);

socket.on("player list", players => {
	renderPlayerList(players);
});

socket.on("player joined", player => {
	message(player + " joined");
});

socket.on("player left", player => {
	message(player + " left");
});

socket.on("hand", hand => {
	APP.table.hand = hand;
	renderHand(APP.table.hand);
	createPlayerButtons();
});

socket.on("cards", cards => {
	APP.table.cards.concat(cards);
	renderCards(cards);
});

socket.on("winner", winner => {
	console.log(winner);
	message(winner[2] + ((winner[1].length > 1 && winner[0][0] !== "folding hands") ? " each win with " : " wins with ") + winner[0][0]);
});

socket.on("end hand", dealerName => {
	endHand(dealerName);
});

socket.on("disconnect", () => {
	reset();
});

socket.onAny((event, ...args) => {
 	//console.log(event, args);
});

init();

DOM.playerInput.focus();