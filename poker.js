const crypto = require("crypto");

const cards = [ 
	"2H", "3H", "4H", "5H", "6H", "7H", "8H", "9H", "TH", "JH", "QH", "KH", "AH",
	"2D", "3D", "4D", "5D", "6D", "7D", "8D", "9D", "TD", "JD", "QD", "KD", "AD",
	"2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "TC", "JC", "QC", "KC", "AC",
	"2S", "3S", "4S", "5S", "6S", "7S", "8S", "9S", "TS", "JS", "QS", "KS", "AS"
];

const handRanks = {
	"Fold": 0,
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

class Table {
	constructor (tableName) {
		this.name = tableName;
		this.players = [];	
		this.round = 0;
		this.button = 0;
		this.sb = 10;
		this.bb = 25;
		this.chips = 0;
		this.reset();
	}

	reset () {
		// each stage push [sidepot,stage,player,chips]
		// index for sidepots (default 0)
		// stage 0: blind, 1: deal, 2: flop, 3: turn, 4: river
		this.stage = 0;
		this.sidepot = 0;
		this.pot = [];
		this.cards = [];
		this.best = [];
		this.winner = [];
		this.deck = shuffleDeck(cards);

		//reset player hands and wagers
		let tally = 0;
		for(let i = 0; i < this.players.length; i++) {
			this.players[i].wager = 0;
			this.players[i].hand = [];
			tally+=this.players[i].chips;
		}
		console.log("player tally:", tally, "this.chips: ", this.chips);
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
			let p = this.players[i];
			if(p.name === name) {
				console.log("LEAVING: ", p);
				this.chips += p.chips;
				this.players.splice(i, 1);
				if(this.button === i) {
					log("dealer is leaving, button index: " + this.button);
					this.button--;
					dealer = true;
				}
				else if(this.button > i) {
					this.button--;
				}
				log(name + " has left the table, player index: " + i + ", remaining players: " + this.players.length);
				this.nextRound();
			}
		}
		return dealer;
	}

	nextRound () {
		this.reset();
		this.round++;
		this.button = (this.button + 1) % this.players.length;
		this.blinds();
	}

	blinds() {
		let small = this.players[(this.button + this.players.length - 2) % this.players.length],
			big = this.players[(this.button + this.players.length - 1) % this.players.length];

		//if last player
		if(small.name === big.name) {
			small.chips += this.chips;
			this.chips = 0;
			return;
		}

		//console.log("small (chips)/big (chips)", small.name, small.chips, "/", big.name, big.chips);

		if(!small.setWager(this.sb)) {
			console.log("asking", small.name, " to leave");
			this.leave(small.name);
			return;
		}
		if(!big.setWager(this.bb)) {
			small.chips += this.sb;
			console.log("asking", big.name, " to leave");
			this.leave(big.name);
			return;
		}
		
		if(this.chips) {
			let chips = [0, this.stage, "forefeited", this.chips];
			this.pot.push(chips);
			//console.log("chips: ", this.chips);
			this.chips = 0;
		}
		this.pot.push(small.bet(this.stage));
		this.pot.push(big.bet(this.stage));

	}

	bets () {
		for(let i = 1; i <= this.players.length; i++) {
			let p = this.players[(this.button+i) % this.players.length];
			
			if(p.hand && p.hand[0] == "Fold") {
				console.log("skipping ", p.name, " because they folded");
				continue;
			}
	
			//TESTING
			//TESTING RANDOM CHIP BETS
			//TESTING
			if(p.setWager(crypto.randomInt(0, p.chips+1))) {
				let bet = p.bet(this.stage);
				this.pot.push(bet);
			}
			else {
				//this.leave(p.name);
				console.log("making side pot at round: ", this.round, " stage: ", this.stage, " / folding player: ", p.name, p.hand);

				p.fold();				
				//do side pot operations here
				this.sidepot++;
			}
		}
	}

	payouts () {
		let total = 0,
			split = 0,
			change = 0,
			numWinners = this.winner[1].length;

		if(this.stage === 4) {
			for(let i = 0; i < this.pot.length; i++) {
				total += this.pot[i][3];
			}
			split = total / numWinners;
			change = (split % 1) * numWinners;

			console.log("total/split/change:", total, "/", split, "/", change);
			console.log("mf split:", Math.floor(split), "change ceil", Math.ceil(change), "change round", Math.round(change));

			for(let j = 0; j < numWinners; j++) {
				this.players[this.winner[1][j]].chips += Math.floor(split);
			}
			this.chips += Math.round(change);
		}
	}

	deal () {
		for(let i = 1; i <= this.players.length; i++) {
			this.players[(this.button+i) % this.players.length].hand = drawHand(this.deck, 2);
		}
		this.stage++;
	}

	flop () {
		let burn = drawHand(this.deck, 1),
			flop = drawHand(this.deck, 3);
		this.cards = this.cards.concat(flop);
		this.stage++;
	}

	turn () {
		let burn = drawHand(this.deck, 1),
			turn = drawHand(this.deck, 1);
		this.cards = this.cards.concat(turn);
		this.stage++;
	}

	river () {
		let burn = drawHand(this.deck, 1),
			river = drawHand(this.deck, 1);
		this.cards = this.cards.concat(river);
		this.stage++;
	}

	result () {
		for(let i = 0; i < this.players.length; i++) {
			if(this.players[i].hand.length) {
				let set = this.players[i].hand.concat(this.cards),
					all = this.players[i].hand[0] == "Fold" ? [ this.players[i].hand ] : getCombos(set),
					ranks = [];
				for(let j = 0; j < all.length; j++) {
					ranks.push(rankHand(all[j]));
				}
				this.best.push(bestRank(ranks)[0]);
			}
		}
		this.winner = bestRank(this.best);
		
		if(this.winner[0][0] === "Fold") {
			this.winner[0] = [ "folding hands", []];
			this.winner.push("Nobody");
		}
		else if(this.winner[1].length > 1) {
			let winners = this.players[this.winner[1][0]].name;
			for(let i = 1; i < this.winner[1].length; i++) {
				winners = winners.concat(", ", this.players[this.winner[1][i]].name);
			}
			this.winner.push(winners);
		}
		else {
			this.winner.push(this.players[this.winner[1][0]].name);
		}
	}
}

