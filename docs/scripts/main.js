var DEBUG_CONVEYOR_BELT_NUMBERS = true;

var ASSET_PATHS = {
  BG: {
    SKY: 'images/bg-sky-colour141721.png',
    SNOWFLAKES1: 'images/bg-snowflakes1.png',
    SNOWFLAKES2: 'images/bg-snowflakes2.png',
    WALL: 'images/bg-wall.png',
    GARLAND: 'images/bg-garland.png',
    GIFTS: 'images/bg-gifts.png',
  },
  
  CONVEYOR_BELT_FRAMES: ['images/conveyorBelt.png'], //, 'images/conveyor-belt2.png', 'images/conveyor-belt3.png', 'images/conveyor-belt4.png'],
  PLATFORM1: 'images/platform1.png',
  PLATFORM2: 'images/platform2.png',
  PLATFORM3: 'images/platform3.png',
  PLATFORM4: 'images/platform4.png',

  SPOTLIGHT: 'images/platform-halo.png',

  GIFTS: [
    'images/item-gift1-xmas.png',
    'images/item-gift2-xmas.png',
    'images/item-gift3-xmas.png'
  ],
  
  BAD_GIFTS: [
    'images/item-bunny.png',
    'images/item-easterEgg.png',
    'images/item-heart.png',
    'images/item-potOfGold.png',
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
    OPEN: 'images/arms-handsReach.png',
    CLOSED: 'images/arms-handsGrab.png',
    FIDGETING1: 'images/arms-handsFidgeting1.png',
    FIDGETING2: 'images/arms-handsFidgeting2.png'
  },

  BG_MUSIC: 'audio/music/Jordan_Gladstone_-_07_-_The_Christmas_is_in_Another_Castle.mp3',
  SFX: {
    DING: 'audio/sfx/ding.wav',
    BURP: 'audio/sfx/burp.wav',
    ELF_GRAB: 'audio/sfx/heheh.wav'
  },

  FONTS: {
    BAAR_GOETHEANIS: 'fonts/baar_goetheanis_regular.xml',
  }
};



var KEYS = {
  PLATFORM1: 'ArrowUp',
  PLATFORM2: 'ArrowLeft',
  PLATFORM3: 'ArrowRight',
  PLATFORM4: 'ArrowDown',
  SPEED_UP: " ",
  //SpeedDown: SPECIAL CASE - LEFT CLICK since one of the makey makey inputs is a click for some reason...
}

var ASSET_SCALE_X = 0.292;
var ASSET_SCALE_Y = 0.30;

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

var MAX_GIFTS_PER_CONVEYOR_BELT = 4;
var BAD_GIFT_CHANCE = 0.25;

var g_audioCtx = null;

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
  0.6,
  0.5,
  0.4,
  0.3,
  0.2
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


var AUDIO_CACHE = {};


var _loadAudio = function(audioCtx, path) {
  var audioElem = new Audio(path);
  audioElem.autoplay = false;

  var source = audioCtx.createMediaElementSource(audioElem);
  var gainNode = audioCtx.createGain();
  gainNode.gain.value = 1.0;

  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  return {
    elem: audioElem,
    audioSource: source,
    gainNode: gainNode,
  };
}

var playMusic = function(audioPath) {
  var audioData = AUDIO_CACHE[audioPath];
  audioData.elem.play();
};

var playSfx = function(audioPath) {
  var audioData = AUDIO_CACHE[audioPath];
  audioData = _loadAudio(g_audioCtx, audioPath); // super hacky and last minute
  audioData.elem.play();
};

var loadAudio = function(audioCtx, path) {
  var audioData = _loadAudio(audioCtx, path);
  AUDIO_CACHE[path] = audioData;
  return audioData;
}

var loadSfx = function(audioCtx) {
  for (var sfxRef in ASSET_PATHS.SFX) {
    if (!ASSET_PATHS.SFX.hasOwnProperty(sfxRef)) { continue; }
    loadAudio(audioCtx, ASSET_PATHS.SFX[sfxRef]);
  }
}

