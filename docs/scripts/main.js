var DEBUG_CONVEYOR_BELT_NUMBERS = true;

var ASSET_PATHS = {
  BG: 'images/bg-1px.png',
  CONVEYOR_BELTS: {
    1: 'images/conveyor-belt1.png',
    2: 'images/conveyor-belt2.png',
    3: 'images/conveyor-belt3.png',
    4: 'images/conveyor-belt4.png'
  },
  DROP_PLATFORM: 'images/platform.png',
  SPOTLIGHT: 'images/spotlight.png',
  GIFTS: [
    'images/item-gift1-xmas.png',
    'images/item-gift2-xmas.png'
  ],
  BAD_GIFTS: [
    'images/item-heart.png',
    'images/item-pot-of-gold.png',
    'images/item-pumpkin.png',
    'images/item-turkey.png'
  ],
  SACK: {
    OPEN: 'images/bag-open.png',
    CLOSED: 'images/bag-closed.png',
    SPIT: 'images/bag-spit.png',
  },
  SCALE: 'images/scale-pole.png',
  NEEDLE: 'images/scale-arrow.png',

  ARMS: {
    OPEN: 'images/arms-hands-reach.png',
    CLOSED: 'images/arms-hands-grab.png',
  }
};

var ASSET_SCALE = 0.33;

var LEFT = 1;
var RIGHT = 2;

var GOOD = 1;
var BAD = 2;

var TOP = 1;
var BOTTOM = 2;

var HEIGHT = 1080;
var WIDTH = 1920;

var FPS = 60;

var NEEDLE_ROT_MIN = -Math.PI / 2;
var NEEDLE_ROT_MAX = Math.PI / 2;
var MAX_SCORE = 60;

var MAX_GIFTS_PER_CONVEYOR_BELT = 5;
var BAD_GIFT_CHANCE = 0.25;

var g_conveyorBeltToGifts = new Map();
var g_conveyorBeltToData = new Map();
var g_keyToConveyorBelt = new Map();

var g_giftToType = new Map();

var g_eventQueue = [];
var g_tweens = [];

var g_feedPaused = false;

var SLOWEST_TIME_BETWEEN_FEEDS = 0.5;
var FASTEST_TIME_BETWEEN_FEEDS = 0.2;

var TIME_BETWEEN_FEED_OPTIONS = [
  0.5,
  0.4,
  0.3,
  0.2,
  0.1
];

var g_selectedTimeBetweenFeedIndex = 0;

var g_feedTimer = 0;
var g_nextConveyorBeltIndex = 0;
var g_score = 0;

var g_roundStartTime = null;
var g_roundEndTime = null;

// {name: 'name', score: 0}
var g_bestTimes = [];
var g_playerBestTimeEntry = null;
var NUM_BEST_TIMES_TO_STORE = 10;

var STATES = {
  STARTING: 'STARTING',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED'
};

var g_state = STATES.STARTING;

var bestTimeSortFn = function(bestTimeEntryA, bestTimeEntryB) {
  return bestTimeEntryA.time - bestTimeEntryB.time;
};

var loadBestTimes = function () {
  var bestTimesJson = window.localStorage.getItem('bestTimes.json');
  var bestTimes = bestTimesJson ? JSON.parse(bestTimesJson) : [];
  bestTimes.sort(bestTimeSortFn);
  return bestTimes;
};

var saveBestTimes = function (bestTimes) {
  var bestTimesJson = JSON.stringify(bestTimes);
  window.localStorage.setItem('bestTimes.json', bestTimesJson);
};

var createBestTime = function(roundTime, playerName) {
  return {time: roundTime, name: playerName};
};


// assumes bestTimes is sorted from min -> max round time
// if tie with the bottom of leaderboard, returns true
var isNewBestTime = function(bestTimes, currRoundTime) {
  if (bestTimes.length <= 0) { return true; }
  return bestTimes[bestTimes.length - 1].time >= currRoundTime;
};

// returns the new best time entry;
var updateBestTimes = function(bestTimes, currRoundTime, playerName) {
  var newBestTime = createBestTime(currRoundTime, playerName);

  var worstOfBestTimeEntries = bestTimes[0];
  var worstOfBestTimeEntriesIdx = 0;

  bestTimes.push(newBestTime);
  bestTimes.sort(bestTimeSortFn);

  while (bestTimes.length > NUM_BEST_TIMES_TO_STORE) {
    bestTimes.pop();
  }

  return newBestTime;
};

var getTickerDt = function (ticker) {
  var ms = Math.min(ticker.elapsedMS, ticker._maxElapsedMS);
  return ms / 1000 * ticker.speed;
};

var expoInOut = function(t, start, end) {
  if (t === 0) { return start; }
  if (t === 1) { return end; }

  var t2 = t * 2;

  if (t2 < 1) {
    return ((end - start) / 2) * (Math.pow(2, 10 * (t2 - 1)) + start);
  } else {
    return ((end - start) / 2) * (-Math.pow(2, -10 * (t2 - 1)) + 2) + start;
  }
};

var linear = function(t, start, end) {
  return start + (end - start) * t;
};

var quadIn = function(t, start, end) {
  return (end - start) * (t * t) + start;
};