class Player {
	constructor (socketid, name) {
		this.socketid = socketid;
		this.name = name;
		this.chips = 1000;
		this.hand = [];
		this.wager = 0;
	}

	setWager (amount) {
		if(amount > this.chips) {
			console.log(this.name, "aint got enough chips, only got: ", this.chips);
			return false;
		}
		this.wager = amount;
		this.chips -= amount;
		return true;
	}

	bet (stage, idx = 0) {
		let bet = [idx, stage, this.name, this.wager];
		this.wager = 0;
		return bet;
	}

	fold () {
		this.hand = [ "Fold", 0 ];
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
		let rand = crypto.randomInt(i);
		shuffled.push(unshuffled.splice(rand, 1)[0]);
	}
	return shuffled;
}

function drawHand (deck, cards) {
	return deck.splice(0, cards);
}

function rankHand (hand) {
	let handType = {
		"Fold": 0,
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

	if(hand[0] == "Fold") return hand;

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
					compareScore(i, score, best[1], () => ties.push(i));
					break;
				case "Pair":
				case "Three of a kind":
				case "Full house":
				case "Four of a kind":
					compareScore(i, score[0], best[1][0], () => 
						compareScore(i, score[1], best[1][1], () => ties.push(i))
					);
					break;
				case "Two pair":
					compareScore(i, score[0], best[1][0], () => 
						compareScore(i, score[1], best[1][1], () => 
							compareScore(i, score[2], best[1][2], () => ties.push(i))
						)
					);
					break;
			}
		});
	}
	return [best, ties.concat(number)];
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
	Player: Player
};



