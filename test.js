const poker = require("./poker.js");

let t = new poker.Table("12345");
let p1 = new poker.Player(0, "ALBERT");
let p2 = new poker.Player(1, "BOBBY");
let p3 = new poker.Player(2, "CAM");
let p4 = new poker.Player(3, "DANIEL");
let p5 = new poker.Player(4, "ELIZA");
let p6 = new poker.Player(5, "FRED");

t.join(p1);
t.join(p2);
t.join(p3);
t.join(p4);
t.join(p5);
t.join(p6);

for(let x = 0; x < 100; x++)
{
	let winner = false;
	if(t.players.length <= 1) break;
	t.deal();
	if (winner === false) winner = t.bets();
	t.flop();
	if (winner === false) winner = t.bets();
	t.turn();
	if (winner === false) winner = t.bets();
	t.river();
	if (winner === false) winner = t.bets();
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