var lutEasing = function (lut, t) {
  var idx = Math.floor(linear(t, 0, lut.length - 1));
  return lut[idx];
};

var createTween = function (obj, start, end, duration, easingFunc, onComplete) {
  onComplete = onComplete || null;

  var tween =  {
    obj: obj,
    start: start,
    end: end,
    duration: duration,
    easingFunc: easingFunc,
    onComplete: onComplete,
    t: 0
  };

  return tween;
};

var createTimerTween = function(duration, onComplete) {
  return createTween({}, {}, null, duration, linear, onComplete);
};

var removeTweensFromObj = function(obj) {
  var indicesToRemove = [];

  for (var i = 0; i < g_tweens.length; i++){
    var tween = g_tweens[i];
    if (tween.obj === obj) {
      indicesToRemove.push(i);
    }
  }

  for (var i = 0; i < indicesToRemove.length; i++) {
    g_tweens.splice(indicesToRemove[i], 1);
  }
}

var updateTween = function (dt, tween) {
  var obj = tween.obj;

  if (!obj) {
    tween.t = tween.duration;
    tween.onComplete(tween);
    return;
  }

  for (var prop in tween.end) {
    if (!tween.end.hasOwnProperty(prop)) { continue; }

    var newVal = tween.easingFunc(tween.t / tween.duration, tween.start[prop], tween.end[prop]);
    // TODO: CLEAN UP THIS CHECK! There has to be a way..
    if (newVal[prop]) {
      obj[prop] = newVal[prop]; // assume newVal has same props as tween.start/end
    } else {
      obj[prop] = newVal;
    }
  }

  if (tween.t >= tween.duration && tween.onComplete) {
    tween.onComplete(tween);
  }

  tween.t = Math.min(tween.t + dt, tween.duration);
};

var increaseScore = function(increase) {
  g_score += increase;
  g_score = Math.min(Math.max(g_score, 0), MAX_SCORE);
};

var updateNeedle = function(dt, sceneIndex) {
  sceneIndex.needle.rotation = linear(g_score / MAX_SCORE, NEEDLE_ROT_MIN, NEEDLE_ROT_MAX);
};

var getDropConveyorBelt = function(conveyorBelt) {
  var parent = conveyorBelt.parent;
  var index = parent.children.indexOf(conveyorBelt);
  return parent.children[index + 1];
};

var getConveyorBeltFromDirection = function(conveyorBelt) {
  return g_conveyorBeltToData.get(conveyorBelt).fromDirection;
};


var getTimeBetweenFeeds = function() {
  return TIME_BETWEEN_FEED_OPTIONS[g_selectedTimeBetweenFeedIndex];
};


var getGiftStartPosition = function(gift, conveyorBelt) {
  var fromDirection = getConveyorBeltFromDirection(conveyorBelt);

  var conveyorBeltGlobalPos = conveyorBelt.getGlobalPosition();
  var conveyorBeltBounds = conveyorBelt.getBounds();

  var x = fromDirection === LEFT ? -gift.width : WIDTH + gift.width;
  var y = conveyorBeltGlobalPos.y - conveyorBeltBounds.height / 2 - gift.height / 2;

  return new PIXI.Point(x, y);
};

var getGiftTransforms = function(conveyorBelt) {
  var dropConveyorBelt = getDropConveyorBelt(conveyorBelt);

  var conveyorBeltGlobalPos = conveyorBelt.getGlobalPosition();
  var dropConveyorBeltGlobalPos = dropConveyorBelt.getGlobalPosition();

  var rotation = conveyorBelt.rotation;

  var directionMultiplier = getConveyorBeltFromDirection(conveyorBelt) === LEFT ? -1 : 1;

  var x1 = directionMultiplier * ((1/5) * conveyorBelt.width) * Math.cos(rotation);
  var y1 = directionMultiplier * ((1/5) * conveyorBelt.width) * Math.sin(rotation) - conveyorBelt.height / 2;

  var x2 = 0;
  var y2 = -conveyorBelt.height / 2;

  var x3 = -directionMultiplier * ((1/5) * conveyorBelt.width) * Math.cos(rotation);
  var y3 = -directionMultiplier * ((1/5) * conveyorBelt.width) * Math.sin(rotation) - conveyorBelt.height / 2;

  var x4 = -directionMultiplier * ((2/5) * conveyorBelt.width) * Math.cos(rotation);
  var y4 = -directionMultiplier * ((2/5) * conveyorBelt.width) * Math.sin(rotation) - conveyorBelt.height / 2;

  var x5 = -10 * directionMultiplier;
  var y5 = -dropConveyorBelt.height / 2;

  return [
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x1, conveyorBeltGlobalPos.y + y1), rotation: conveyorBelt.rotation},
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x2, conveyorBeltGlobalPos.y + y2), rotation: conveyorBelt.rotation},
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x3, conveyorBeltGlobalPos.y + y3), rotation: conveyorBelt.rotation},
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x4, conveyorBeltGlobalPos.y + y4), rotation: conveyorBelt.rotation},
    {position: new PIXI.Point(dropConveyorBeltGlobalPos.x + x5, dropConveyorBeltGlobalPos.y + y5), rotation: 0},
  ]
};

var rollForGiftType = function() {
  return (Math.random() < BAD_GIFT_CHANCE) ? BAD : GOOD;
};

