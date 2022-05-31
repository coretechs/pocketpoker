const cards = [ 
	"2H", "3H", "4H", "5H", "6H", "7H", "8H", "9H", "TH", "JH", "QH", "KH", "AH",
	"2D", "3D", "4D", "5D", "6D", "7D", "8D", "9D", "TD", "JD", "QD", "KD", "AD",
	"2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "TC", "JC", "QC", "KC", "AC",
	"2S", "3S", "4S", "5S", "6S", "7S", "8S", "9S", "TS", "JS", "QS", "KS", "AS"
];

const handRanks = {
	"High card": 1,
	"Pair": 2,
	"Two pair": 3,
	"Three of a kind": 4,
	"Straight": 5,
	"Flush": 6,
	"Full house": 7,
	"Four of a kind": 8,
	"Straight flush": 9
};

const pointMap = {
	"2": 1,
	"3": 2,
	"4": 4,
	"5": 8,
	"6": 16,
	"7": 32,
	"8": 64,
	"9": 128,
	"T": 256,
	"J": 512,
	"Q": 1024,
	"K": 2048,
	"A": 4096
};

const straights = [ 4111, 31, 62, 124, 248, 496, 992, 1984, 3968, 7936 ];

const tables = {};

class Table {
	constructor (tableName) {
		this.name = tableName;
		this.players = [];	
		this.round = 0;
		this.button = 0;
		this.reset();
		tables.tableName = this;
	}

	reset () {
		this.cards = [];
		this.best = [];
		this.winner = [];
		this.deck = shuffleDeck(cards);

		//reset player hands
		for(let i = 0; i < this.players.length; i++) {
			this.players[i].hand = [];
		}
	}

	join (player) {
		if(this.players.find(p => p.name === player.name)) {
			log("player already exists: " + player.name);
			return 0;
		}
		else {
			log(player.name + " has joined table " + this.name);
			this.players.push(player);
			return 1;
		}
	}

	leave (name) {
		let dealer = false;
		for(let i = 0; i < this.players.length; i++) {
			if(this.players[i].name === name) {
				this.players.splice(i, 1);
				if(this.button === i) {
					log("dealer is leaving, button index: " + this.button);
					this.button--;
					this.nextRound();
					dealer = true;
				}
				else if(this.button > i) {
					this.button--;
				}
				log(name + " has left the table, player index: " + i);
			}
		}
		return dealer;
	}

	nextRound () {
		this.reset();
		this.round++;
		this.button = (this.button + 1) % this.players.length;
	}

	deal () {
		for(let i = 1; i <= this.players.length; i++) {
			this.players[(this.button+i) % this.players.length].hand = drawHand(this.deck, 2);
		}
	}

	flop () {
		let burn = drawHand(this.deck, 1),
			flop = drawHand(this.deck, 3);
		this.cards = this.cards.concat(flop);
	}

	turn () {
		let burn = drawHand(this.deck, 1),
			turn = drawHand(this.deck, 1);
		this.cards = this.cards.concat(turn);
	}

	river () {
		let burn = drawHand(this.deck, 1),
			river = drawHand(this.deck, 1);
		this.cards = this.cards.concat(river);
	}

	result () {
		for(let i = 0; i < this.players.length; i++) {
			if(this.players[i].hand.length) {
				let set = this.players[i].hand.concat(this.cards),
					all = getCombos(set),
					ranks = [];
				for(let j = 0; j < all.length; j++) {
					ranks.push(rankHand(all[j]));
				}
				this.best.push(bestRank(ranks)[0]);
			}
		}
		this.winner = bestRank(this.best);
		
		if(this.winner[1] === -1) {
			this.winner[0] = [ "folding hands", []];
			this.winner.push("Nobody");
		}
		else if(this.winner[2] > 0) {
			this.winner.push("Multiple players");
		}
		else {
			this.winner.push(this.players[this.winner[1]].name);
		}
	}
}

class Player {
	constructor (socketid, name) {
		this.socketid = socketid;
		this.name = name;
		this.hand = [];
	}
}

function log (msg) {
	console.log("[poker.js] " + msg);
}