var loadMusic = function(audioCtx) {
  var musicAudioData = loadAudio(audioCtx, ASSET_PATHS.BG_MUSIC);
  musicAudioData.gainNode.gain.value = 0.5;
};


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

  var x1 = directionMultiplier * ((1/3) * conveyorBelt.width) * Math.cos(rotation);
  var y1 = directionMultiplier * ((1/3) * conveyorBelt.width) * Math.sin(rotation) - conveyorBelt.height / 2;

  var x2 = directionMultiplier * ((0/3) * conveyorBelt.width) * Math.cos(rotation);
  var y2 = directionMultiplier * ((0/3) * conveyorBelt.width) * Math.sin(rotation) - conveyorBelt.height / 2;

  var x3 = -directionMultiplier * ((1/3) * conveyorBelt.width) * Math.cos(rotation);
  var y3 = -directionMultiplier * ((1/3) * conveyorBelt.width) * Math.sin(rotation) - conveyorBelt.height / 2;

//   var x4 = -directionMultiplier * ((2/4) * conveyorBelt.width) * Math.cos(rotation);
//   var y4 = -directionMultiplier * ((2/4) * conveyorBelt.width) * Math.sin(rotation) - conveyorBelt.height / 2;

  var x5 = -10 * directionMultiplier;
  var y5 = -dropConveyorBelt.height / 2;

  return [
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x1, conveyorBeltGlobalPos.y + y1), rotation: conveyorBelt.rotation},
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x2, conveyorBeltGlobalPos.y + y2), rotation: conveyorBelt.rotation},
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x3, conveyorBeltGlobalPos.y + y3), rotation: conveyorBelt.rotation},
//     {position: new PIXI.Point(conveyorBeltGlobalPos.x + x4, conveyorBeltGlobalPos.y + y4), rotation: conveyorBelt.rotation},
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
  gift.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);

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

var createGiftTweens = function(gift, endPos, endRot, duration) {
  var startPos = new PIXI.Point(gift.x, gift.y);

  var posTween = createTween(gift.position, startPos, endPos, duration, linear);
  var rotTween = createTween(gift, {rotation: gift.rotation}, {rotation: endRot}, duration, linear);

  startTween(posTween);
  startTween(rotTween);
};