var createRandomGift = function(type) {
  var giftType = type;
  var giftAssetList = (giftType === GOOD) ? ASSET_PATHS.GIFTS : ASSET_PATHS.BAD_GIFTS;
  var giftAsset = giftAssetList[Math.floor(Math.random() * giftAssetList.length)];

  var gift = PIXI.Sprite.fromFrame(giftAsset);
  gift.anchor.set(0.5, 1);
  gift.scale.set(ASSET_SCALE);

  return gift;
};

var addGift = function(giftContainer) {
  var giftType = rollForGiftType();
  var gift = createRandomGift(giftType);

  giftContainer.addChild(gift);
  g_giftToType.set(gift, giftType);

  return gift;
};

var removeGift = function(gift) {
  gift.parent.removeChild(gift);
};

var clearGifts = function(giftContainer) {
  giftContainer.removeChildren();
}

var startTween = function(tween) {
  var onComplete = tween.onComplete;

  tween.onComplete = function(t) {
    if (onComplete) { onComplete(t); }
    g_tweens.splice(g_tweens.indexOf(tween), 1);
  }

  g_tweens.push(tween);

  return tween;
};

var createGiftTweens = function(gift, endPos, endRot) {
  var DURATION = getTimeBetweenFeeds() / 3;

  var startPos = new PIXI.Point(gift.x, gift.y);

  var posTween = createTween(gift.position, startPos, endPos, DURATION, linear);
  var rotTween = createTween(gift, {rotation: gift.rotation}, {rotation: endRot}, DURATION, linear);

  startTween(posTween);
  startTween(rotTween);
};

var createFallingTween = function(gift, sack, direction) {
  var DROP_DURATION = 0.5;;

  var directionMultiplier = (direction === LEFT) ? 1 : -1;

  var startPos = new PIXI.Point(gift.x, gift.y);
  var endPos = new PIXI.Point(sack.x + directionMultiplier * 20, sack.y)

  var bezier = new Bezier(
    startPos.x, startPos.y,
    endPos.x, startPos.y,
    //startPos.x + directionMultiplier * 100, startPos.y,
    // endPos.x - directionMultiplier * 10, endPos.y - 200,
    endPos.x - directionMultiplier * 10, endPos.y - 200,
    endPos.x, endPos.y
  );

  var fallEasing = lutEasing.bind(null, bezier.getLUT(DROP_DURATION * FPS));

  var positionTween = createTween(gift.position, startPos, endPos, DROP_DURATION, fallEasing);
  startTween(positionTween);

  
  var startRot = gift.rotation;
  var endRot = directionMultiplier * (Math.random() * Math.PI / 4 + Math.PI / 8);

  var rotationTween = createTween(gift, {rotation: gift.rotation}, {rotation: endRot}, DROP_DURATION, linear);
  startTween(rotationTween);
};

var feedGifts = function(conveyorBelt, giftContainer, sack) {
  var newGift = addGift(giftContainer);
  newGift.position = getGiftStartPosition(newGift, conveyorBelt);

  var gifts = g_conveyorBeltToGifts.get(conveyorBelt);
  var giftTransforms = getGiftTransforms(conveyorBelt);

  gifts.unshift(newGift);

  var fallingGift = (gifts.length > giftTransforms.length) ? gifts.pop() : null;

  for(var i = 0; i < gifts.length; i++) {
    var gift = gifts[i];
    var nextGiftTransform = giftTransforms[i];
    // TODO: add a tween here instead
    //gift.position = nextGiftTransform.position;
    //gift.rotation = nextGiftTransform.rotation;
    createGiftTweens(gift, nextGiftTransform.position, nextGiftTransform.rotation);
  }

  if (fallingGift) {
    createFallingTween(fallingGift, sack, getConveyorBeltFromDirection(conveyorBelt));
  }
};


var updateFeedTimer = function(dt, sceneIndex) {
  if (g_feedPaused) { return; }

  g_feedTimer += dt;
  if (g_feedTimer >= getTimeBetweenFeeds()) {
    var conveyorBelt = sceneIndex.allConveyorBeltsContainer.children[g_nextConveyorBeltIndex];
    feedGifts(conveyorBelt, sceneIndex.giftContainer, sceneIndex.sack);
    g_nextConveyorBeltIndex = (g_nextConveyorBeltIndex + 2) % sceneIndex.allConveyorBeltsContainer.children.length;
    g_feedTimer = 0;
  }
};

var getGiftToGrabFromConveyorBelt = function(conveyorBelt) {
  var gifts = g_conveyorBeltToGifts.get(conveyorBelt);
  if (gifts.length >= MAX_GIFTS_PER_CONVEYOR_BELT) {
    return gifts[gifts.length - 1];
  }

  return null;
};

