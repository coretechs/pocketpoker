const APP = {
	playerName: "",
	tableName: "",
	table: {},
	showCards: false
};

const DOM = {
	playerName: document.getElementById("playerName"),
	playerInput: document.getElementById("playerInput"),
	tableName: document.getElementById("tableName"),
	tableInput: document.getElementById("tableInput"),
	table: document.getElementById("table"),
	messages: document.getElementById("messages"),
	join: document.getElementById("join"),
	leave: document.getElementById("leave"),
	buttons: document.getElementById("buttons"),
	bdealer: document.getElementById("bdealer"),
	bplayer: document.getElementById("bplayer"),
	show: document.getElementById("show"),
	gameCards: document.getElementById("gameCards"),
	playerCards: document.getElementById("playerCards")
};

const URL = location.protocol + "//" + location.hostname + (location.port ? ":" + location.port : "");
const socket = io(URL, { autoConnect: true });

DOM.join.onclick = () => {
	APP.playerName = DOM.playerInput.value;
	APP.tableName = DOM.tableInput.value;
	joinTable();
};

DOM.show.onclick = () => {
	showCards();
};

DOM.leave.onclick = () => {
	leaveTable();
};

DOM.tableInput.onkeyup = (event) => {
	if(event.keyCode === 13) {
		event.preventDefault();
		DOM.join.click();
	}
};

// pad number with leading 0
function pad (num, size) {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

function getFormattedUTCTimestamp () {
    let months = { 1:"Jan", 2:"Feb", 3:"Mar", 4:"Apr", 5:"May", 6:"Jun", 7:"Jul", 8:"Aug", 9:"Sep", 10:"Oct", 11:"Nov", 12:"Dec" };
    let d = new Date();
    return pad(d.getUTCDate(), 2) + "-" + months[d.getUTCMonth() + 1] + "-" + d.getUTCFullYear() + " " + pad(d.getUTCHours(), 2) + ":" + pad(d.getUTCMinutes(), 2) + ":" + pad(d.getUTCSeconds(), 2) + " UTC";
}

function toggleTableButtons () {
	DOM.tableInput.value = "";
	DOM.playerInput.hidden = DOM.playerInput.hidden == true ? false : true;
	DOM.tableInput.hidden = DOM.tableInput.hidden == true ? false : true;
	DOM.join.hidden = DOM.join.hidden == true ? false : true;
	DOM.leave.hidden = DOM.leave.hidden == false ? true : false;
}

function joinTable () {
	if(APP.tableName && APP.playerName) {
		socket.emit("join", APP.playerName, APP.tableName, dealerName => {
			console.log("joined table, dealer is: " + dealerName);
			DOM.tableName.innerHTML = APP.tableName;
			DOM.playerName.innerHTML = APP.playerName;
			toggleTableButtons();
			if(APP.playerName === dealerName) createDealerButtons();
		});
	}
}

function leaveTable () {
	socket.emit("leave", () => {
		console.log("leaving table");
		APP.playerName = "";
		APP.tableName = "";
		DOM.playerName.innerHTML = "";
		DOM.tableName.innerHTML = "";
		
		
		APP.table = {};
		DOM.bplayer.innerHTML = "";
		DOM.bdealer.innerHTML = "";
		DOM.messages.innerHTML = "";

		renderTable(APP.table);
		toggleTableButtons();
	});
}

function renderTable (table) {
	DOM.table.hidden = true;
	DOM.gameCards.innerHTML = "";
	DOM.playerCards.innerHTML = "";

	if(table.cards) {
		for(let i = 0; i < table.cards.length; i++) {
			let c = document.createElement("img");
			c.src = "images/" + table.cards[i] + ".png";
			DOM.gameCards.appendChild(c);
		}
	}

	if(table.hand) {
		let h1 = document.createElement("img"),
			h2 = document.createElement("img");

		h1.src = "images/" + (APP.showCards ? table.hand[0] : "b1fv") + ".png";
		h2.src = "images/" + (APP.showCards ? table.hand[1] : "b1fv") + ".png";
		DOM.playerCards.appendChild(h1);
		DOM.playerCards.appendChild(h2);
	}

	DOM.table.hidden = false;
}

function createDealerButton (name, cb) {
	let b = document.createElement("button");
	b.innerHTML = name.toUpperCase();
	b.onclick = () => {
		socket.emit(name, () => {});
		DOM.bdealer.removeChild(b);
		cb();
	};
	DOM.bdealer.appendChild(b);
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
			renderTable(APP.table);
			
		}
		else {
			APP.showCards = true;
			b.innerHTML = "Hide cards";
			renderTable(APP.table);
		}
	};

	f.onclick = () => {
		socket.emit("fold");
		DOM.bplayer.removeChild(f);
	};

	DOM.bplayer.appendChild(b);
	DOM.bplayer.appendChild(f);
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

socket.on("seat", playerName => {
	APP.playerName = playerName;
	DOM.playerName.innerHTML = APP.playerName;
});

socket.on("hand", hand => {
	createPlayerButtons();
	APP.table.hand = hand;
	renderTable(APP.table);
});

socket.on("cards", cards => {
	APP.table.cards = cards;
	renderTable(APP.table);
});

socket.on("winner", winner => {
	message(winner[3] + " wins with " + winner[0][0]);
});

socket.on("end hand", dealerName => {
	APP.table = {};
	DOM.bplayer.innerHTML = "";
	DOM.bdealer.innerHTML = "";
	
	renderTable(APP.table);
	message("Dealer button moves to " + dealerName);
	if(APP.playerName === dealerName) createDealerButtons();
});

socket.onAny((event, ...args) => {
 	console.log(event, args);
});