function shuffleDeck (deck) {
	let unshuffled = [...deck],
		shuffled = [];

	for(let i = unshuffled.length; i > 0; i--)
	{
		let rand = Math.floor(Math.random() * i);
		shuffled.push(unshuffled.splice(rand, 1)[0]);
	}
	return shuffled;
}

function drawHand (deck, cards) {
	return deck.splice(0, cards);
}

function rankHand (hand) {
	let handType = {
		"High card": 0,
		"Pair": 0,
		"Two pair": 0,
		"Three of a kind": 0,
		"Straight": 0,
		"Flush": 0,
		"Full house": 0,
		"Four of a kind": 0,
		"Straight flush": 0
	};

	let handSuit = {
		"H": 0,
		"D": 0,
		"C": 0,
		"S": 0
	};

	let handCount = {
		"2": 0,
		"3": 0,
		"4": 0,
		"5": 0,
		"6": 0,
		"7": 0,
		"8": 0,
		"9": 0,
		"T": 0,
		"J": 0,
		"Q": 0,
		"K": 0,
		"A": 0
	};

	for(let i = 0; i < hand.length; i++) {
		handType["High card"] += pointMap[hand[i][0]];
		handCount[hand[i][0]]++;
		handSuit[hand[i][1]]++;
	}

	Object.entries(handSuit).forEach(suit => {
		if(suit[1] == 5) handType["Flush"] = handType["High card"];
	});

	Object.entries(handCount).forEach(count => {
		switch(count[1]) {
			case 2: handType["Pair"] ? 
						handType["Two pair"] = [pointMap[count[0]], handType["Pair"][0], handType["Pair"][1] - (pointMap[count[0]] * 2)] : 
					(handType["Three of a kind"] ? 
						handType["Full house"] = [handType["Three of a kind"][0], (pointMap[count[0]] * 2)] : 
						handType["Pair"] = [pointMap[count[0]], handType["High card"]-(pointMap[count[0]] * 2)]
					);
					break;
			case 3: handType["Pair"] ? handType["Full house"] = [pointMap[count[0]], handType["Pair"][0]] : handType["Three of a kind"] = [pointMap[count[0]], handType["High card"] - (pointMap[count[0]] * 3)];
					break;
			case 4: handType["Four of a kind"] = [pointMap[count[0]], handType["High card"] - (pointMap[count[0]] * 4)];
					break;
		}
	});

	if(straights.includes(handType["High card"])) {
		if(handType["High card"] == 4111) handType["High card"] = 15;
		handType["Straight"] = handType["High card"];
	}

	if(handType["Straight"] && handType["Flush"]) {
		handType["Straight flush"] = handType["High card"];
	}
	
	return Object.entries(handType).reverse().find(best => best[1] !== 0);
}

function bestRank (ranks) {
	let ties = [],
		number = ranks.length - 1,
		best = ranks[number];
	
	let updateBest = index => {
		ties = [];
		number = index;
		best = ranks[number];
	};

	let compareScore = (idx, s, b, c) => {
		if(s > b) updateBest(idx);
		else if(s == b) c();
	};

	for(let i = 0; i < ranks.length - 1; i++) {
		let rank = ranks[i][0],
			score = ranks[i][1];
		
		compareScore(i, handRanks[rank], handRanks[best[0]], () => {
			switch(rank) {
				case "Fold":
				case "High card":
				case "Straight":
				case "Flush":
				case "Straight flush":
					compareScore(i, score, best[1], () => ties.push(i + 1));
					break;
				case "Pair":
				case "Three of a kind":
				case "Full house":
				case "Four of a kind":
					compareScore(i, score[0], best[1][0], () => 
						compareScore(i, score[1], best[1][1], () => ties.push(i + 1))
					);
					break;
				case "Two pair":
					compareScore(i, score[0], best[1][0], () => 
						compareScore(i, score[1], best[1][1], () => 
							compareScore(i, score[2], best[1][2], () => ties.push(i + 1))
						)
					);
					break;
			}
		});
	}
	return [best, number, ties];
}