var grabGift = function(gift, sceneIndex, topOrBottom) {
  var DURATION = 0.5;

  var giftGrabContainer = sceneIndex.giftGrabContainer;
  var armsContainer = sceneIndex.armsContainer;

  gift.parent.removeChild(gift);
  giftGrabContainer.addChild(gift);

  var arms = PIXI.Sprite.fromFrame(ASSET_PATHS.ARMS.OPEN);
  arms.anchor.set(0.5, 1);
  arms.scale.set(ASSET_SCALE);
  armsContainer.addChild(arms);

  var armStartPos = new PIXI.Point(
    Math.random() * (3/5) * WIDTH + (1/5) * WIDTH,
    (topOrBottom === TOP) ? -100 : HEIGHT + 100
  );

  var armsGrabPos = new PIXI.Point(gift.x, gift.y);

  var rotation = -Math.atan2(
    armsGrabPos.x - armStartPos.x,
    armsGrabPos.y - armStartPos.y
  );

  arms.rotation = rotation;

  arms.texture = PIXI.utils.TextureCache[ASSET_PATHS.ARMS.OPEN];

  var armGrabTween = createTween(arms.position, armStartPos, armsGrabPos, (1/2) * DURATION, quadIn, function(tween) {
    arms.texture = PIXI.utils.TextureCache[ASSET_PATHS.ARMS.CLOSED];

    var retractArmsTween = createTween(arms.position, armsGrabPos, armStartPos, (1/2) * DURATION, quadIn);
    var pullGiftTween = createTween(gift.position, armsGrabPos, armStartPos, (1/2) * DURATION, quadIn, function(tween) {
      removeGift(gift);
      armsContainer.removeChild(arms);
    });

    startTween(retractArmsTween);
    startTween(pullGiftTween);
  });

  startTween(armGrabTween);
};

var increaseFeedSpeed = function() {
  g_selectedTimeBetweenFeedIndex = Math.min(g_selectedTimeBetweenFeedIndex + 1, TIME_BETWEEN_FEED_OPTIONS.length - 1);
};

var decreaseFeedSpeed = function() {
  g_selectedTimeBetweenFeedIndex = Math.max(g_selectedTimeBetweenFeedIndex - 1, 0);
};

var isInState = function(state) {
  return g_state == state;
}

var transitionToState = function(newState, sceneIndex) {
  if (STATE_TRANSITIONS[g_state] && STATE_TRANSITIONS[g_state].exit) {
    STATE_TRANSITIONS[g_state].exit(sceneIndex);
  }

  g_state = newState;

  if (STATE_TRANSITIONS[newState] && STATE_TRANSITIONS[newState].enter) {
    STATE_TRANSITIONS[newState].enter(sceneIndex);
  }
}


var processKeyDown = function(dt, event, sceneIndex) {
  if (isInState(STATES.STARTING)) {
    transitionToState(STATES.PLAYING, sceneIndex);
    return;
  }

  if (isInState(STATES.FINISHED)) {
    transitionToState(STATES.STARTING, sceneIndex);
    return;
  }

  if (event.key === "ArrowUp") {
    increaseFeedSpeed();
    return;
  } else if (event.key === "ArrowDown") {
    decreaseFeedSpeed();
    return;
  }

  var conveyorBelt = g_keyToConveyorBelt.get(event.key);
  if (!conveyorBelt) { return; }

  var giftToGrab = getGiftToGrabFromConveyorBelt(conveyorBelt);
  if (!giftToGrab)  { return; }

  var gifts = g_conveyorBeltToGifts.get(conveyorBelt);
  gifts.splice(gifts.indexOf(giftToGrab), 1);

  var conveyorBeltDatum = g_conveyorBeltToData.get(conveyorBelt);
  grabGift(giftToGrab, sceneIndex, conveyorBeltDatum.topOrBottom);
};

var processInput = function(dt, sceneIndex) {
  while (g_eventQueue.length) {
    var eventData = g_eventQueue.shift();
    switch (eventData.type) {
    case 'keydown':
      processKeyDown(dt, eventData.event, sceneIndex);
      break;
    }
  }
};

var rectHitTest = function(rect1, rect2) {
  return (
    ((rect1.x + rect1.width >= rect2.x) && (rect1.x <= rect2.x + rect2.width)) &&
    ((rect1.y + rect1.height >= rect2.y) && (rect1.y <= rect2.y + rect2.height))
  );
};

var BAD_GIFT_SCORE_PENALTY = 3;

var getScoreFromGift = function(gift) {
  var giftType = g_giftToType.get(gift);
  return giftType === GOOD ? 1 : -BAD_GIFT_SCORE_PENALTY;
};