let t = new Table("12345");
let p1 = new Player(0, "dan");
let p2 = new Player(1, "bob");
let p3 = new Player(2, "jim");
let p4 = new Player(3, "sue");
let p5 = new Player(4, "cam");
let p6 = new Player(5, "jen");

t.join(p1);
t.join(p2);
t.join(p3);
t.join(p4);
t.join(p5);
t.join(p6);

for(let x = 0; x < 1000; x++)
{
	if(t.players.length <= 1) break;
	t.deal();
	t.bets();
	t.flop();
	t.bets();
	t.turn();
	t.bets();
	t.river();
	t.bets();
	t.result();
	t.payouts();
	t.nextRound();
}
console.log("%o",t.players);
let total = 0;
for(let i = 0; i < t.pot.length; i++) {
	total += t.pot[i][3];
}
console.log("total pre tally:", total);
for(let x = 0; x < t.players.length; x++) {
	total += t.players[x].chips;
}
console.log("final total:", total);

/*

t.leave("bob");
t.nextRound();

t.deal();
t.flop();
t.turn();
t.river();
t.result();

console.log("%o",t);
console.log( "Winner(s): \x1b[35m" + t.winner[2] + "\x1b[0m", "\nHand:", t.winner[0]);

t.join(p7);

t.nextRound();
t.deal();
t.flop();
t.turn();
t.river();
t.result();

console.log("%o",t);
console.log( "Winner(s): \x1b[35m" + t.winner[2] + "\x1b[0m", "\nHand:", t.winner[0]);
*/


/*
let t = new Table("12345");
let p1 = new Player(0, "dan");
let p2 = new Player(1, "bob");
let p3 = new Player(2, "jim");
let p4 = new Player(3, "sue");
let p5 = new Player(4, "cam");
let p6 = new Player(5, "jen");
t.join(p1);
t.join(p2);
t.join(p3);
t.join(p4);
t.join(p5);
t.join(p6);
t.players[0].hand = ['TD','3S'];
t.players[1].hand = [ 'JC', '5S'];
t.players[2].hand = [ '7C', '7H'];
t.players[3].hand = [ 'AH', '7D'];
t.players[4].hand = [ '9D', '2H'];
t.players[5].hand = [ '5H', '7S'];
t.cards = ['9C', 'KD', '8D', 'TS', 'JS']
t.result();
console.log("%o",t);
console.log( "Winner(s): \x1b[35m" + t.winner[2] + "\x1b[0m", "\nHand:", t.winner[0]);
*/


/*
let testHands = [
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

let testRanks = [
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
console.log(bestRank(testRanks));

let testRanks2 = [
    [ 'Two pair', [ 16, 8, 256 ]],
    [ 'Two pair', [ 16, 2, 64 ]],
    [ 'Pair', [ 16, 4640]],
    [ 'Straight', 62 ],
    [ 'Straight', 62 ],
    [ 'Pair', [ 16, 5152]]
  ];

console.log(bestRank(testRanks2));

let set = [ "9C", "3S", "9D", "JD", "7D", "9H", "7H" ],
	all = getCombos(set),
	ranks = [];
for(let j = 0; j < all.length; j++) {
	ranks.push(rankHand(all[j]));
}
console.log(ranks);

let winners = [ bestRank(ranks)[0] ];
winners.push([ 'Two pair', [ 128, 32, 512 ] ])

let winners2 = [[ 'Two pair', [ 128, 32, 512 ]]];
winners2.push(bestRank(ranks)[0]);

let winners3 = [[ 'Full house', [ 128, 32 ]],[ 'Two pair', [ 128, 32, 512 ]],[ 'Full house', [ 128, 32 ]]];
winners3.push(bestRank(ranks)[0]);

console.log(winners);
console.log(winners2);
console.log(winners3);

console.log(bestRank(winners));
console.log(bestRank(winners2));
console.log(bestRank(winners3));

*/