function getCombos (arr) {
	let combos = [],
		ln = arr.length;
	for(let i = 0; i < ln; i++) {
		for(let j = i + 1; j < ln; j++) {
			for(let k = j + 1; k < ln; k++) {
				for(let l = k + 1; l < ln; l++) {
					for(let m = l + 1; m < ln; m++) {
						combos.push([arr[i], arr[j], arr[k], arr[l], arr[m]]);
					}
				}
			}
		}
	}
	return combos;
}

module.exports = {
	Table: Table,
	Player: Player,
	tables: tables
};

/*
let t = new Table("12345");
let p1 = new Player("dan");
let p2 = new Player("bob");
let p3 = new Player("jim");
let p4 = new Player("sue");
let p5 = new Player("cam");
let p6 = new Player("jen");
let p7 = new Player("bob");

t.join(p1);
t.join(p2);
t.join(p3);
t.join(p4);
t.join(p5);
t.join(p6);
t.join(p7);

t.deal();
t.flop();
t.turn();
t.river();
t.result();
console.log("%o",t);
console.log( "Winner: \x1b[35m" + t.players[t.winner[1]].name + "\x1b[0m", "\nHand:", t.winner[0], t.players[t.winner[1]].hand, "\nTies:", t.winner[2]);

t.leave("bob");

t.deal();
t.flop();
t.turn();
t.river();
t.result();
console.log("%o",t);
console.log( "Winner: \x1b[35m" + t.players[t.winner[1]].name + "\x1b[0m", "\nHand:", t.winner[0], t.players[t.winner[1]].hand, "\nTies:", t.winner[2]);

t.join(p7);

t.deal();
t.flop();
t.turn();
t.river();
t.result();

console.log("%o",t);
console.log( "Winner: \x1b[35m" + t.players[t.winner[1]].name + "\x1b[0m", "\nHand:", t.winner[0], t.players[t.winner[1]].hand, "\nTies:", t.winner[2]);
*/

/*const testHands = [
	["2H", "4D", "TS", "9C", "QS"], // high card
	["2H", "3D", "TS", "4C", "KS"], // high card
	["7H", "2S", "4S", "4C", "TS"], // pair
	["7H", "3S", "4S", "4C", "TS"], // pair
	["TH", "JS", "3S", "3C", "AS"], // pair
	["7H", "TS", "4S", "4C", "TS"], // two pair
	["6H", "TS", "4S", "4C", "TS"], // two pair
	["AH", "JS", "2S", "2C", "JS"], // two pair
	["4D", "4S", "3S", "4C", "5S"], // three
	["9D", "5S", "5S", "2C", "5S"], // three
	["AD", "2S", "3S", "4C", "5S"], // straight
	["2D", "3S", "4S", "5C", "6S"], // straight
	["8C", "QC", "JC", "KC", "TC"], // flush
	["2C", "3C", "4C", "6C", "AC"], // flush
	["2D", "2S", "KD", "KC", "KS"], // full house
	["AD", "AS", "QD", "QC", "QS"], // full house
	["2D", "2S", "QD", "QC", "QS"], // full house
	["9D", "KS", "KS", "KC", "KS"], // four of a kind
	["TD", "KS", "KS", "KC", "KS"], // four of a kind
	["AC", "2C", "3C", "4C", "5C"], // straight flush
	["TC", "JC", "QC", "KC", "9C"], // straight flush
	["TC", "JC", "QC", "KC", "AC"], // straight flush
];

for(let i = 0; i < testHands.length; i++) {
	let h = testHands[i];
	let r = rankHand(h);
	console.log(h, r);
}
*/


/*const testRanks = [
	[ 'Two pair', [ 2048, 1024, 5 ]],
	[ 'Two pair', [ 128, 64, 10]],
	[ 'Two pair', [ 128, 64, 10]],
	[ 'Two pair', [ 128, 64, 10]],
	[ 'Two pair', [ 128, 64, 10]],
	[ 'Two pair', [ 2048, 1024, 5 ]],
	[ 'Two pair', [ 2048, 1024, 5 ]],
	[ 'Two pair', [ 512, 1024, 5 ]],
	//[ 'Three of a kind', [ 4096, 64 ]],
	//[ 'Three of a kind', [ 64, 4096 ]]
]
bestRank(testRanks);*/