var spitOutGifts = function(count, badGift, sceneIndex) {
  var GIFT_TWEEN_DURATION = 0.8;
  var SPIT_DURATION = 0.2;

  g_feedPaused = true;

  removeTweensFromObj(badGift.position);
  removeTweensFromObj(badGift);

  var sack = sceneIndex.sack;
  var spitOutContainer = sceneIndex.spitOutContainer;

  spitOutContainer.addChild(badGift);

  sack.texture = PIXI.utils.TextureCache[ASSET_PATHS.SACK.SPIT];

  var startPos = new PIXI.Point(sack.x, sack.y + sack.height);
  var endPositions = [];

  var gifts = [badGift];

  for (var i = 0; i < count; i++) {
    var gift = createRandomGift(GOOD);
    gifts.push(gift);
    spitOutContainer.addChild(gift);
  }

  var endPositions = gifts.map(function(gift) {
    var xSign = (Math.random() < 0.5) ? -1 : 1;
    var range = (WIDTH - sack.width) / 2;
    var x = WIDTH / 2 + (xSign * (sack.width / 2 + Math.random() * range + gift.width / 2));

    return new PIXI.Point(x, HEIGHT + gift.height*2);
  });

  var beziers = endPositions.map(function(endPos) {
    return new Bezier(
      startPos.x, startPos.y,
      startPos.x, startPos.y - 1000,
      //startPos.x + directionMultiplier * 100, startPos.y,
      // endPos.x - directionMultiplier * 10, endPos.y - 200,
      endPos.x, endPos.y - 1000,
      endPos.x, endPos.y
    );
  });

  var easingFns = beziers.map(function(bezier) {
    return lutEasing.bind(null, bezier.getLUT(GIFT_TWEEN_DURATION * FPS));
  });

  for (var i = 0; i < gifts.length; i++) {
    var gift = gifts[i];
    var tween = createTween(gift.position, startPos, endPositions[i], GIFT_TWEEN_DURATION, easingFns[i]);
    startTween(tween);
  }

  var removeGiftsTween = createTimerTween(GIFT_TWEEN_DURATION, function(tween) {
      for (var i = 0; i < gifts.length; i++) {
        var gift = gifts[i];
        removeGift(gift);
      }

      g_feedPaused = false;
  });

  startTween(removeGiftsTween);

  var openSackTween = createTimerTween(SPIT_DURATION, function(tween) {
    sack.texture = PIXI.utils.TextureCache[ASSET_PATHS.SACK.OPEN];
  });

  startTween(openSackTween);
};

var checkForSackCollision = function(dt, sceneIndex) {
  var gifts = sceneIndex.giftContainer.children;
  var sack = sceneIndex.sack;

  for (var i = 0; i < gifts.length; i++) {
    var gift = gifts[i];

    var sackBounds = sack.getBounds();
    var newHeight = sackBounds.height / 4;
    var heightChange = sackBounds.height - newHeight;
    sackBounds.height = newHeight;
    sackBounds.y += heightChange;

    if (rectHitTest(gift.getBounds(), sackBounds)) {
      var giftType = g_giftToType.get(gift);
      removeGift(gift);

      if (giftType === BAD) {
        var scoreChange = getScoreFromGift(gift)
        spitOutGifts(Math.abs(scoreChange), gift, sceneIndex);
        increaseScore(scoreChange);
      } else {
        increaseScore(getScoreFromGift(gift));
      }
    }
  }
};


var leftPad = function(num, digits, char) {
  var char = char || '0';
  var str = '';

  for (var d = 1; d < digits; ++d) {
    if (num < Math.pow(10, d)) {
      str += char;
    }
  }

  return str + num.toString();
};

var getStopwatchText = function(milliseconds) {
  var seconds = milliseconds >= 1000 ? Math.floor(milliseconds / 1000) : 0;
  var minutes = seconds >= 60 ? Math.floor(seconds / 60) : 0;

  var timeStr =
    (minutes > 0 ? minutes + ':' : '') +
    ((seconds % 60) + ':') +
    leftPad(milliseconds % 1000, 3);

  return timeStr;
}

var updateStopwatch = function(sceneIndex, roundStartTime) {
  var currRoundTime = Date.now() - roundStartTime;
  sceneIndex.stopwatchText.text = getStopwatchText(currRoundTime);
  sceneIndex.stopwatchContainer.x = (WIDTH / 2 - sceneIndex.scaleContainer.width / 2) + (sceneIndex.scaleContainer.width - sceneIndex.stopwatchContainer.width) / 2;

  sceneIndex.stopwatchContainer.visible = isInState(STATES.PLAYING);
};

// var updateGameSpeed = function(score) {
//   var maxScorePct = score / MAX_SCORE;

//   var timeBetweenFeeds = linear(maxScorePct, SLOWEST_TIME_BETWEEN_FEEDS, FASTEST_TIME_BETWEEN_FEEDS);
//   g_timeBetweenFeeds = timeBetweenFeeds;
// };

var updateFeedSpeed = function(sceneIndex) {
  var feedSpeed = g_selectedTimeBetweenFeedIndex + 1;
  sceneIndex.feedSpeedText.text = feedSpeed;
  sceneIndex.feedSpeedText.x = WIDTH - sceneIndex.feedSpeedText.width - 10;
  sceneIndex.feedSpeedText.y = HEIGHT - sceneIndex.feedSpeedText.height - 10;
}


var updateStartScreen = function(dt, sceneIndex) {
  // probably some text animation??
};

var updateResultsScreen = function(dt, sceneIndex, bestTimes, roundTime, playerBestTimeEntry) {
  var winMsg = "You Win! You filled Santa's gift bag in " + Math.round(roundTime / 10) / 100 + ' seconds.\n';

  if (playerBestTimeEntry) {
    winMsg += 'You made it to number ' + (bestTimes.indexOf(playerBestTimeEntry) + 1) + ' on the leaderboard! Great job!'
  }

  sceneIndex.resultsText.text = winMsg;
}

var askForPlayerName = function() {
  return window.prompt('What is your name?', 'Top Elf');
}

var showFinishScreen = function(sceneIndex, bestTimes, roundTime, playerBestTimeEntry) {
  
};

