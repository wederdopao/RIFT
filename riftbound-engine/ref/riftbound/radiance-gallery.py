# Radiance (RAD-001..RAD-167), da galeria oficial da Riot (playriftbound.com/en-us/card-gallery, 25/10/2026).
# A galeria tem tipos/domínios trocados e tags faltando: domínio pelo bloco de numeração do set (como em todos os sets),
# tipo pelo Might e pelo texto. Notação do corpus: [Might] [N] [Rune] [Fury] [Tap] [Add].
# code|name|type|rarity|energy|might|power|tags(;)|text ( " // " = quebra de linha )
DATA = r"""
RAD-001|Amateur Demolitionist|Unit|Common|2|1|0||When you play me, play a Bomb gear token to a battlefield. (It has [Deploy]. When it dies, deal 2 to an enemy there and kill your other Bombs there.)
RAD-002|Banner of Conquest|Gear|Common|1|0|1|Device|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // Friendly units here have [Assault]. (+1 [Might] while they're attackers.)
RAD-003|Bilgewater Tracker|Unit|Common|3|3|0||When you play me, deal 1 to each of up to 2 units.
RAD-004|Brawl|Spell|Common|3|0|1||[Action] (Play on your turn or in showdowns.) // Give a unit [Assault] this turn equal to its Might. (+1 [Might] for each instance of Assault while it's an attacker.)
RAD-005|Lingering Animus|Unit|Common|2|2|0||I enter ready if a friendly unit or gear died this turn.
RAD-006|Scorched Earth|Spell|Common|4|0|1||[Action] (Play on your turn or in showdowns.) // Deal 5 damage split among units at a single battlefield.
RAD-007|Rally for War|Spell|Common|3|0|1||Choose an occupied enemy battlefield. Play three 1 [Might] Recruit unit tokens there.
RAD-008|War Scout|Unit|Common|3|2|0||[Accelerate] (You may pay [1][Fury] as an additional cost to have me enter ready.) // When you play me, give a unit +2 [Might] this turn.
RAD-009|Antagonistic Apparatus|Unit|Uncommon|6|3|1||I enter ready. // When you play me, play a ready 3 [Might] Mech unit token here.
RAD-010|Forbidden Technique|Spell|Uncommon|2|0|0||Ready a unit. // When you play a card with Energy cost [7] or more, you may play this from your trash for [1][Fury][Fury]. Banish this.
RAD-011|Incorrigible Construct|Unit|Uncommon|4|4|0|Mech|[Show Off] a Mech. (As you play me, you may reveal a Mech from hand or pick another friendly Mech.) // I enter ready if you showed off.
RAD-012|Runeblade Anvil|Gear|Uncommon|1|0|0||When you play this or when this leaves the board, banish the top card of your Main Deck. Until your next Ending Phase, you may play that card. (You still pay its costs.) // [2][Chaos], [Tap]: Kill this.
RAD-013|Lost to the Sands|Spell|Uncommon|3|0|1||[Action] (Play on your turn or in showdowns.) // Choose one — // - Deal 4 to a unit at a battlefield. // - Kill a gear.
RAD-014|Shimmering Swimmer|Unit|Uncommon|3|3|0||You may kill a friendly unit or gear as an additional cost to play me. // When you play me, if you paid the additional cost, deal 2 to a unit.
RAD-015|Akali, Brash|Champion Unit|Rare|5|5|1|Ionia;Akali|The first time I move each turn, [Add] [1][Rune]. // The second time I move each turn, banish the top card of your Main Deck. Until your next Ending Phase, you may play that card. (You still pay its costs.)
RAD-016|Coalesced Energy|Unit|Rare|4|4|2|Shurima|At the end of your turn, recycle all your runes, then channel 4 runes exhausted.
RAD-017|Detonation Amplifier|Gear|Rare|4|0|1|Device|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // When you play this, you may kill another friendly unit or gear to draw 1. // Friendly [Deathknell] effects here trigger an additional time.
RAD-018|Drakehound Packmaster|Unit|Rare|9|9|2||When you play me, reveal the top card of each opponent's Main Deck. Choose one and banish it, then play it, ignoring its cost. Recycle the rest.
RAD-019|Firebrand Raider|Unit|Rare|6|6|1||I enter ready. // When you play me, ready all enemy units. // Other units enter ready. // Units don't ready during the Awaken Phase.
RAD-020|Mordekaiser, Twice Slain|Champion Unit|Rare|7|5|1|Noxus;Mordekaiser|[Accelerate] (You may pay [1][Fury] as an additional cost to have me enter ready.) // [Assault 3] (+3 [Might] while I'm an attacker.) // Once each turn, if I would die, you may kill a friendly unit to heal me, exhaust me, and recall me instead.
RAD-021|Ekko, Revolutionary|Champion Unit|Epic|5|4|1|Ekko;Zaun|I enter ready. // [Assault] (+1 [Might] while I'm an attacker.) // [Action] Discard 1, [1][Fury]: Banish me, then play me to your base, ignoring my cost.
RAD-022|Whirling Twirligig|Gear|Epic|4|0|1||[Tap]: Play a Gold gear token exhausted. // Kill a friendly gear, [Tap]: Play a 1 [Might] Recruit unit token. // Kill a friendly unit, [Tap]: Play a 3 [Might] Mech unit token.
RAD-023|Ziggs, Short-Fused|Champion Unit|Epic|5|5|1|Bandle City;Ziggs|When you play me, play a Bomb gear token to a battlefield. (It has [Deploy]. When it dies, deal 2 to an enemy there and kill your other Bombs there.) // Abilities of friendly gear deal 1 Bonus Damage.
RAD-024|Blossoming Dreamroot|Gear|Common|2|0|0|Device|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // When you win a combat here, draw 1.
RAD-025|Consult the Heavens|Spell|Common|1|0|0||[Reaction] (Play any time, even before spells and abilities resolve.) // Give a unit [Shield 2] this turn. (+2 [Might] while it's a defender.) // [Predict]. (Look at the top card of your Main Deck. You may recycle it.)
RAD-026|Entrenched Boar|Unit|Common|2|2|0||You may have me enter ready. If you do, I can't move this turn.
RAD-027|Iridescent Avian|Unit|Common|3|3|0||[Tap]: [Buff] a unit. If it's already buffed, give it +2 [Might] this turn instead. (To buff a unit, give it a +1 [Might] buff if it doesn't have one.)
RAD-028|Ki Burst|Spell|Common|1|0|0||[Action] (Play on your turn or in showdowns.) // As an additional cost to play this, exhaust a friendly unit. // [Stun] a unit. (It doesn't deal combat damage this turn.)
RAD-029|Life from Stone|Spell|Common|1|0|0||[Reaction] (Play any time, even before spells and abilities resolve.) // As an additional cost to play this, exhaust a friendly unit. // Draw 1 and channel 1 rune exhausted.
RAD-030|Sanctum Conservator|Unit|Common|5|5|0||When you play a card with Energy cost [7] or more, ready me.
RAD-031|Stoic Ferryman|Unit|Common|4|2|0||[Shield 3] (+3 [Might] while I'm a defender.) // When you play me to a battlefield, you may move another unit you control here to your base.
RAD-032|Battle Preparations|Spell|Uncommon|2|0|0||[Reaction] (Play any time, even before spells and abilities resolve.) // [Show Off] a gear. (As you play this, you may reveal a gear from hand or pick a friendly gear.) // Give a unit +2 [Might] this turn. If you showed off, ready up to 2 runes.
RAD-033|Command: Attack|Spell|Uncommon|1|0|1||Choose one — // - Move a friendly gear with [Deploy] to a battlefield. // - Look at the top 5 cards of your Main Deck. You may reveal a gear from among them and draw it. Recycle the rest.
RAD-034|Hunker Down|Spell|Uncommon|1|0|0||[Reaction] (Play any time, even before spells and abilities resolve.) // Ready a friendly unit. It can't move this turn. Draw 1.
RAD-035|Invigorating Bloom|Gear|Uncommon|3|0|0||When you play this, give a friendly unit +3 [Might] this turn. // Exhaust a friendly [Mighty] unit, [Tap]: Draw 1. (A unit is Mighty while it has 5+ [Might].)
RAD-036|Storm Raptor|Unit|Uncommon|6|6|0||[Deflect] (Opponents must pay [Rune] to choose me with a spell or ability.) // When a stunned enemy unit dies here, draw 1.
RAD-037|Watchful Curator|Unit|Uncommon|3|4|1||Your gear have [Deflect]. (Opponents must pay [Rune] to choose each with a spell or ability.)
RAD-038|Ahri, Confident|Champion Unit|Rare|4|4|1|Ahri;Ionia|[Disarm] (When I attack, give an enemy unit here -1 [Might] this turn.) // When you reduce the Might of an enemy unit here by 1 or more, give me +1 [Might] this turn.
RAD-039|Ephemeral Ward|Gear|Rare|4|0|2||Your units have +2 [Might]. // When you play a unit, kill this.
RAD-040|Heartening Soul|Unit|Rare|7|7|1||When you play me, ready a friendly legend. // Friendly legends have "[Tap]: Give a unit +3 [Might] this turn."
RAD-041|Hush|Spell|Rare|1|0|2||[Reaction] (Play any time, even before spells and abilities resolve.) // Counter a spell with Power cost [Rune][Rune] or more.
RAD-042|Orianna, Exquisite|Champion Unit|Rare|3|4|0|Piltover;Orianna|[Shield] (+1 [Might] while I'm a defender.) // I don't deal combat damage unless there's a friendly gear here.
RAD-043|Riven, Broken Blade|Champion Unit|Rare|4|4|0|Riven|When I become exhausted, choose one that hasn't been chosen this turn — // - [Buff] me. (Give me a +1 [Might] buff if I don't have one.) // - Spend my buff to [Stun] an enemy unit. (It doesn't deal combat damage this turn.) // - Spend my buff to ready me.
RAD-044|Hunting Blind|Gear|Epic|4|0|2|Device|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // When you play this, you may move an enemy unit to this battlefield. // Friendly units here have [Shield 2]. (+2 [Might] while they're defenders.)
RAD-045|K'Sante, Dauntless|Champion Unit|Epic|4|4|1|Shurima;K'Sante|[Shield] (+1 [Might] while I'm a defender.) // When I attack or defend, double the [Shield] of a unit you control here this turn.
RAD-046|Resplendent Rostrum|Gear|Epic|8|0|1||[Tap]: Draw 1 and channel 1 rune exhausted. // When I become exhausted, give a friendly unit +3 [Might] this turn.
RAD-047|Fanfare|Spell|Common|3|0|0||The next three times you play a unit this turn, draw 1.
RAD-048|High Note|Spell|Common|3|0|0||[Reaction] (Play any time, even before spells and abilities resolve.) // Give a unit -[Might] this turn equal to the number of exhausted units you control.
RAD-049|Industrious Mechsmith|Unit|Common|4|1|0||When you play me, play a 3 [Might] Mech unit token here.
RAD-050|Mysterious Chronomancer|Unit|Common|5|4|0||When you play me, [Predict 2]. (Look at the top 2 cards of your Main Deck. Recycle any of them and put the rest back in any order.) // [Disarm 2] (When I attack, give an enemy unit here -2 [Might] this turn.)
RAD-051|Parallel Convergence|Spell|Common|2|0|1||As an additional cost to play this, return a friendly unit to its owner's hand. // Deal 5 to a unit at a battlefield.
RAD-052|Resource Extractor|Gear|Common|1|0|0|Device|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // At the end of your turn, if you control this battlefield, play a Gold gear token exhausted.
RAD-053|Strigian Oracle|Unit|Common|2|2|0||When I become exhausted, [Predict]. (Look at the top card of your Main Deck. You may recycle it.)
RAD-054|Trinket Peddler|Unit|Common|3|3|0||[Disarm] (When I attack, give an enemy unit here -1 [Might] this turn.)
RAD-055|Clanging Sentry|Unit|Uncommon|3|2|0||Your Mechs have [Disarm]. (When each of us attacks, give an enemy unit there -1 [Might] this turn.)
RAD-056|Improvised Projectile|Spell|Uncommon|3|0|1||[Action] (Play on your turn or in showdowns.) // Choose a friendly gear. Deal damage equal to its Energy cost to a unit at a battlefield.
RAD-057|Piltovan Guidebot|Unit|Uncommon|4|3|0||When you play a card, you may have my base Might become equal to that card's Energy cost this turn.
RAD-058|Riptide Mage|Unit|Uncommon|4|3|1||[Accelerate] (You may pay [1][Mind] as an additional cost to have me enter ready.) // When you play me, give an enemy unit -3 [Might] this turn.
RAD-059|Supernova|Spell|Uncommon|9|0|1||Deal 10 to a unit. Draw 2.
RAD-060|The Empyrean|Unit|Uncommon|8|8|0|Dragon|[Show Off] a card. (As you play me, you may reveal a card from hand or pick another friendly one.) // When you play me, if you showed off a card, [Predict] equal to its Power cost, then draw 2.
RAD-061|Ekko, Ingenious|Champion Unit|Rare|3|4|0|Ekko;Zaun|As an additional cost to play me, return a friendly unit to its owner's hand. // [Ganking] (I can move from battlefield to battlefield.)
RAD-062|Gravity Field|Gear|Rare|5|0|1|Device|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // Opponents must pay [1][Rune] to move one or more units to this battlefield. // [Deathknell] Draw 1. (When I die, get the effect.)
RAD-063|Kai'Sa, Rebel|Champion Unit|Rare|5|5|1|Kai'Sa;The Void|[Disarm] (When I attack, give an enemy unit here -1 [Might] this turn). // While I'm in a showdown, your spells have [Reaction]. (Play them any time, even before spells and abilities resolve.)
RAD-064|Scrutinizing Scope|Gear|Rare|2|0|0||[1], [Tap]: Choose an opponent. They guess a card type. Reveal the top card of your Main Deck. If it has that type, recycle it. Otherwise, draw it. (Unit, gear, and spell are types.)
RAD-065|Seraphine, Inspiring|Champion Unit|Rare|4|3|1|Piltover;Seraphine|[Disarm 2] (When I attack, give an enemy unit here -2 [Might] this turn.) // Once each turn, when you exhaust three or more friendly units at the same time, you may draw 1.
RAD-066|Spirit of the Forge|Unit|Rare|6|4|1||You may return a friendly gear to its owner's hand as an additional cost to play me. // When you play me, if you paid the additional cost, ready me and give me +[Might] this turn equal to the Energy cost of the gear you returned.
RAD-067|Clocktower Guardian|Unit|Epic|8|8|2|Mech|When you play me or when I hold, [Predict 3]. // [Deathknell] Banish the top card of your Main Deck. You may play it, ignoring its Energy cost.
RAD-068|Orianna, Mechanical Marvel|Champion Unit|Epic|5|5|0|Piltover;Orianna|Once each turn, while I'm at a battlefield, you may pay [1][Rune] less to play a gear.
RAD-069|Zero Point Inflection|Gear|Epic|9|0|2||When you play a card, draw 2. // When you draw 1 or more cards with 9 or more other cards in your hand, discard your hand, kill this, and choose an opponent. They score 1 point.
RAD-070|Hold 'Em|Spell|Common|3|0|0||[Action] (Play on your turn or in showdowns.) // This costs [2] less if you've played a unit or gear to a battlefield this turn. // Give a unit +3 [Might] this turn.
RAD-071|Nazuman Ntofo|Gear|Common|1|0|0|Equipment|[Equip] [1] ([1]: Attach this to a unit you control.) // [Shield 2] (+2 [Might] while I'm a defender.)
RAD-072|Overloaded Traveler|Unit|Common|2|2|0||While there's a friendly gear with [Deploy] at my battlefield, I have +1 [Might].
RAD-073|Pillaged Armory|Gear|Common|1|0|0|Device|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // When you play this or when you conquer here, [Buff] a friendly unit. (Give it a +1 [Might] buff if it doesn't have one.)
RAD-074|Raving Witness|Unit|Common|3|3|0||When I move, reveal the top card of your Main Deck. If it's [Mighty], draw it. Otherwise, recycle it. (A unit is Mighty while it has 5+ [Might].)
RAD-075|Skystrike Squadron|Unit|Common|5|4|0||You may return a friendly gear to its owner's hand as an additional cost to play me. If you do, I cost [2] less. // [Deflect] (Opponents must pay [Rune] to choose me with a spell or ability.)
RAD-076|Sneaky Zeebles|Unit|Common|2|1|0||When I conquer, [Add] [Rune]. (Abilities that add resources can't be reacted to.)
RAD-077|Wrath of the Freljord|Unit|Common|9|7|0||I enter ready. // [Shield 3] (+3 [Might] while I'm a defender.)
RAD-078|Armored Tusker|Unit|Uncommon|6|4|1||[Shield 3] (+3 [Might] while I'm a defender.) // [Tank] (I must be assigned combat damage first.) // When I move, you may deal damage equal to my [Shield] to a unit at a battlefield.
RAD-079|Avalanche|Spell|Uncommon|5|0|2||Deal 3 to all units in bases.
RAD-080|Bloodscent Swarm|Unit|Uncommon|8|8|2||I cost [2] less for each battlefield you've conquered this turn.
RAD-081|Elnuk Herd|Unit|Uncommon|6|5|0||[Hidden] (Hide now for [Rune] to react with later for [0].) // When you play me, give another friendly unit +3 [Might] this turn, then recycle me if I was played from face down.
RAD-082|Primordial Roar|Spell|Uncommon|4|0|2||[Show Off] a unit. (As you play this, you may reveal a unit from hand or pick a friendly unit.) // If you showed off a unit, deal damage equal to that unit's Might to a unit.
RAD-083|Stalwart Goatherd|Unit|Uncommon|4|2|0||[Shield 2] (+2 [Might] while I'm a defender.) // When you play me, you may kill a gear with Energy cost [4] or less.
RAD-084|Cataclysm|Spell|Rare|4|0|1||Opponents can't play spells this turn. // Move a friendly unit to an occupied enemy battlefield.
RAD-085|Graves, Blasting Through|Champion Unit|Rare|5|4|1|Bilgewater;Graves|When I attack or defend, deal damage equal to my Might to all enemy units here. // I don't deal combat damage.
RAD-086|K'Sante, Courageous|Champion Unit|Rare|5|4|0|Shurima;K'Sante|[Accelerate] (You may pay [1][Body] as an additional cost to have me enter ready.) // [Shield 2] (+2 [Might] while I'm a defender.) // When I hold, channel 1 rune.
RAD-087|Portable Portal|Gear|Rare|2|0|0|Device|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // When you play this, you may pay [Body] to ready a unit here. // Friendly units here have [Ganking]. (They can move from battlefield to battlefield.)
RAD-088|Staunch Survivor|Unit|Rare|2|2|1||[Assault 2], [Shield 2] (+2 [Might] while I'm an attacker or defender.)
RAD-089|Titanic Shrine|Gear|Rare|3|0|0|Device|When you play a unit with Might greater than each other unit on the board, exhaust me to draw 1.
RAD-090|Evelynn, Consuming|Champion Unit|Epic|5|5|1|Evelynn|[Ambush] (You may play me as a [Reaction] to a battlefield where you have units.) // When you play a card from face down, ready me and give me +1 [Might] this turn.
RAD-091|Jarvan IV, Martial Paragon|Champion Unit|Epic|4|4|1|Demacia;Jarvan IV|Your gear with [Deploy] have [Action]. (They can be played on your turn or in showdowns.) // When I conquer, if there is a friendly gear with [Deploy] here, channel 1 rune exhausted.
RAD-092|Seraphic Wyvern|Unit|Epic|7|7|0|Dragon|If you would channel runes, channel that many runes plus 1 exhausted rune instead.
RAD-093|Disposal Expert|Unit|Common|4|3|0||I enter ready if you control no other units. // [Disarm 2] (When I attack, give an enemy unit here -2 [Might] this turn.)
RAD-094|Explosimian|Unit|Common|6|6|0||When I hold, play three Bomb gear tokens to a single battlefield. (They have [Deploy]. When each dies, deal 2 to an enemy there and kill your other Bombs there.)
RAD-095|Momentary Companion|Unit|Common|4|4|0||[Hidden] (Hide now for [Rune] to react with later for [0].) // When you play me, if it's not your turn, give me [Temporary]. (Kill me at the start of my controller's Beginning Phase, before scoring.)
RAD-096|Satchel Charge|Spell|Common|3|0|1||[Action] (Play on your turn or in showdowns.) // Move a friendly unit, then play a Bomb gear token to a battlefield. (It has [Deploy]. When it dies, deal 2 to an enemy there and kill your other Bombs there.)
RAD-097|Siren of the Shallows|Unit|Common|2|1|0||[Disarm] (When I attack, give an enemy unit here -1 [Might] this turn.) // [Ganking] (I can move from battlefield to battlefield.)
RAD-098|Siren's Song|Spell|Common|2|0|0||[Reaction] (Play any time, even before spells and abilities resolve.) // Move an enemy unit that moved this turn.
RAD-099|Suave Negotiator|Unit|Common|3|3|0||When you play me, choose an opponent. You and that player each draw 1.
RAD-100|The Waters' Wage|Spell|Common|1|0|0||[Hidden] (Hide now for [Rune] to react with later for [0].) // Play a Gold gear token exhausted. If it's your turn and you played this from face down, play three ready Gold gear tokens instead.
RAD-101|An Offer You Can't Refuse|Spell|Uncommon|2|0|0||[Action] (Play on your turn or in showdowns.) // Kill a gear. Its controller plays a Gold gear token exhausted.
RAD-102|Demon Shade|Spell|Uncommon|3|0|0||[Hidden] (Hide now for [Rune] to react with later for [0].) // Choose a friendly unit, then choose one — // - Move it to an open battlefield. // - Give it [Ganking] this turn if there are no open battlefields. (It can move from battlefield to battlefield.)
RAD-103|Gutter Guardian|Unit|Uncommon|3|3|0||[Hidden] (Hide now for [Rune] to react with later for [0].) // [Show Off] a card with [Hidden]. (As you play me, you may reveal such a card from hand or pick another friendly one on the board.) // When you play me, if you showed off, [Add] [Rune].
RAD-104|Pitiless Stalker|Unit|Uncommon|5|5|1||[Tap]: [Stun] an enemy unit. (It doesn't deal combat damage this turn.)
RAD-105|Reckless Innovator|Unit|Uncommon|3|3|0||[Accelerate] (You may pay [1][Chaos] as an additional cost to have me enter ready.) // When I become exhausted, choose one — // - Play a Gold gear token exhausted. // - Pay [Chaos] to draw 1.
RAD-106|The Good Stuff|Gear|Uncommon|3|0|1|Device|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // When you play this, discard 1, then draw 3. // When you hold here, return this to its owner's hand.
RAD-107|Bedeviling Stranger|Unit|Rare|2|2|0||[Hidden] (Hide now for [Rune] to react with later for [0].) // When you play me, choose a battlefield. If there are 4 or more units there, you may return an enemy unit there to its owner's hand.
RAD-108|Bushwhack Trap|Gear|Rare|1|0|0|Device|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // While you or an ally control this battlefield, that player may hide an additional card here.
RAD-109|Evelynn, In Control|Champion Unit|Rare|4|4|1|Evelynn|[Disarm] (When I attack, give an enemy unit here -1 [Might] this turn.) // When I hold, if you control a facedown card here, score 1 point.
RAD-110|Lulu, Whimsical|Champion Unit|Rare|3|3|0|Yordle;Bandle City;Lulu|When I move, you may have another unit's base Might become 4 this turn.
RAD-111|Mechanical Bandit|Gear|Rare|4|0|1|Device|At the start of your Beginning Phase, each player reveals the top card of their Main Deck. If you revealed a card with the lowest Energy cost, draw it. Recycle the rest.
RAD-112|Ziggs, Explosive|Champion Unit|Rare|4|4|0|Bandle City;Ziggs|[1], [Tap]: Play a Bomb gear token to a battlefield. (It has [Deploy]. When it dies, deal 2 to an enemy there and kill your other Bombs there.) // When I defend, you may kill a friendly gear to give me +2 [Might] this turn.
RAD-113|Angler Wyrm|Unit|Epic|8|8|0||[Deflect] (Opponents must pay [Rune] to choose me with a spell or ability.) // [Tap]: Choose an opponent. They must move a unit they control to my battlefield.
RAD-114|Riven, Deserter|Champion Unit|Epic|5|5|1|Riven|When another friendly unit becomes exhausted, give me +1 [Might] this turn. // Exhaust a friendly unit: Ready a unit. Use this ability only once each turn.
RAD-115|Transpositionist|Unit|Epic|6|4|0||[Chaos], [Tap]: Return a friendly unit to its owner's hand. You may play a unit with less Might than that unit had, ignoring its cost.
RAD-116|Concert Poster|Gear|Common|1|0|0|Device|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // When you play this or when you conquer here, you may pay [1] to play a 1 [Might] Recruit unit token to your base.
RAD-117|For Demacia!|Spell|Common|3|0|0||[Reaction] (Play any time, even before spells and abilities resolve.) // Choose a battlefield. Give friendly units there [Shield 2] this turn. (+2 [Might] while they're defenders.)
RAD-118|Herald of the Emperor|Unit|Common|5|3|0||When you play me, choose a friendly unit. Its base Might becomes 5 this turn.
RAD-119|Hunting Dog|Unit|Common|3|3|0|Dog|[Deathknell] Play a 1 [Might] Bird unit token with [Deflect] to your base. (When I die, get the effect.)
RAD-120|Meticulous Restorationist|Unit|Common|2|2|0||When you play a card with Energy cost [7] or more, you may play me from your trash for [Order].
RAD-121|One-Two Punch|Spell|Common|3|0|0||[Action] (Play on your turn or in showdowns.) // [Buff] a friendly unit and [Stun] an enemy unit. (Give the friendly unit a +1 [Might] buff if it doesn't have one. The enemy unit doesn't deal combat damage this turn.)
RAD-122|Party Crasher|Unit|Common|9|6|1||I cost [1] less for each exhausted unit you control. // [Tank] (I must be assigned combat damage first.)
RAD-123|Protector's Shield|Gear|Common|2|0|1|Equipment|[Quick-Draw] (This has [Reaction]. When you play it, attach it to a unit you control.) // [Equip] [1] ([1]: Attach this to a unit you control.)
RAD-124|Burn Away|Spell|Uncommon|3|0|1||Banish a unit with 3 [Might] or less or a gear. [Burn 2]. (Put the top 2 cards of your Main Deck into your trash.)
RAD-125|Dune Devourer|Unit|Uncommon|7|7|1||You may kill a friendly unit as an additional cost to play me. If you do, I cost [2] less. // [Deflect] (Opponents must pay [Rune] to choose me with a spell or ability.)
RAD-126|Mournful Spirit|Unit|Uncommon|4|1|0|Spirit|[Deathknell] You may kill a unit or gear here. (When I die, get the effect.)
RAD-127|Rousing Display|Spell|Uncommon|5|0|0||[Show Off] a card with Energy cost [7] or more. (As you play this, you may reveal such a card from hand or pick a friendly one.) // Play two 1 [Might] Recruit unit tokens to your base. If you showed off, play four to your base instead.
RAD-128|Steadfast Outrider|Unit|Uncommon|4|3|0||[Tank] (I must be assigned combat damage first.) // While there are 2 or more other friendly units and/or gear at my battlefield, I have +2 [Might].
RAD-129|Trifarian Captain|Unit|Uncommon|2|1|0||When you play me, look at the top 4 cards of your Main Deck. You may reveal from among them a unit or gear with Energy cost no more than [3] and with Power cost no more than [Rune] and draw it. Recycle the rest.
RAD-130|Battlefield Armorer|Unit|Rare|3|3|0||When a friendly gear at a battlefield dies, you may pay [1] to return it to its owner's hand.
RAD-131|Demacian Illuminators|Unit|Rare|3|3|1||When one or more friendly units die, [Buff] a friendly unit. (Give it a +1 [Might] buff if it doesn't have one.)
RAD-132|Heimerdinger, Academy Instructor|Champion Unit|Rare|6|5|1|Yordle;Heimerdinger;Piltover|If you would play a unit token to a location while I'm at a battlefield, you may play a 3 [Might] Mech unit token to that same location instead.
RAD-133|Jarvan IV, Royal Heir|Champion Unit|Rare|7|7|1|Demacia;Jarvan IV|[Assault] (+1 [Might] while I'm attacking.) // [Tank] (I must be assigned combat damage first.) // When I attack, you may move a unit you control to my battlefield.
RAD-134|Raucous Anthem|Spell|Rare|7|0|1||Ready your units and give them +3 [Might] this turn.
RAD-135|Remember the Fallen|Spell|Rare|8|0|2||Play up to 3 units and/or gear from your trash, each with Energy cost no more than [3] and Power cost no more than [Rune], ignoring their costs.
RAD-136|Dockside Lock-Up|Gear|Epic|6|0|2|Device|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // When you play this, banish a unit here. // When you hold here, kill this to play the banished card, ignoring its cost. (Tokens aren't cards.)
RAD-137|Mordekaiser, Dominating|Champion Unit|Epic|9|8|2|Noxus;Mordekaiser|When you play me or when I attack, you may discard 1 to kill a unit or gear.
RAD-138|Seraphine, Not Alone|Champion Unit|Epic|5|1|1|Seraphine;Piltover|When you play me or when I become exhausted, play a 1[Might] Recruit unit token to your base. // I have +1[Might] for each other exhausted unit you control.
RAD-139|Boy Who Shattered Time|Legend|Rare|0|0|0|Ekko|[Empower] — [1], [Tap] (Use only if not Empowered.) // Disempower me, [Tap]: Reduce the cost of the next unit you play this turn by [2][Rune] and give it "Kill me at end of turn."
RAD-140|Chronobreak|Signature Spell|Epic|2|0|0|Ekko|As an additional cost to play this, pay any amount of Power. // Banish that many units you control, then for each, its owner plays that unit back to the same location or to their base, ignoring its cost. (You choose the order.)
RAD-141|Hexplosives Expert|Legend|Rare|0|0|0|Yordle;Ziggs|[1][Rune], [Tap]: Play a Bomb gear token to a battlefield. (It has [Deploy]. When it dies, deal 2 to an enemy there and kill your other Bombs there.)
RAD-142|Hexplosive Minefield|Signature Spell|Epic|2|0|1|Ziggs|[Action] (Play on your turn or in showdowns.) // Kill any number of friendly Bomb tokens. At end of turn, play that many Bomb tokens to a single battlefield.
RAD-143|Iron Revenant|Legend|Rare|0|0|0|Mordekaiser|[Reaction] Banish a unit or gear from your trash, [Tap]: [Add] [Rune]. Spend this Power only to play units or gear. (Abilities that add resources can't be reacted to.)
RAD-144|Realm of Death|Signature Spell|Epic|2|0|1|Mordekaiser|Give an enemy unit -2 [Might] this turn and a friendly unit +2 [Might] this turn. They deal damage equal to their Mights to each other.
RAD-145|Lady of Clockwork|Legend|Rare|0|0|0|Orianna|At the start of your Main Phase, you may pay [1] to choose a friendly gear. It becomes a unit gear with Might equal to its Energy cost until you choose another gear with me.
RAD-146|The Ball|Signature Gear|Epic|5|0|1|Device;Orianna|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // [Ganking] (While this is a unit, it can move from battlefield to battlefield.) // When you play or move this, choose one — // - Draw 1. // - Deal 2 to enemy units here.
RAD-147|Pride of Nazumah|Legend|Rare|0|0|0|K'Sante|[1], [Tap]: Give a friendly unit "I have [Assault] equal to my [Shield]" this turn. (+1 [Might] for each instance of Assault while it's an attacker.)
RAD-148|Ntofo Strikes|Signature Spell|Epic|2|0|1|K'Sante|[Action] (Play on your turn or in showdowns.) // Give a friendly unit [Shield 2] this turn, then deal damage equal to its [Shield] to an enemy unit. (A unit with Shield has +1 [Might] for each instance of Shield while it's a defender.)
RAD-149|The Exile|Legend|Rare|0|0|0|Riven|Units you play to battlefields you control enter ready.
RAD-150|Blade of the Exile|Signature Gear|Epic|3|0|1|Equipment;Riven|[Equip] — [Rune] or exhaust a friendly unit. (Pay the cost: Attach this to a unit you control.)
RAD-151|Starry-Eyed Songstress|Legend|Rare|0|0|0|Seraphine|As an additional cost to play a spell, you may exhaust me and three friendly units to reduce the cost of that spell by [2].
RAD-152|Encore|Signature Spell|Epic|3|0|1|Seraphine|Choose two — // - Deal 2 to a unit. // - Play two 1 [Might] Recruit unit tokens. // - Give up to two units each +1 [Might] this turn. // - Look at the top 2 cards of your Main Deck, draw 1 and recycle the other.
RAD-153|Agony's Embrace|Legend|Rare|0|0|0|Evelynn|Once each turn, when you play a card from face down, draw 1. Then, if it's not your turn, discard 1.
RAD-154|Last Caress|Signature Spell|Epic|2|0|0|Evelynn|[Reaction] (Play any time, even before spells and abilities resolve.) // The next unit you play this turn (even from face down) can be played to any battlefield. When you play it, [Buff] it. (Give it a +1 [Might] buff if it doesn't have one.)
RAD-155|Exemplar of Demacia|Legend|Rare|0|0|0|Jarvan IV|When you play a gear with [Deploy], you may exhaust me and pay [Rune] to move a friendly unit to that battlefield.
RAD-156|Demacian Standard|Signature Gear|Epic|2|0|1|Device;Jarvan IV|[Deploy] (Play this only to a battlefield. When an opponent holds here, kill this.) // When one or more friendly units attack here, give one of them +2 [Might] this turn. // When you hold here, you may return this to its owner's hand.
RAD-157|Bandle Scouts' Academy|Battlefield|Uncommon|0|0|0||When you hide a card here, play a Gold gear token exhausted.
RAD-158|Black Market|Battlefield|Uncommon|0|0|0||[Rune][Rune]: Draw 1. Each player may use this ability once on their turn (even if they don't control this battlefield).
RAD-159|Black Rose Sanctum|Battlefield|Uncommon|0|0|0||For each player, the first time each turn a non-token unit they control dies here, they play a 1 [Might] Recruit unit token to their base.
RAD-160|Cosmic Vista|Battlefield|Uncommon|0|0|0||When you hold here, if your Rune Deck is empty, you score 1 point.
RAD-161|Durand Memorial|Battlefield|Uncommon|0|0|0||When you defend here, choose a unit you control here. Give it [Tank] this combat. (It must be assigned combat damage first.)
RAD-162|Firelights' Hideout|Battlefield|Uncommon|0|0|0||When you conquer here, the next unit you play this turn has [Accelerate]. (You may pay [1] and a Power of its Domain as an additional cost to have it enter ready.)
RAD-163|Hunters' Circle|Battlefield|Uncommon|0|0|0||For each player, the first unit or gear they play here on their turn costs [1] less.
RAD-164|Packed Amphitheater|Battlefield|Uncommon|0|0|0||Champion units here have +1 [Might].
RAD-165|Rakelstake|Battlefield|Uncommon|0|0|0||For each player, the first time they play a unit or gear here each turn, they [Predict]. (They look at the top card of their Main Deck. They may recycle it.)
RAD-166|Ruined Monastery|Battlefield|Uncommon|0|0|0||When you conquer here, you may discard 1 and channel 1 rune exhausted.
RAD-167|Neeko, Blending In|Champion Unit|Epic|6|4|1|Ixtal;Neeko|(Neutral cards can go in decks of any Domain.) // If Neeko is in your deck, choose 3 different legends in addition to your starting legend. (Different means none match names.) // When you play me, choose one of those legends and add it to your Legend Zone while I'm on the board.
"""
BLOCKS = [(23, 'Fury'), (46, 'Calm'), (69, 'Mind'), (92, 'Body'), (115, 'Chaos'), (138, 'Order')]
EXTRA_DOMAINS = {  # lendas e assinaturas (dois domínios), campos sem domínio
    139: ['Fury', 'Mind'], 140: ['Fury', 'Mind'], 141: ['Fury', 'Chaos'], 142: ['Fury', 'Chaos'],
    143: ['Fury', 'Order'], 144: ['Fury', 'Order'], 145: ['Calm', 'Mind'], 146: ['Calm', 'Mind'],
    147: ['Calm', 'Body'], 148: ['Calm', 'Body'], 149: ['Calm', 'Chaos'], 150: ['Calm', 'Chaos'],
    151: ['Mind', 'Order'], 152: ['Mind', 'Order'], 153: ['Body', 'Chaos'], 154: ['Body', 'Chaos'],
    155: ['Body', 'Order'], 156: ['Body', 'Order'], 167: [],
}
# tags lidas da linha de tipo das artes oficiais (a galeria omite/erra tags); cartas 001-138, campeões e assinaturas
ART_TAGS = {'RAD-001': ['Bandle City', 'Yordle'], 'RAD-003': ['Bilgewater'], 'RAD-005': ['Shadow Isles', 'Spirit'], 'RAD-008': ['Demacia', 'Yordle'], 'RAD-009': ['Bandle City', 'Yordle', 'Mech'], 'RAD-011': ['Piltover', 'Mech'], 'RAD-014': ['Bilgewater'], 'RAD-015': ['Akali', 'Ionia'], 'RAD-016': ['Shurima'], 'RAD-018': ['Noxus'], 'RAD-019': ['Freljord'], 'RAD-020': ['Mordekaiser', 'Noxus', 'Spirit'], 'RAD-021': ['Ekko', 'Zaun'], 'RAD-023': ['Ziggs', 'Zaun', 'Yordle'], 'RAD-026': ['Freljord'], 'RAD-027': ['Ixtal', 'Bird'], 'RAD-030': ['Shurima'], 'RAD-031': ['Bilgewater', 'Sentinel'], 'RAD-036': ['Freljord', 'Bird'], 'RAD-037': ['Piltover'], 'RAD-038': ['Ahri', 'Ionia'], 'RAD-040': ['Shadow Isles', 'Spirit'], 'RAD-042': ['Orianna', 'Piltover'], 'RAD-043': ['Riven', 'Noxus'], 'RAD-045': ["K'Sante", 'Shurima'], 'RAD-049': ['Zaun'], 'RAD-050': ['Shurima'], 'RAD-053': ['Freljord', 'Bird'], 'RAD-054': ['Bandle City', 'Yordle'], 'RAD-055': ['Piltover', 'Mech'], 'RAD-057': ['Piltover', 'Mech'], 'RAD-058': ['Bilgewater'], 'RAD-060': ['Ionia', 'Dragon'], 'RAD-061': ['Ekko', 'Zaun'], 'RAD-063': ["Kai'Sa", 'The Void'], 'RAD-065': ['Seraphine', 'Piltover'], 'RAD-066': ['Freljord', 'Spirit'], 'RAD-067': ['Shurima'], 'RAD-068': ['Orianna', 'Piltover'], 'RAD-071': ['Equipment'], 'RAD-072': ['Bandle City', 'Yordle'], 'RAD-074': ['Freljord'], 'RAD-075': ['Demacia', 'Elite', 'Bird'], 'RAD-076': ['Mount Targon'], 'RAD-077': ['Freljord', 'Spirit'], 'RAD-078': ['Noxus'], 'RAD-080': ['Shurima'], 'RAD-081': ['Freljord'], 'RAD-083': ['Mount Targon'], 'RAD-085': ['Graves', 'Bilgewater'], 'RAD-086': ["K'Sante", 'Shurima'], 'RAD-088': ['Freljord'], 'RAD-090': ['Evelynn', 'Demon'], 'RAD-091': ['Jarvan IV', 'Demacia'], 'RAD-092': ['Mount Targon', 'Dragon'], 'RAD-093': ['Bandle City', 'Yordle'], 'RAD-094': ['Zaun'], 'RAD-095': ['Shadow Isles', 'Demon'], 'RAD-097': ['Bilgewater'], 'RAD-099': ['Bilgewater', 'Demon'], 'RAD-103': ['Zaun'], 'RAD-104': ['Shadow Isles', 'Cat'], 'RAD-105': ['Piltover'], 'RAD-107': ['Shadow Isles', 'Demon'], 'RAD-109': ['Evelynn', 'Demon'], 'RAD-110': ['Lulu', 'Bandle City', 'Yordle'], 'RAD-112': ['Ziggs', 'Zaun', 'Yordle'], 'RAD-113': ['Bilgewater', 'Dragon'], 'RAD-114': ['Riven', 'Noxus'], 'RAD-115': ['Bilgewater'], 'RAD-118': ['Shurima'], 'RAD-119': ['Demacia', 'Dog'], 'RAD-120': ['Piltover'], 'RAD-122': ['Zaun'], 'RAD-123': ['Equipment'], 'RAD-125': ['The Void'], 'RAD-126': ['Shadow Isles', 'Spirit'], 'RAD-128': ['Demacia'], 'RAD-129': ['Noxus', 'Trifarian'], 'RAD-130': ['Demacia'], 'RAD-131': ['Demacia'], 'RAD-132': ['Heimerdinger', 'Piltover', 'Yordle'], 'RAD-133': ['Jarvan IV', 'Demacia'], 'RAD-137': ['Mordekaiser', 'Noxus', 'Spirit'], 'RAD-138': ['Seraphine', 'Piltover'], 'RAD-140': ['Ekko'], 'RAD-142': ['Ziggs'], 'RAD-144': ['Mordekaiser'], 'RAD-146': ['Orianna'], 'RAD-148': ["K'Sante"], 'RAD-150': ['Riven', 'Equipment'], 'RAD-152': ['Seraphine'], 'RAD-154': ['Evelynn'], 'RAD-156': ['Jarvan IV'], 'RAD-167': ['Neeko', 'Ixtal']}
MIGHT_BONUS = {'RAD-123': 1, 'RAD-150': 3}


def records():
    out = {}
    for line in DATA.strip().splitlines():
        code, name, typ, rar, e, m, p, tags, text = line.split('|', 8)
        n = int(code[4:])
        doms = EXTRA_DOMAINS[n] if n in EXTRA_DOMAINS else ([] if typ == 'Battlefield' else [d for lim, d in BLOCKS if n <= lim][:1])
        out[code] = {
            'code': code, 'name': name, 'type': typ, 'rarity': rar, 'set': 'Radiance', 'domains': doms,
            'energy': int(e), 'power': int(p), 'might': int(m), 'mightBonus': MIGHT_BONUS.get(code, 0),
            'tags': ART_TAGS.get(code, []) if (n <= 138 or code in ART_TAGS) else [t for t in tags.split(';') if t], 'text': text.replace(' // ', '\n'), 'effectText': '',
            'errata': False,
        }
    return out