var createConveyorBeltFeedTween = function(conveyorBelt, duration) {
  conveyorBelt.gotoAndPlay(0);

  var timerTween = createTimerTween(duration, function() {
    conveyorBelt.gotoAndStop(0);
  });

  startTween(timerTween);
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

  var FEED_DURATION = getTimeBetweenFeeds() / 3;

  for(var i = 0; i < gifts.length; i++) {
    var gift = gifts[i];
    var nextGiftTransform = giftTransforms[i];
    createGiftTweens(gift, nextGiftTransform.position, nextGiftTransform.rotation, FEED_DURATION);
  }

  createConveyorBeltFeedTween(conveyorBelt, FEED_DURATION);

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
  arms.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
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

  playSfx(ASSET_PATHS.SFX.ELF_GRAB);
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

  if (event.key === KEYS.SPEED_UP) {
    increaseFeedSpeed();
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

var processMouseDown = function(dt, event, sceneIndex) {
  if (isInState(STATES.PLAYING)) {
    decreaseFeedSpeed();
  }
};

var processInput = function(dt, sceneIndex) {
  while (g_eventQueue.length) {
    var eventData = g_eventQueue.shift();
    switch (eventData.type) {
    case 'keydown':
      processKeyDown(dt, eventData.event, sceneIndex);
      break;
    case 'mousedown':
      processMouseDown(dt, eventData.event, sceneIndex);
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
        playSfx(ASSET_PATHS.SFX.BURP);
        increaseScore(scoreChange);
      } else {
        playSfx(ASSET_PATHS.SFX.DING);
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

var getStopwatchMillisecondsText = function(milliseconds) {
  return leftPad(milliseconds % 1000, 3);
};

var getStopwatchSecondsText = function(milliseconds) {
  var seconds = milliseconds >= 1000 ? Math.floor(milliseconds / 1000) : 0;
  return leftPad(seconds % 60, 2);
};

var getStopwatchMinutesText = function(milliseconds) {
  var seconds = milliseconds >= 1000 ? Math.floor(milliseconds / 1000) : 0;
  var minutes = seconds >= 60 ? Math.floor(seconds / 60) : 0;
  return (minutes > 0 ? minutes + ':' : '')
};

var updateStopwatch = function(sceneIndex, roundStartTime) {
  var currRoundTime = Date.now() - roundStartTime;
  sceneIndex.stopwatchMillisecondsText.text = getStopwatchMillisecondsText(currRoundTime);
  sceneIndex.stopwatchSecondsText.text = getStopwatchSecondsText(currRoundTime);
  sceneIndex.stopwatchSecondsText.x = sceneIndex.stopwatchMillisecondsText.x - sceneIndex.stopwatchSecondsText.width - 30;
  sceneIndex.stopwatchMinutesText.text = getStopwatchMinutesText(currRoundTime);

  sceneIndex.stopwatchMinutesText.x = sceneIndex.stopwatchSecondsText.x - sceneIndex.stopwatchMinutesText.width - 20;

  sceneIndex.stopwatchContainer.visible = isInState(STATES.PLAYING);
};

// var updateGameSpeed = function(score) {
//   var maxScorePct = score / MAX_SCORE;

//   var timeBetweenFeeds = linear(maxScorePct, SLOWEST_TIME_BETWEEN_FEEDS, FASTEST_TIME_BETWEEN_FEEDS);
//   g_timeBetweenFeeds = timeBetweenFeeds;
// };

var ENABLED_TINT = 0xFFFFFF;
var DISABLED_TINT = 0x222222;

var updateFeedSpeed = function(sceneIndex) {
  var feedSpeed = (g_selectedTimeBetweenFeedIndex + 1);

  for (var i = 0; i < feedSpeed; i++) {
    var symbol = sceneIndex.feedSpeedSymbolContainer.children[i];
    symbol.tint = ENABLED_TINT;
  }

  for (var i = feedSpeed; i < TIME_BETWEEN_FEED_OPTIONS.length; i++) {
    var symbol = sceneIndex.feedSpeedSymbolContainer.children[i];
    symbol.tint = DISABLED_TINT;
  }
}

var SNOWFLAKES_Y_SPEED_PER_LAYER = [300, 200];
var SNOWFLAKES_X_SPEED_PER_LAYER = [0, 0];

var updateSnowflakes = function(dt, sceneIndex) {
  var snowflakesContainer = sceneIndex.snowflakesContainer;

  for (var i = 0; i < snowflakesContainer.children.length; ++i) {
    var snowflakesLayer = snowflakesContainer.children[i];

    for (var j = 0; j < snowflakesLayer.children.length; ++j) {
      var snowflakesSprite =  snowflakesLayer.children[j];

      if (snowflakesSprite.y >= HEIGHT) {
        snowflakesSprite.y = -snowflakesSprite.height + (HEIGHT - snowflakesSprite.height);
        snowflakesSprite.x = 0;
      }

      snowflakesSprite.y += dt * SNOWFLAKES_Y_SPEED_PER_LAYER[i];
      snowflakesSprite.x += dt * SNOWFLAKES_X_SPEED_PER_LAYER[i];
    }
  }
};


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

var updateTweens = function(dt) {
  for (var i = 0; i < g_tweens.length; i++) {
    updateTween(dt, g_tweens[i]);
  }
};

var update_STARTING = function(dt, sceneIndex) {
  processInput(dt, sceneIndex);

  updateStartScreen(dt, sceneIndex);
  updateSnowflakes(dt, sceneIndex);
}

var update_FINISHED = function(dt, sceneIndex) {
  var roundTime = g_roundEndTime - g_roundStartTime;

  processInput(dt, sceneIndex);

  updateResultsScreen(dt, sceneIndex, g_bestTimes, roundTime, g_playerBestTimeEntry);

  updateTweens(dt);
  updateSnowflakes(dt, sceneIndex);
};

var update_PLAYING = function(dt, sceneIndex) {
  if (checkForWin()) {
    transitionToState(STATES.FINISHED, sceneIndex);
  }

  processInput(dt, sceneIndex);
  
  //updateGameSpeed(g_score);
  updateFeedTimer(dt, sceneIndex);
  updateTweens(dt);

  updateNeedle(dt, sceneIndex);

  updateStopwatch(sceneIndex, g_roundStartTime)
  updateFeedSpeed(sceneIndex);

  checkForSackCollision(dt, sceneIndex);

  updateSnowflakes(dt, sceneIndex);
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
  var dt = getTickerDt(PIXI.ticker.shared);
  update(dt, sceneIndex);
  renderer.render(sceneIndex.root);
};

var startGame = function (renderer, sceneIndex) {
  playMusic(ASSET_PATHS.BG_MUSIC);

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
  sceneIndex.sack.texture = PIXI.utils.TextureCache[ASSET_PATHS.SACK.OPEN];
  clearGifts(sceneIndex.giftContainer);
}

var addConveyorBelt = function(conveyorBeltDatum, conveyorBeltTextures) {
  var conveyorBelt = null;
  if (conveyorBeltDatum.assetPath) {
    conveyorBelt = new PIXI.Sprite.fromFrame(conveyorBeltDatum.assetPath);
  } else {
    conveyorBelt = new PIXI.extras.MovieClip(conveyorBeltTextures);
  }

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
      var numberText = new PIXI.extras.BitmapText(conveyorBeltDatum.key.toString(), {
        font: "BaarGoetheanis"
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

    var worldContainer = new PIXI.Container();
    root.addChild(worldContainer);


      var bgContainer = new PIXI.Container();
      worldContainer.addChild(bgContainer); 

        var snowflakesContainer = new PIXI.Container();
        snowflakesContainer.x = WIDTH/2;
        bgContainer.addChild(snowflakesContainer);

          var snowflakesLayer1 = new PIXI.Container();
          snowflakesContainer.addChild(snowflakesLayer1);

            var snowFlakes11 = new PIXI.Sprite.fromFrame(ASSET_PATHS.BG.SNOWFLAKES1);
            snowFlakes11.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
            snowFlakes11.anchor.set(0.5, 0);
      
            var LAYER_1_Y_OFFSET = Math.abs(HEIGHT - snowFlakes11.height);
            snowFlakes11.y = LAYER_1_Y_OFFSET;
            
            snowflakesLayer1.addChild(snowFlakes11);

            var snowFlakes12 = new PIXI.Sprite.fromFrame(ASSET_PATHS.BG.SNOWFLAKES1);
            snowFlakes12.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
            snowFlakes12.anchor.set(0.5, 0);
            snowFlakes12.y = -snowFlakes12.height + LAYER_1_Y_OFFSET;
            snowflakesLayer1.addChild(snowFlakes12);

          var snowflakesLayer2 = new PIXI.Container();
          snowflakesContainer.addChild(snowflakesLayer2);

            var snowFlakes21 = new PIXI.Sprite.fromFrame(ASSET_PATHS.BG.SNOWFLAKES2);
            snowFlakes21.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
            snowFlakes21.anchor.set(0.5, 0);

            var LAYER_2_Y_OFFSET = Math.abs(HEIGHT - snowFlakes21.height);
            snowFlakes21.y = LAYER_2_Y_OFFSET;
            snowflakesLayer2.addChild(snowFlakes21);

            var snowFlakes22 = new PIXI.Sprite.fromFrame(ASSET_PATHS.BG.SNOWFLAKES2);
            snowFlakes22.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
            snowFlakes22.anchor.set(0.5, 0);
            snowFlakes22.y = -snowFlakes22.height + LAYER_2_Y_OFFSET;
            snowflakesLayer2.addChild(snowFlakes22);

        var bgWall = new PIXI.Sprite.fromFrame(ASSET_PATHS.BG.WALL);
        bgWall.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
        bgContainer.addChild(bgWall);

        var bgGarland = new PIXI.Sprite.fromFrame(ASSET_PATHS.BG.GARLAND);
        bgGarland.anchor.set(0.5, 0);
        bgGarland.x = WIDTH / 2;
        bgGarland.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
        bgContainer.addChild(bgGarland);

        var bgGifts = new PIXI.Sprite.fromFrame(ASSET_PATHS.BG.GIFTS);
        bgGifts.anchor.set(0,1);
        bgGifts.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
        bgGifts.y = HEIGHT;
        bgContainer.addChild(bgGifts);

      //bgContainer.height = HEIGHT;
      //bgContainer.width = WIDTH;

      var scaleContainer = new PIXI.Container();
      scaleContainer.scale.set(0.9, 0.9);
      scaleContainer.position.set(WIDTH/2, 120);
      worldContainer.addChild(scaleContainer);
        var scale = PIXI.Sprite.fromFrame(ASSET_PATHS.SCALE);
        scale.anchor.set(0.5, 1);
        scale.y = HEIGHT;
        scale.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
        scaleContainer.addChild(scale);

        var needle = PIXI.Sprite.fromFrame(ASSET_PATHS.NEEDLE);
        needle.anchor.set(0.5, 1);
        needle.position.set(scale.x + 5, 200);
        needle.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
        needle.pivot.y = -100;
        needle.rotation = -Math.PI / 4;
        scaleContainer.addChild(needle);

      var allConveyorBeltsContainer = new PIXI.Container();
      worldContainer.addChild(allConveyorBeltsContainer);

      var conveyorBeltTextures = [];
      for (var i = 0; i < ASSET_PATHS.CONVEYOR_BELT_FRAMES.length; i++) {
        conveyorBeltTextures.push(PIXI.Texture.fromFrame(ASSET_PATHS.CONVEYOR_BELT_FRAMES[i]));
      }


      var CONVEYOR_BELT_ROTATION = Math.PI / 10;

      var CONVEYOR_BELT_TOP_Y = 20;
      var DROP_CONVEYOR_BELT_TOP_Y = CONVEYOR_BELT_TOP_Y + 140;
      var CONVEYOR_BELT_BOTTOM_Y = 270;
      var DROP_CONVEYOR_BELT_BOTTOM_Y = CONVEYOR_BELT_BOTTOM_Y + 140;

      var CONVEYOR_BELT_LEFT_X = -50;
      var DROP_CONVEYOR_BELT_LEFT_X = CONVEYOR_BELT_LEFT_X + 430;
      var CONVEYOR_BELT_RIGHT_X = 1250;
      var DROP_CONVEYOR_BELT_RIGHT_X = CONVEYOR_BELT_RIGHT_X - 430;

      var CONVEYOR_BELT_DATA = [
        {
          position: { x: CONVEYOR_BELT_LEFT_X, y: CONVEYOR_BELT_TOP_Y }, rotation: CONVEYOR_BELT_ROTATION, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE_X, y: ASSET_SCALE_Y},
          fromDirection: LEFT,
          topOrBottom: TOP,
          key: KEYS.PLATFORM1,
          dropConveyorBeltDatum: {
            position: { x: DROP_CONVEYOR_BELT_LEFT_X, y: DROP_CONVEYOR_BELT_TOP_Y }, assetPath: ASSET_PATHS.PLATFORM1, rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE_X, y: ASSET_SCALE_Y},
            fromDirection: LEFT,
          }
        },

        {
          position: { x: CONVEYOR_BELT_LEFT_X, y: CONVEYOR_BELT_BOTTOM_Y }, rotation: CONVEYOR_BELT_ROTATION, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE_X, y: ASSET_SCALE_Y},
          fromDirection: LEFT,
          topOrBottom: BOTTOM,
          key: KEYS.PLATFORM2,
          dropConveyorBeltDatum: {
            position: { x: DROP_CONVEYOR_BELT_LEFT_X, y: DROP_CONVEYOR_BELT_BOTTOM_Y }, assetPath: ASSET_PATHS.PLATFORM2, rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE_X, y: ASSET_SCALE_Y},
            fromDirection: LEFT,
          }
        },

        {
          position: { x: CONVEYOR_BELT_RIGHT_X, y: CONVEYOR_BELT_TOP_Y }, rotation: -CONVEYOR_BELT_ROTATION, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE_X, y: ASSET_SCALE_Y},
          fromDirection: RIGHT,
          topOrBottom: TOP,
          key: KEYS.PLATFORM3,
          dropConveyorBeltDatum: {
            position: { x: DROP_CONVEYOR_BELT_RIGHT_X, y: DROP_CONVEYOR_BELT_TOP_Y }, assetPath: ASSET_PATHS.PLATFORM3, rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE_X, y: ASSET_SCALE_Y},
            fromDirection: LEFT,
          }
        },

        {
          position: { x: CONVEYOR_BELT_RIGHT_X, y: CONVEYOR_BELT_BOTTOM_Y }, rotation: -CONVEYOR_BELT_ROTATION, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE_X, y: ASSET_SCALE_Y},
          fromDirection: RIGHT,
          topOrBottom: BOTTOM,
          key: KEYS.PLATFORM4,
          dropConveyorBeltDatum: {
            position: { x: DROP_CONVEYOR_BELT_RIGHT_X, y: DROP_CONVEYOR_BELT_BOTTOM_Y }, assetPath: ASSET_PATHS.PLATFORM4, rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: ASSET_SCALE_X, y: ASSET_SCALE_Y},
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
        spotlight.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
        spotlight.position.set(
          dropConveyorBeltDatum.position.x,
          dropConveyorBeltDatum.position.y - spotlight.height / 2
        );
        spotlightContainer.addChild(spotlight);
      });

      CONVEYOR_BELT_DATA.forEach(function (conveyorBeltDatum) {
        var conveyorBeltContainer = new PIXI.Container();
        var conveyorBelt = addConveyorBelt(conveyorBeltDatum, conveyorBeltTextures);
        var dropConveyorBelt = addConveyorBelt(conveyorBeltDatum.dropConveyorBeltDatum, conveyorBeltTextures);

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
      sack.y = HEIGHT + 100;
      sack.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
      worldContainer.addChild(sack);

      var giftGrabContainer = new PIXI.Container();
      worldContainer.addChild(giftGrabContainer);

      var armsContainer = new PIXI.Container();
      worldContainer.addChild(armsContainer);


      var LABEL_SCALE = 0.35;

      var stopwatchContainer = new PIXI.Container();
      worldContainer.addChild(stopwatchContainer);

        var stopwatchLabel =  new PIXI.extras.BitmapText('TIME', {
          font: "BaarGoetheanis"
        });
        stopwatchLabel.scale.set(LABEL_SCALE);
        stopwatchContainer.addChild(stopwatchLabel);

        var stopwatchMinutesText = new PIXI.extras.BitmapText('', {
          font: "BaarGoetheanis"
        });
        stopwatchContainer.addChild(stopwatchMinutesText);

//         var stopwatchMinutesSeperatorText = new PIXI.extras.BitmapText(':', {
//           font: "BaarGoetheanis"
//         });
//         stopwatchMinutesSeperatorText.x = stopwatchMinutesText.x + stopwatchMinutesText.width;
//         stopwatchContainer.addChild(stopwatchMinutesSeperatorText);

        var stopwatchSecondsText = new PIXI.extras.BitmapText(getStopwatchSecondsText(0), {
          font: "BaarGoetheanis"
        });
        stopwatchSecondsText.x = stopwatchMinutesText.x + stopwatchMinutesText.width + 10;
        stopwatchContainer.addChild(stopwatchSecondsText);

        var stopwatchSecondsSeperatorText = new PIXI.extras.BitmapText(':', {
          font: "BaarGoetheanis"
        });
        stopwatchSecondsSeperatorText.x = stopwatchSecondsText.x + stopwatchSecondsText.width;
        stopwatchSecondsSeperatorText.scale.set(0.5);
        stopwatchSecondsSeperatorText.y = stopwatchSecondsText.height - stopwatchSecondsSeperatorText.height;
        stopwatchContainer.addChild(stopwatchSecondsSeperatorText);

        var stopwatchMillisecondsText = new PIXI.extras.BitmapText(getStopwatchMillisecondsText(0), {
          font: "BaarGoetheanis"
        });
        stopwatchMillisecondsText.scale.set(0.5);
        stopwatchMillisecondsText.x = stopwatchSecondsSeperatorText.x + stopwatchSecondsSeperatorText.width + 10;
        stopwatchMillisecondsText.y = stopwatchSecondsSeperatorText.y;
        
        stopwatchContainer.addChild(stopwatchMillisecondsText);


        stopwatchLabel.position.set(stopwatchContainer.width / 2 - stopwatchLabel.width, -25)
      
      stopwatchContainer.y = 40; 
      stopwatchContainer.x = (WIDTH - stopwatchContainer.width - 10);
      stopwatchContainer.visible = false;
         

      var feedSpeedContainer = new PIXI.Container();
      worldContainer.addChild(feedSpeedContainer);

        var feedSpeedLabel = new PIXI.extras.BitmapText("SPEED", {
          font: "BaarGoetheanis"
        });
        feedSpeedLabel.scale.set(LABEL_SCALE);
        feedSpeedLabel.x = 100;
        feedSpeedLabel.y = -25;
        feedSpeedContainer.addChild(feedSpeedLabel);

        var SYMBOL_MARGIN = 5;

        var feedSpeedSymbolContainer = new PIXI.Container();
        feedSpeedContainer.addChild(feedSpeedSymbolContainer);
          
          for (var i = 0; i < TIME_BETWEEN_FEED_OPTIONS.length; i++) {
             var feedSpeedSymbol = new PIXI.extras.BitmapText("+", {
              font: "BaarGoetheanis"
            });
            feedSpeedSymbolContainer.addChild(feedSpeedSymbol);
            feedSpeedSymbol.x = (feedSpeedSymbol.width + SYMBOL_MARGIN) * i
            feedSpeedSymbol.tint = DISABLED_TINT;
          }

     feedSpeedContainer.x = 40;
     feedSpeedContainer.y = 40;

      var startScreen = new PIXI.Container();
      worldContainer.addChild(startScreen);

        var startText = new PIXI.extras.BitmapText('PRESS ANY KEY TO START!', {
          font: 'BaarGoetheanis'
        })
        startScreen.addChild(startText);
        //startScreen.scale(0.5)

      var resultsScreen = new PIXI.Container();
      resultsScreen.visible = false;
      worldContainer.addChild(resultsScreen);

        var resultsText = new PIXI.extras.BitmapText('RESULTS GO HERE!', {
          font: 'BaarGoetheanis'
        })
        resultsText.scale.set(0.66);
        resultsScreen.addChild(resultsText);


  return {
    root: root,
      worldContainer: worldContainer,
        bgContainer: bgContainer,
        snowflakesContainer: snowflakesContainer,
        scaleContainer: scaleContainer,
        scale: scale,
        needle: needle,
        allConveyorBeltsContainer: allConveyorBeltsContainer,
        giftContainer: giftContainer,
        sack: sack,
        stopwatchContainer: stopwatchContainer,
        stopwatchMinutesText: stopwatchMinutesText,
        stopwatchSecondsText: stopwatchSecondsText,
        stopwatchMillisecondsText: stopwatchMillisecondsText,
        giftGrabContainer: giftGrabContainer,
        armsContainer: armsContainer,
        spitOutContainer: spitOutContainer,
        feedSpeedContainer: feedSpeedContainer,
        feedSpeedSymbolContainer: feedSpeedSymbolContainer,
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

  window.addEventListener('mousedown', function(e) {
    g_eventQueue.push({type: 'mousedown', event: e});
  })
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

  g_audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  loadMusic(g_audioCtx);
  loadSfx(g_audioCtx);

  var renderer = new PIXI.WebGLRenderer(WIDTH, HEIGHT, {
    view: canvas,
    resolution: resolution
  });

  renderer.backgroundColor = 0x141721;

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

      sceneIndex.sack.texture = PIXI.utils.TextureCache[ASSET_PATHS.SACK.CLOSED];

      g_roundEndTime = Date.now()

      var roundTime = g_roundEndTime - g_roundStartTime;
      g_playerBestTimeEntry = finishGame(sceneIndex, g_bestTimes, roundTime);
    },

    exit: function(sceneIndex) {
      sceneIndex.resultsScreen.visible = false;
    }
  }  
}