var finishGame = function(sceneIndex, bestTimes, roundTime) {
  var playerBestTimeEntry = null;

  if (isNewBestTime(bestTimes, roundTime)) {
    var playerName = askForPlayerName();
    var playerBestTimeEntry = updateBestTimes(bestTimes, roundTime, playerName);
    saveBestTimes(bestTimes);
  }
  
  return playerBestTimeEntry;
}

var checkForWin = function() {
  return g_score >= MAX_SCORE;
};

var g_boundRunFn = null;

var update_STARTING = function(dt, sceneIndex) {
  processInput(dt, sceneIndex);

  updateStartScreen(dt, sceneIndex);
}

var update_FINISHED = function(dt, sceneIndex) {
  var roundTime = g_roundEndTime - g_roundStartTime;

  processInput(dt, sceneIndex);

  updateResultsScreen(dt, sceneIndex, g_bestTimes, roundTime, g_playerBestTimeEntry);
};

var update_PLAYING = function(dt, sceneIndex) {
  if (checkForWin()) {
    transitionToState(STATES.FINISHED, sceneIndex);
  }

  processInput(dt, sceneIndex);
  
  //updateGameSpeed(g_score);
  updateFeedTimer(dt, sceneIndex);
  for (var i = 0; i < g_tweens.length; i++) {
    updateTween(dt, g_tweens[i]);
  }

  updateNeedle(dt, sceneIndex);

  updateStopwatch(sceneIndex, g_roundStartTime)
  updateFeedSpeed(sceneIndex);

  checkForSackCollision(dt, sceneIndex);
}

var update = function (dt, sceneIndex) {
  if (isInState(STATES.STARTING)) { 
    return update_STARTING(dt, sceneIndex);
  }

  if (isInState(STATES.PLAYING)) {
    return update_PLAYING(dt, sceneIndex);
  }

  if (isInState(STATES.FINISHED)) { 
    return update_FINISHED(dt, sceneIndex);
  }
};

var run = function (renderer, sceneIndex) {
  update(getTickerDt(PIXI.ticker.shared), sceneIndex);
  renderer.render(sceneIndex.root);
};

var startGame = function (renderer, sceneIndex) {
  g_boundRunFn = run.bind(null, renderer, sceneIndex);
  g_bestTimes = loadBestTimes();
  PIXI.ticker.shared.add(g_boundRunFn);
};

var startRound = function(sceneIndex) {
  g_roundEndTime = null;
  g_roundStartTime = Date.now();
  g_score = 0;
  g_selectedTimeBetweenFeedIndex = 0;
  g_playerBestTimeEntry = null;
  clearGifts(sceneIndex.giftContainer);
}

var addConveyorBelt = function(conveyorBeltDatum) {
  var conveyorBelt = PIXI.Sprite.fromFrame(conveyorBeltDatum.assetPath);
  g_conveyorBeltToData.set(conveyorBelt, conveyorBeltDatum);

  var fromDirection = conveyorBeltDatum.fromDirection;
  var directionMultiplier = (fromDirection === LEFT) ? 1 : -1;

  conveyorBelt.position.set(conveyorBeltDatum.position.x, conveyorBeltDatum.position.y);
  conveyorBelt.anchor.set(conveyorBeltDatum.anchor.x, conveyorBeltDatum.anchor.y);
  conveyorBelt.scale.set(directionMultiplier * conveyorBeltDatum.scale.x, conveyorBeltDatum.scale.y);
  conveyorBelt.rotation = conveyorBeltDatum.rotation;

  g_conveyorBeltToGifts.set(conveyorBelt, []);

  if (conveyorBeltDatum.key) {
    g_keyToConveyorBelt.set(conveyorBeltDatum.key, conveyorBelt);

    if (DEBUG_CONVEYOR_BELT_NUMBERS) {
      var numberText = new PIXI.Text(conveyorBeltDatum.key.toString(), {
        fontFamily: 'Arial', fontSize: 256, fill: 0x220000, align: 'left'
      });

      numberText.x = conveyorBelt.width
      numberText.y = conveyorBelt.height

      numberText.scale.x = directionMultiplier;

      conveyorBelt.addChild(numberText);
    }
  }

  return conveyorBelt;
};

