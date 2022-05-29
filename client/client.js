const APP = {
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
	playerCards: document.getElementById("playerCards")
};

const URL = location.protocol + "//" + location.hostname + (location.port ? ":" + location.port : "");
const socket = io(URL, { autoConnect: true });

DOM.join.onclick = () => {
	APP.playerName = DOM.playerInput.value;
	joinTable();
};

DOM.leave.onclick = () => {
	leaveTable();
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

function showInputButtons (bool) {
	DOM.playerInput.hidden = !bool;
	DOM.join.hidden = !bool;
	DOM.leave.hidden = bool;
}

function reset () {
	APP.playerName = "";
	APP.tableName = "";
	DOM.playerName.innerHTML = "";
	DOM.tableName.innerHTML = "";
	DOM.playerInput.value = "";
	
	APP.table.cards = [];
	APP.table.hand = [];
	DOM.playerButtons.innerHTML = "";
	DOM.dealerButtons.innerHTML = "";
	DOM.messages.innerHTML = "";

	DOM.gameCards.innerHTML = "";
	DOM.playerCards.innerHTML = "";
	showInputButtons(true);
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
		socket.emit("join", APP.playerName, APP.tableName, (tableName, dealerName) => {
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


function createDealerButton (name, cb) {
	let b = document.createElement("button");
	b.innerHTML = name.toUpperCase();
	b.onclick = () => {
		socket.emit(name, () => {});
		DOM.dealerButtons.removeChild(b);
		cb();
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
	APP.showCards = false;
	let b = document.createElement("button"),
		f = document.createElement("button");

	b.innerHTML = "Show cards";
	f.innerHTML = "Fold";

	b.onclick = () => {
		if(APP.showCards) {
			APP.showCards = false;
			b.innerHTML = "Show cards";
			renderHand(APP.table.hand);
			
		}
		else {
			APP.showCards = true;
			b.innerHTML = "Hide cards";
			renderHand(APP.table.hand);
		}
	};

	f.onclick = () => {
		socket.emit("fold");
		DOM.playerButtons.removeChild(f);
	};

	DOM.playerButtons.appendChild(b);
	DOM.playerButtons.appendChild(f);
}

function message (message) {
	let m = document.createElement("p");	
	m.innerHTML = "[" + getFormattedUTCTimestamp() + "] " + message;
	DOM.messages.prepend(m);
}

socket.on("message", message);

socket.on("users", users => {
	console.log("USERS: ", users);
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
	message(winner[3] + " wins with " + winner[0][0]);
});

socket.on("end hand", dealerName => {
	endHand(dealerName);
});

socket.on("disconnect", () => {
	reset();
});

socket.onAny((event, ...args) => {
 	console.log(event, args);
});