var buildSceneGraph = function () {

  var root = new PIXI.Container();

  // root.scale.set(0.5);

    var worldContainer = new PIXI.Container();
    root.addChild(worldContainer);

      var bg = PIXI.extras.TilingSprite.fromFrame(ASSET_PATHS.BG);
      bg.height = HEIGHT;
      bg.width = WIDTH;
      worldContainer.addChild(bg);

      var scaleContainer = new PIXI.Container();
      //scaleContainer.scale.set(0.25);
      scaleContainer.position.set(WIDTH/2, 100);
      worldContainer.addChild(scaleContainer);
        var scale = PIXI.Sprite.fromFrame(ASSET_PATHS.SCALE);
        scale.anchor.set(0.5, 1);
        scale.y = HEIGHT;
        scale.scale.set(ASSET_SCALE);
        scaleContainer.addChild(scale);

        var needle = PIXI.Sprite.fromFrame(ASSET_PATHS.NEEDLE);
        needle.anchor.set(0.5, 1);
        needle.position.set(scale.x - 5, 235);
        needle.scale.set(ASSET_SCALE);
        needle.pivot.y = -100;
        needle.rotation = -Math.PI / 4;
        scaleContainer.addChild(needle);

      var allConveyorBeltsContainer = new PIXI.Container();
      worldContainer.addChild(allConveyorBeltsContainer);

      var CONVEYOR_BELT_ROTATION = Math.PI / 12;

      var CONVEYOR_BELT_TOP_Y = -200;
      var DROP_CONVEYOR_BELT_TOP_Y = CONVEYOR_BELT_TOP_Y + 180;
      var CONVEYOR_BELT_BOTTOM_Y = 50;
      var DROP_CONVEYOR_BELT_BOTTOM_Y = CONVEYOR_BELT_BOTTOM_Y + 180;

      var CONVEYOR_BELT_LEFT_X = -400;
      var DROP_CONVEYOR_BELT_LEFT_X = CONVEYOR_BELT_LEFT_X + 600;
      var CONVEYOR_BELT_RIGHT_X = 1300;
      var DROP_CONVEYOR_BELT_RIGHT_X = CONVEYOR_BELT_RIGHT_X - 600;

      var CONVEYOR_BELT_DATA = [
        {
          position: { x: CONVEYOR_BELT_LEFT_X, y: CONVEYOR_BELT_TOP_Y }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[1], rotation: CONVEYOR_BELT_ROTATION, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE, y: ASSET_SCALE},
          fromDirection: LEFT,
          topOrBottom: TOP,
          key: '1',
          dropConveyorBeltDatum: {
            position: { x: DROP_CONVEYOR_BELT_LEFT_X, y: DROP_CONVEYOR_BELT_TOP_Y }, assetPath: ASSET_PATHS.DROP_PLATFORM, rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE, y: ASSET_SCALE},
            fromDirection: LEFT,
          }
        },

        {
          position: { x: CONVEYOR_BELT_LEFT_X, y: CONVEYOR_BELT_BOTTOM_Y }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[2], rotation: CONVEYOR_BELT_ROTATION, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE, y: ASSET_SCALE},
          fromDirection: LEFT,
          topOrBottom: BOTTOM,
          key: '2',
          dropConveyorBeltDatum: {
            position: { x: DROP_CONVEYOR_BELT_LEFT_X, y: DROP_CONVEYOR_BELT_BOTTOM_Y }, assetPath: ASSET_PATHS.DROP_PLATFORM, rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE, y: ASSET_SCALE},
            fromDirection: LEFT,
          }
        },

        {
          position: { x: CONVEYOR_BELT_RIGHT_X, y: CONVEYOR_BELT_TOP_Y }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[3], rotation: -CONVEYOR_BELT_ROTATION, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE, y: ASSET_SCALE},
          fromDirection: RIGHT,
          topOrBottom: TOP,
          key: '3',
          dropConveyorBeltDatum: {
            position: { x: DROP_CONVEYOR_BELT_RIGHT_X, y: DROP_CONVEYOR_BELT_TOP_Y }, assetPath: ASSET_PATHS.DROP_PLATFORM, rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE, y: ASSET_SCALE},
            fromDirection: LEFT,
          }
        },

        {
          position: { x: CONVEYOR_BELT_RIGHT_X, y: CONVEYOR_BELT_BOTTOM_Y }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[4], rotation: -CONVEYOR_BELT_ROTATION, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE, y: ASSET_SCALE},
          fromDirection: RIGHT,
          topOrBottom: BOTTOM,
          key: '4',
          dropConveyorBeltDatum: {
            position: { x: DROP_CONVEYOR_BELT_RIGHT_X, y: DROP_CONVEYOR_BELT_BOTTOM_Y }, assetPath: ASSET_PATHS.DROP_PLATFORM, rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE, y: ASSET_SCALE},
            fromDirection: LEFT,
          }
        },
      ];

      var spotlightContainer = new PIXI.Container();

      worldContainer.addChild(spotlightContainer);

      CONVEYOR_BELT_DATA.forEach(function (conveyorBeltDatum) {
        var dropConveyorBeltDatum = conveyorBeltDatum.dropConveyorBeltDatum;
        var spotlight = PIXI.Sprite.fromFrame(ASSET_PATHS.SPOTLIGHT);
        spotlight.anchor.set(0.5);
        spotlight.scale.set(ASSET_SCALE);
        spotlight.position.set(
          dropConveyorBeltDatum.position.x,
          dropConveyorBeltDatum.position.y - spotlight.height / 2
        );
        spotlightContainer.addChild(spotlight);
      });

      CONVEYOR_BELT_DATA.forEach(function (conveyorBeltDatum) {
        var conveyorBeltContainer = new PIXI.Container();
        var conveyorBelt = addConveyorBelt(conveyorBeltDatum);
        var dropConveyorBelt = addConveyorBelt(conveyorBeltDatum.dropConveyorBeltDatum);

        allConveyorBeltsContainer.addChild(conveyorBelt);
        allConveyorBeltsContainer.addChild(dropConveyorBelt);
      });

      allConveyorBeltsContainer.position.set(allConveyorBeltsContainer.children[0].width / 2);
      spotlightContainer.position.set(allConveyorBeltsContainer.x, allConveyorBeltsContainer.y);

      var giftContainer = new PIXI.Container();
      worldContainer.addChild(giftContainer);

      var spitOutContainer = new PIXI.Container();
      worldContainer.addChild(spitOutContainer);

      var sack = PIXI.Sprite.fromFrame(ASSET_PATHS.SACK.OPEN);
      sack.anchor.set(0.5, 1);
      sack.x = WIDTH / 2;
      sack.y = HEIGHT;
      sack.scale.set(ASSET_SCALE);
      worldContainer.addChild(sack);

      var stopwatchContainer = new PIXI.Container();
      stopwatchContainer.visible = false;
      worldContainer.addChild(stopwatchContainer);

        var stopwatchText = new PIXI.Text(getStopwatchText(0), {
          fontFamily: 'courier', fontSize: 60, fill: 0x220000
        });
        stopwatchContainer.addChild(stopwatchText);

      stopwatchContainer.x = (WIDTH / 2 - scaleContainer.width / 2) + (scaleContainer.width - stopwatchContainer.width) / 2;
      stopwatchContainer.y = 10;
         

      var giftGrabContainer = new PIXI.Container();
      worldContainer.addChild(giftGrabContainer);

      var armsContainer = new PIXI.Container();
      worldContainer.addChild(armsContainer);


      var feedSpeedContainer = new PIXI.Container();
      worldContainer.addChild(feedSpeedContainer);

        var feedSpeedText = new PIXI.Text("0", {
          fontFamily: 'Arial', fontSize: 72, fill: 0x220000
        });
        feedSpeedContainer.addChild(feedSpeedText)

      var startScreen = new PIXI.Container();
      worldContainer.addChild(startScreen);

        var startText = new PIXI.Text('PRESS ANY KEY TO START!', {
          fontFamily: 'Arial', fontSize: 128, fill: 0x220000
        })
        startScreen.addChild(startText);

      var resultsScreen = new PIXI.Container();
      resultsScreen.visible = false;
      worldContainer.addChild(resultsScreen);

        var resultsText = new PIXI.Text('RESULTS GO HERE!', {
          fontFamily: 'Arial', fontSize: 72, fill: 0x220000
        })
        resultsScreen.addChild(resultsText);


  return {
    root: root,
      worldContainer: worldContainer,
        bg: bg,
        scaleContainer: scaleContainer,
        scale: scale,
        needle: needle,
        allConveyorBeltsContainer: allConveyorBeltsContainer,
        giftContainer: giftContainer,
        sack: sack,
        stopwatchContainer: stopwatchContainer,
        stopwatchText: stopwatchText,
        giftGrabContainer: giftGrabContainer,
        armsContainer: armsContainer,
        spitOutContainer: spitOutContainer,
        feedSpeedContainer: feedSpeedContainer,
        feedSpeedText: feedSpeedText,
        startScreen: startScreen,
        resultsScreen: resultsScreen,
        resultsText: resultsText
  };
};


var addKeyHandlers = function (renderer, worldContainer) {
  window.addEventListener('keydown', function (e) {
    // push keydown event to event queue
    g_eventQueue.push({ type: 'keydown', event: e });
  });

  window.addEventListener('keyup', function (e) {
    // push keyup event to event queue
    g_eventQueue.push({ type: 'keyup', event: e });
  });
};

var loadAssetObject = function (loader, assetObj) {
  for (let reference in assetObj) {
    var assetDesc = assetObj[reference];
    if (typeof assetDesc === 'object') {
      loadAssetObject(loader, assetDesc);
    } else {
      loader.add(assetObj[reference]);
    }
  }
}

var load = function () {
  return new Promise(function (resolve, reject) {
    var loader = new PIXI.loaders.Loader();

    loadAssetObject(loader, ASSET_PATHS);

    loader.once('complete', resolve);
    loader.once('error', reject);

    loader.load();
  });
};

var init = function () {
  var canvas = document.getElementById('root-canvas');
  var resolution = document.devicePixelRatio;

  var renderer = new PIXI.WebGLRenderer(WIDTH, HEIGHT, {
    view: canvas,
    resolution: resolution
  });

  load()
  .then(function () {
    // build scene
    var sceneIndex = buildSceneGraph();
    // add key handlers
    addKeyHandlers(renderer, sceneIndex.worldContainer);

    // DEBUGGING
    window.sceneIndex = sceneIndex;

    startGame(renderer, sceneIndex);
  })
  .catch(function (e) {
    window.console.error('error loading resources!');
    window.console.error(e);
  })
};

var STATE_TRANSITIONS = {
  STARTING: {
    enter: function(sceneIndex) {
      sceneIndex.startScreen.visible = true;
    },
    exit: function(sceneIndex) {
      sceneIndex.startScreen.visible = false;
    }
  },

  PLAYING: {
    enter: function(sceneIndex) {
      startRound(sceneIndex);
    }
  },

  FINISHED: {
    enter: function(sceneIndex) {
      sceneIndex.resultsScreen.visible = true;

      g_roundEndTime = Date.now()

      var roundTime = g_roundEndTime - g_roundStartTime;
      g_playerBestTimeEntry = finishGame(sceneIndex, g_bestTimes, roundTime);
    },

    exit: function(sceneIndex) {
      sceneIndex.resultsScreen.visible = false;
    }
  }  
}
