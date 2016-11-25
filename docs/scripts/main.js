var DEBUG_CONVEYOR_BELT_NUMBERS = false;


var ASSET_PATHS = {
  BG: {
    SKY: 'images/bg-sky-colour141721.png',
    SNOWFLAKES1: 'images/bg-snowflakes1.png',
    SNOWFLAKES2: 'images/bg-snowflakes2.png',
    WALL: 'images/bg-wall.png',
    GARLAND_FRAMES: ['images/bg-garland1.png', 'images/bg-garland2.png', 'images/bg-garland3.png', 'images/bg-garland4.png'],
    GIFTS: 'images/bg-gifts.png',
  },
  
  CONVEYOR_BELT_FRAMES: ['images/conveyerBelt1.png', 'images/conveyerBelt2.png', 'images/conveyerBelt3.png', 'images/conveyerBelt4.png'],
  PLATFORM1: 'images/platform1.png',
  PLATFORM2: 'images/platform2.png',
  PLATFORM3: 'images/platform3.png',
  PLATFORM4: 'images/platform4.png',

  SPOTLIGHT: 'images/platform-halo.png',

  SPEED_SYMBOL: 'images/speed-symbol-wstroke.png',

  GIFTS: [
    'images/item-gift1-xmas.png',
    'images/item-gift2-xmas.png',
    'images/item-gift3-xmas.png',
    'images/item-gift4-xmas.png',
    'images/item-gift5-xmas.png',
    'images/item-gift6-xmas.png',
    'images/item-gift7-xmas.png',
    'images/item-gift8-xmas.png',
    'images/item-gift9-xmas.png',
    'images/item-gift10-xmas.png',
    'images/item-gift11-xmas.png',
    'images/item-gift12-xmas.png'
  ],
  
  BAD_GIFTS: [
    'images/item-bunny.png',
    'images/item-easterEgg.png',
    'images/item-heart.png',
    'images/item-potOfGold.png',
    'images/item-pumpkin.png',
    'images/item-turkey.png',
    'images/item-hat.png',
    'images/item-flamingo.png',
    'images/item-flowers.png'
  ],
  
  SACK: {
    SPIT_ANIM_FRAMES: ['images/bag-1.png', 'images/bag-2.png', 'images/bag-3.png', 'images/bag-4-6.png', 'images/bag-5-7.png', 'images/bag-8.png', 'images/bag-9.png'],
    CLOSED: 'images/bag-closed.png',
  },

  SCALE: 'images/scale-pole.png',
  NEEDLE: 'images/scale-arrow.png',

  ARMS: {
    OPEN: 'images/arms-handsReach.png',
    CLOSED: 'images/arms-handsGrab.png',
    FIDGETING1: 'images/arms-handsFidgeting1.png',
    FIDGETING2: 'images/arms-handsFidgeting2.png'
  },

  RESULTS: {
    CONGRATULATIONS_FRAMES: ['images/congratulations1.png', 'images/congratulations2.png', 'images/congratulations3.png'],
    SCROLL: 'images/scroll-full.png',
    BADGE: 'images/elf-badge.png',
    LIST_DIVIDER: 'images/result-list-divider.png',
    LIST_HIGHLIGHT: 'images/result-list-highlight.png',
    TIME_HIGHLIGHT: 'images/result-time-field.png',
  },

  BG_MUSIC: 'audio/music/Jordan_Gladstone_-_07_-_The_Christmas_is_in_Another_Castle.mp3',
  SFX: {
    DING: 'audio/sfx/ding.wav',
    BURP: 'audio/sfx/burp.wav',
    ELF_GRAB: 'audio/sfx/heheh.wav'
  },

  FONTS: {
    BAAR_GOETHEANIS: 'fonts/baar_goetheanis_regular.xml',
    KB_PINK_LIPGLOSS: 'fonts/KBPinkLipgloss.xml',
  }
};

var KEYS = {
  PLATFORM1: 'ArrowUp',
  PLATFORM2: 'ArrowLeft',
  PLATFORM3: 'ArrowRight',
  PLATFORM4: 'ArrowDown',
  SPEED_UP: " ",
  //SpeedDown: SPECIAL CASE - LEFT CLICK since one of the makey makey inputs is a click for some reason...
  GET_NAME_CONFIRM_KEY: 'Enter'
}

var ASSET_SCALE_X = 0.885; 
var ASSET_SCALE_Y = 0.885;

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
var g_giftToConveyorBelt = new Map();

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

var g_resultsVisibleTime = null;

var g_name = "TOP ELF";

// {name: 'name', score: 0}
var g_bestTimes = [];
var g_playerBestTimeEntry = null;
var NUM_BEST_TIMES_TO_STORE = Infinity;

var STATES = {
  STARTING: 'STARTING',
  PLAYING: 'PLAYING',
  GET_NAME: 'GET_NAME',
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
  musicAudioData.elem.loop = true;
};


// super hack city!
var OUTLINE_SIZE = 6;
var OUTLINE_COLOR = 0x003b7d;

var CombinedTextContainer = function() {

}

var createTextContainerWithOutline = function(text, options) {
  var container = new PIXI.Container();

  var bgTexts = [];

  for (var i = 0; i < 4; i++) {
    bgTexts[i] = new PIXI.extras.BitmapText(text, options);
    bgTexts[i].tint = OUTLINE_COLOR;
    bgTexts[i].x = OUTLINE_SIZE * (i < 2 ? -1 : 1);
    bgTexts[i].y = OUTLINE_SIZE * (i % 2 == 0 ? -1 : 1);
    container.addChild(bgTexts[i]);
  }

  var text = new PIXI.extras.BitmapText(text, options);
  container.addChild(text);

  Object.defineProperties(container,  {
    text: {
      "get": function() {
        return text.text;
      },
      "set": function(val) {
        text.text = val;

        for (var i = 0; i < 4; i++) {
           bgTexts[i].text = val;
        }
      },
    },

    tint: {
      set: function(val) {
        text.tint = val;
      }
    }
  });

  return container
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

var quadOut = function(t, start, end) {
  return (start - end) * (t * (t - 2)) + start;
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

var GIFT_BELT_Y_OFFSET = 6;
var GIFT_PLATFORM_Y_OFFSET = 4;

var getGiftTransforms = function(conveyorBelt) {
  var dropConveyorBelt = getDropConveyorBelt(conveyorBelt);

  var conveyorBeltGlobalPos = conveyorBelt.getGlobalPosition();
  var dropConveyorBeltGlobalPos = dropConveyorBelt.getGlobalPosition();

  var rotation = conveyorBelt.rotation;

  var directionMultiplier = getConveyorBeltFromDirection(conveyorBelt) === LEFT ? -1 : 1;

  var x1 = directionMultiplier * ((1/3) * conveyorBelt.width) * Math.cos(rotation);
  var y1 = directionMultiplier * ((1/3) * conveyorBelt.width) * Math.sin(rotation) - conveyorBelt.height / 2 + GIFT_BELT_Y_OFFSET;

  var x2 = directionMultiplier * ((0/3) * conveyorBelt.width) * Math.cos(rotation);
  var y2 = directionMultiplier * ((0/3) * conveyorBelt.width) * Math.sin(rotation) - conveyorBelt.height / 2 + GIFT_BELT_Y_OFFSET;

  var x3 = -directionMultiplier * ((1/3) * conveyorBelt.width) * Math.cos(rotation);
  var y3 = -directionMultiplier * ((1/3) * conveyorBelt.width) * Math.sin(rotation) - conveyorBelt.height / 2 + GIFT_BELT_Y_OFFSET;

//   var x4 = -directionMultiplier * ((2/4) * conveyorBelt.width) * Math.cos(rotation);
//   var y4 = -directionMultiplier * ((2/4) * conveyorBelt.width) * Math.sin(rotation) - conveyorBelt.height / 2;

  var x5 = -0 * directionMultiplier;
  var y5 = -dropConveyorBelt.height / 2 + GIFT_PLATFORM_Y_OFFSET;

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
  gift.anchor.set(0.5, 0.5);
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
  if (gift.parent) {
    gift.parent.removeChild(gift);  
  }
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
  var DROP_DURATION = 0.5;

  var giftOnTop = gift. y 

  var directionMultiplier = (direction === LEFT) ? 1 : -1;
  var conveyorBelt = g_giftToConveyorBelt.get(gift);
  var topOrBottom = g_conveyorBeltToData.get(conveyorBelt).topOrBottom;

  var startPos = new PIXI.Point(gift.x, gift.y);
  var endPos = new PIXI.Point(sack.x + directionMultiplier * 80, sack.y)

  var cp1x = topOrBottom === TOP ? endPos.x - directionMultiplier * 100:  endPos.x - directionMultiplier * 100;
  var cp1y = startPos.y;

  var cp2x = endPos.x + directionMultiplier * 10;
  var cp2y = topOrBottom === TOP ? endPos.y - 700 : endPos.y - 400;

  var bezier = new Bezier(
    startPos.x, startPos.y,
    cp1x, cp1y,
    cp2x, cp2y,
    endPos.x, endPos.y
  );

  var fallEasing = lutEasing.bind(null, bezier.getLUT(DROP_DURATION * FPS * 2));

  var positionTween = createTween(gift.position, startPos, endPos, DROP_DURATION, fallEasing);
  startTween(positionTween);

  
  var startRot = gift.rotation;
  var endRot = directionMultiplier * (Math.PI / 2); //(Math.random() * Math.PI / 4 + Math.PI / 8);

  var rotationTween = createTween(gift, {rotation: gift.rotation}, {rotation: endRot}, DROP_DURATION, linear);
  startTween(rotationTween);
};

var feedGifts = function(conveyorBelt, giftContainer, sack) {
  var newGift = addGift(giftContainer);
  newGift.position = getGiftStartPosition(newGift, conveyorBelt);
  g_giftToConveyorBelt.set(newGift, conveyorBelt);

  var gifts = g_conveyorBeltToGifts.get(conveyorBelt);
  var giftTransforms = getGiftTransforms(conveyorBelt);

  gifts.unshift(newGift);

  var fallingGift = (gifts.length > giftTransforms.length) ? gifts.pop() : null;

  var FEED_DURATION = getTimeBetweenFeeds() / 3;

  for(var i = 0; i < gifts.length; i++) {
    var gift = gifts[i];
    var nextGiftTransform = giftTransforms[i];
    nextGiftTransform.position.y -= gift.height / 2;

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

  if (isInState(STATES.GET_NAME)) {
    if (event.key == KEYS.GET_NAME_CONFIRM_KEY) {
      transitionToState(STATES.FINISHED, sceneIndex);
    }

    return;
  }

// --------- FOR TESTING ONLY --------- 
//   if (isInState(STATES.PLAYING)) {
//     transitionToState(STATES.GET_NAME, sceneIndex);
//     return;
//   }

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

  sack.gotoAndPlay(0);

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
      startPos.x, startPos.y - 1500,
      //startPos.x + directionMultiplier * 100, startPos.y,
      // endPos.x - directionMultiplier * 10, endPos.y - 200,
      endPos.x, endPos.y - 1500,
      endPos.x, endPos.y
    );
  });

  var easingFns = beziers.map(function(bezier) {
    return lutEasing.bind(null, bezier.getLUT(GIFT_TWEEN_DURATION * FPS));
  });

  for (var i = 0; i < gifts.length; i++) {
    var endRotation = Math.PI + (Math.random() * 2 * Math.PI);
    var rotateTween = createTween(gift, {rotation: gift.rotation}, {rotation: endRotation}, GIFT_TWEEN_DURATION, linear);
    startTween(rotateTween);

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

//   var openSackTween = createTimerTween(ASSET_PATHS.SACK.SPIT_ANIM_FRAMES / FPS, function(tween) {
//     sack.gotoAndStop(0);
//   });

//   startTween(openSackTween);
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
  return (minutes + ':');
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

  sceneIndex.feedSpeedSymbolContainer.visible = isInState(STATES.PLAYING);
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

var createTimeContainer = function(milliseconds, font, tint, useOutline) {
  var timeContainer = new PIXI.Container();

    var createTextFn = useOutline ? createTextContainerWithOutline : function(str, opts) { return new PIXI.extras.BitmapText(str, opts); }

    var timeMinutesText = createTextFn(getStopwatchMinutesText(milliseconds), {
      font: font,
      tint: tint
    });
    timeContainer.addChild(timeMinutesText);

    var timeSecondsText = createTextFn(getStopwatchSecondsText(milliseconds), {
      font: font,
      tint: tint
    });
    timeSecondsText.x = timeMinutesText.x + timeMinutesText.width + 10;
    timeContainer.addChild(timeSecondsText);

    var timeSecondsSeperatorText = createTextFn(':', {
      font: font,
      tint: tint
    });
    timeSecondsSeperatorText.x = timeSecondsText.x + timeSecondsText.width;
    timeSecondsSeperatorText.scale.set(0.5);
    timeSecondsSeperatorText.y = timeSecondsText.height - timeSecondsSeperatorText.height;
    timeContainer.addChild(timeSecondsSeperatorText);

    var timeMillisecondsText = createTextFn(getStopwatchMillisecondsText(milliseconds), {
      font: font,
      tint: tint
    });
    timeMillisecondsText.scale.set(0.5);
    timeMillisecondsText.x = timeSecondsSeperatorText.x + timeSecondsSeperatorText.width + 10;
    timeMillisecondsText.y = timeSecondsSeperatorText.y;

    timeContainer.addChild(timeMillisecondsText);
   
  return timeContainer;
};


var LEADERBOARD_ROW_PADDING = 10;
var DEFAULT_NAME = 'TOP ELF';

var createLeaderboardRow = function(bestTimeEntry, idx) {
  var row = new PIXI.Container();

    var rank = new PIXI.extras.BitmapText((idx + 1).toString() + '.', {
      font: "KBPinkLipgloss",
      tint: 0x000000
    });
    row.addChild(rank);

    var name = new PIXI.extras.BitmapText(bestTimeEntry.name || DEFAULT_NAME, {
      font: "KBPinkLipgloss",
      tint: 0x000000
    });
    name.x = rank.x + rank.width + 40;
    name.width = Math.min(name.width, 600);
    row.addChild(name);

    var time = createTimeContainer(bestTimeEntry.time, "KBPinkLipgloss", false);
    time.x = 900;
    row.addChild(time);

  
  row.scale.set(0.5);
  return row;
};

var ROW_HEIGHT = 80; 

var getRowY = function(rowIdx) {
  return (ROW_HEIGHT) * rowIdx + LEADERBOARD_ROW_PADDING;
}

var getYourHighlight = function(row, rowIdx) {
  var yourHighlight = PIXI.Sprite.fromFrame(ASSET_PATHS.RESULTS.LIST_HIGHLIGHT);
  yourHighlight.y = getRowY(rowIdx) - row.height / 2;
  yourHighlight.x -= 30;

  return yourHighlight;
}

var createNonDividedLeaderboard = function(leaderboardContainer, bestTimes, playerBestTimeEntry, yourIndex) {
  var topSevenContainer =  new PIXI.Container();
  leaderboardContainer.addChild(topSevenContainer);

  var maxIdx = Math.min(6, bestTimes.length - 1);
  
  for (i = 0; i <= maxIdx; i++) {
    var row = createLeaderboardRow(bestTimes[i], i);

    if (i === yourIndex) {
      var yourHighlight = getYourHighlight(row, i);
      topSevenContainer.addChild(yourHighlight);
    }

    row.y = getRowY(i);
    topSevenContainer.addChild(row);
  }
}

var createDividedLeaderboard = function(leaderboardContainer, bestTimes, playerBestTimeEntry, yourIndex) {
  var topThreeContainer = new PIXI.Container();
  leaderboardContainer.addChild(topThreeContainer);

    for (i = 0; i < 3; i++) {
      var row = createLeaderboardRow(bestTimes[i], i);
      row.y = getRowY(i);
      topThreeContainer.addChild(row);
    }

  var divider = new PIXI.Sprite.fromFrame(ASSET_PATHS.RESULTS.LIST_DIVIDER);
  divider.y = getRowY(3) + 10;
  divider.x = 220;
  leaderboardContainer.addChild(divider);

  var yourThreeContainer = new PIXI.Container();
  leaderboardContainer.addChild(yourThreeContainer); 

    var minIdx = Math.max(yourIndex - 1, 0);
    var maxIdx = Math.min(yourIndex + 1, bestTimes.length - 1);

    for (i = minIdx; i <= maxIdx; i++) {

      var rowIdx = i - minIdx + 4;
      var row = createLeaderboardRow(bestTimes[i], i);
      
      if (i === yourIndex) {
        var yourHighlight = getYourHighlight(row, rowIdx);
        yourThreeContainer.addChild(yourHighlight);
      }

      row.y = getRowY(rowIdx);
      yourThreeContainer.addChild(row);
    }
};

var createLeaderboard = function(sceneIndex, bestTimes, playerBestTimeEntry) {
  var yourIndex = bestTimes.indexOf(playerBestTimeEntry);

  var leaderboardContainer = sceneIndex.leaderboardContainer;

  leaderboardContainer.removeChildren();

  if (yourIndex < 7) {
    createNonDividedLeaderboard(leaderboardContainer, bestTimes, playerBestTimeEntry, yourIndex);
  } else {
    createDividedLeaderboard(leaderboardContainer, bestTimes, playerBestTimeEntry, yourIndex);
  }
};

var runResultsScreenTween = function(sceneIndex) {
  var DURATION = 0.5;
  var WAIT_DURATION = 0.8;

  var congratulations = sceneIndex.congratulations;

  var congratulationsOutTween = createTween(congratulations.position, 
    new PIXI.Point(congratulations.x, HEIGHT / 2), 
    new PIXI.Point(congratulations.x, -HEIGHT - congratulations.height / 2), 
    DURATION, 
    quadIn,  
    function() {
      sceneIndex.resultsScreen.visible = true;
    }
   );
  var congratulationsWaitTween = createTimerTween(WAIT_DURATION, function() {
    startTween(congratulationsOutTween);
  });
  var congratulationsInTween = createTween(congratulations.position, 
    new PIXI.Point(congratulations.x, HEIGHT + congratulations.height / 2), 
    new PIXI.Point(congratulations.x, HEIGHT / 2), 
    DURATION, 
    quadOut,
    function() {
      startTween(congratulationsWaitTween);
    }
  );

  startTween(congratulationsInTween);
};


var updateYourTimeResult = function(sceneIndex, roundTime) {
  var yourTimeTextContainer = sceneIndex.yourTimeTextContainer;
  yourTimeTextContainer.removeChildren();

  var timeContainer = createTimeContainer(roundTime, "KBPinkLipgloss", false);
  yourTimeTextContainer.addChild(timeContainer);

  timeContainer.x =(yourTimeTextContainer.width / 2 - timeContainer.width / 2) + 20;
};

var updateResultsScreen = function(dt, sceneIndex, bestTimes, roundTime, playerBestTimeEntry) {
  var winMsg = "You Win! You filled Santa's gift bag in " + Math.round(roundTime / 10) / 100 + ' seconds.\n';

  if (playerBestTimeEntry) {
    winMsg += 'You made it to number ' + (bestTimes.indexOf(playerBestTimeEntry) + 1) + ' on the leaderboard! Great job!'
  }
}

var showFinishScreen = function(sceneIndex, bestTimes, roundTime, playerBestTimeEntry) {
  
};

var finishGame = function(sceneIndex, bestTimes, roundTime) {
  var playerBestTimeEntry = null;

  //if (isNewBestTime(bestTimes, roundTime)) {
  var playerName = g_name;
  var playerBestTimeEntry = updateBestTimes(bestTimes, roundTime, playerName);
  saveBestTimes(bestTimes);
  //}
  
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

var update_GET_NAME = function(dt, sceneIndex) {  
  processInput(dt, sceneIndex);
  updateTweens(dt);
  updateSnowflakes(dt, sceneIndex);
};

var update_FINISHED = function(dt, sceneIndex) {
  var roundTime = g_roundEndTime - g_roundStartTime;

  processInput(dt, sceneIndex);

  updateResultsScreen(dt, sceneIndex, g_bestTimes, roundTime, g_playerBestTimeEntry);

  updateTweens(dt);
  updateSnowflakes(dt, sceneIndex);
};

var update_PLAYING = function(dt, sceneIndex) {
  if (checkForWin()) {
    transitionToState(STATES.GET_NAME, sceneIndex);
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

  if (isInState(STATES.GET_NAME)) {
    return update_GET_NAME(dt, sceneIndex);
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
  g_giftToType.clear();
  g_giftToConveyorBelt.clear();
  sceneIndex.sack.gotoAndStop(0);
  clearGifts(sceneIndex.giftContainer);
  clearGifts(sceneIndex.giftGrabContainer);
  clearGifts(sceneIndex.spitOutContainer);
  g_giftToType.clear();
  g_giftToConveyorBelt.clear();
  
  var conveyorBeltsIter = g_conveyorBeltToGifts.keys();
  
  var conveyorBelt = null;
  while (conveyorBelt = conveyorBeltsIter.next().value) {
    g_conveyorBeltToGifts.set(conveyorBelt, []);
  }
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
      var numberText = createTextContainerWithOutline(conveyorBeltDatum.key.toString(), {
        font: "BaarGoetheanis"
      });

      numberText.x = conveyorBelt.width / 2
      numberText.y = conveyorBelt.height

      numberText.scale.x = directionMultiplier / 2;
      numberText.scale.y = 1 / 2

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

        var bgGarland = new PIXI.extras.MovieClip.fromFrames(ASSET_PATHS.BG.GARLAND_FRAMES);
        bgGarland.anchor.set(0.5, 0);
        bgGarland.x = WIDTH / 2;
        bgGarland.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
        bgGarland.animationSpeed = 0.03;
        bgGarland.loop = true;
        bgGarland.play();
        bgContainer.addChild(bgGarland);

        var bgGifts = new PIXI.Sprite.fromFrame(ASSET_PATHS.BG.GIFTS);
        bgGifts.anchor.set(0,1);
        bgGifts.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
        bgGifts.y = HEIGHT;
        bgContainer.addChild(bgGifts);

      var LABEL_SCALE = 0.35;

      var stopwatchContainer = new PIXI.Container();
      worldContainer.addChild(stopwatchContainer);

        var stopwatchLabel =  createTextContainerWithOutline('TIME', {
          font: "BaarGoetheanis"
        });
        stopwatchLabel.scale.set(LABEL_SCALE);
        stopwatchContainer.addChild(stopwatchLabel);

        var stopwatchMinutesText = createTextContainerWithOutline('', {
          font: "BaarGoetheanis"
        });
        stopwatchContainer.addChild(stopwatchMinutesText);

//         var stopwatchMinutesSeperatorText = new PIXI.extras.BitmapText(':', {
//           font: "BaarGoetheanis"
//         });
//         stopwatchMinutesSeperatorText.x = stopwatchMinutesText.x + stopwatchMinutesText.width;
//         stopwatchContainer.addChild(stopwatchMinutesSeperatorText);

        var stopwatchSecondsText = createTextContainerWithOutline(getStopwatchSecondsText(0), {
          font: "BaarGoetheanis"
        });
        stopwatchSecondsText.x = stopwatchMinutesText.x + stopwatchMinutesText.width + 10;
        stopwatchContainer.addChild(stopwatchSecondsText);

        var stopwatchSecondsSeperatorText = createTextContainerWithOutline(':', {
          font: "BaarGoetheanis"
        });
        stopwatchSecondsSeperatorText.x = stopwatchSecondsText.x + stopwatchSecondsText.width;
        stopwatchSecondsSeperatorText.scale.set(0.5);
        stopwatchSecondsSeperatorText.y = stopwatchSecondsText.height - stopwatchSecondsSeperatorText.height;
        stopwatchContainer.addChild(stopwatchSecondsSeperatorText);

        var stopwatchMillisecondsText = createTextContainerWithOutline(getStopwatchMillisecondsText(0), {
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

        var feedSpeedLabel = createTextContainerWithOutline("SPEED", {
          font: "BaarGoetheanis"
        });
        feedSpeedLabel.scale.set(LABEL_SCALE);
        feedSpeedLabel.x = 100;
        feedSpeedLabel.y = -45;
        feedSpeedContainer.addChild(feedSpeedLabel);

        var SYMBOL_MARGIN = 5;

        var feedSpeedSymbolContainer = new PIXI.Container();
        feedSpeedContainer.addChild(feedSpeedSymbolContainer);
          
          for (var i = 0; i < TIME_BETWEEN_FEED_OPTIONS.length; i++) {
             var feedSpeedSymbol = PIXI.Sprite.fromFrame(ASSET_PATHS.SPEED_SYMBOL);
            feedSpeedSymbolContainer.addChild(feedSpeedSymbol);
            feedSpeedSymbol.x = (feedSpeedSymbol.width + SYMBOL_MARGIN) * i
            feedSpeedSymbol.tint = DISABLED_TINT;
          }

     feedSpeedContainer.x = 40;
     feedSpeedContainer.y = 60;


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
        needle.pivot.y = -45;
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
      var CONVEYOR_BELT_BOTTOM_Y = CONVEYOR_BELT_TOP_Y + 270;
      var DROP_CONVEYOR_BELT_BOTTOM_Y = CONVEYOR_BELT_BOTTOM_Y + 140;

      var CONVEYOR_BELT_LEFT_X = -150;
      var DROP_CONVEYOR_BELT_LEFT_X = CONVEYOR_BELT_LEFT_X + 430;
      var CONVEYOR_BELT_RIGHT_X = CONVEYOR_BELT_LEFT_X + 1500;
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

      var sack = PIXI.extras.MovieClip.fromFrames(ASSET_PATHS.SACK.SPIT_ANIM_FRAMES);
      sack.loop = false;
      sack.animationSpeed = 0.5;
      sack.anchor.set(0.5, 1);
      sack.x = WIDTH / 2;
      sack.y = HEIGHT + 150;
      sack.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
      worldContainer.addChild(sack);


      var closedSack = PIXI.Sprite.fromFrame(ASSET_PATHS.SACK.CLOSED);
      closedSack.anchor = sack.anchor;
      closedSack.position = sack.position;
      closedSack.scale = sack.scale;
      closedSack.visible = false;
      worldContainer.addChild(closedSack);


      var giftGrabContainer = new PIXI.Container();
      worldContainer.addChild(giftGrabContainer);

      var armsContainer = new PIXI.Container();
      worldContainer.addChild(armsContainer);


     

      var startScreen = new PIXI.Container();
      worldContainer.addChild(startScreen);

        var startText = createTextContainerWithOutline('PRESS ANY KEY TO START!', {
          font: 'BaarGoetheanis'
        })
        startText.x = (WIDTH - startText.width) / 2 ;
        startText.y = (HEIGHT - startText.height) / 2;
        startScreen.addChild(startText);
        //startScreen.scale(0.5)
       
      var nameInputScreen = new PIXI.Container();
      nameInputScreen.visible = false;
      worldContainer.addChild(nameInputScreen);

        var nameInputBg = PIXI.Sprite.fromFrame(ASSET_PATHS.RESULTS.SCROLL)
        nameInputBg.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
        nameInputBg.position.set(WIDTH / 2 - nameInputBg.width / 2, HEIGHT / 2 - nameInputBg.height / 2);
        nameInputScreen.addChild(nameInputBg);

           var nameInputLabel = new PIXI.extras.BitmapText("What's your name?", {
            font: 'KBPinkLipgloss',
            tint: 0x000000
          });
          nameInputLabel.position.set(500,200);
          nameInputLabel.scale.set(0.9);
          nameInputBg.addChild(nameInputLabel);


      var resultsScreen = new PIXI.Container();
      resultsScreen.visible = false;
      worldContainer.addChild(resultsScreen);

        var resultsBg = PIXI.Sprite.fromFrame(ASSET_PATHS.RESULTS.SCROLL)
        resultsBg.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
        resultsBg.position.set(WIDTH / 2 - resultsBg.width / 2, HEIGHT / 2 - resultsBg.height / 2);
        resultsScreen.addChild(resultsBg);

        var congratulations = PIXI.extras.MovieClip.fromFrames(ASSET_PATHS.RESULTS.CONGRATULATIONS_FRAMES);
        congratulations.anchor.set(0.5, 0.5);
        congratulations.x = WIDTH/2;
        congratulations.y = 150;
        congratulations.animationSpeed = 0.06;
        congratulations.loop = true;
        congratulations.play()
        resultsScreen.addChild(congratulations);

          var resultsBadge = PIXI.Sprite.fromFrame(ASSET_PATHS.RESULTS.BADGE);
          resultsBadge.scale.set(ASSET_SCALE_X, ASSET_SCALE_Y);
          resultsBadge.position.set(200, 180);
          resultsBg.addChild(resultsBadge);

          var titleContainer = new PIXI.Container();
          titleContainer.position.set(550, 180);
          resultsBg.addChild(titleContainer);

            var bigTitle = new PIXI.extras.BitmapText("You're on the list!", {
              font: 'KBPinkLipgloss',
              tint: 0x000000
            });
            bigTitle.position.set(80,0);
            bigTitle.scale.set(0.9);
            titleContainer.addChild(bigTitle);

            var subTitle = new PIXI.extras.BitmapText("(the good one)", {
              font: 'KBPinkLipgloss',
              tint: 0x000000
            });
            subTitle.position.set(250, 120);
            subTitle.scale.set(0.6)
            titleContainer.addChild(subTitle);

          var yourTimeContainer = new PIXI.Container();
          yourTimeContainer.x = 200;
          yourTimeContainer.y = 550;
          resultsBg.addChild(yourTimeContainer);

            var yourTimeLabel = new PIXI.extras.BitmapText("YOUR TIME", {
              font: 'KBPinkLipgloss',
              tint: 0x000000
            });
            yourTimeLabel.x = 100;
            yourTimeLabel.scale.set(0.6);
            yourTimeContainer.addChild(yourTimeLabel);

            var yourTimeHighlight = PIXI.Sprite.fromFrame(ASSET_PATHS.RESULTS.TIME_HIGHLIGHT);
            yourTimeHighlight.y = 100;
            yourTimeContainer.addChild(yourTimeHighlight);

            var yourTimeTextContainer = new PIXI.Container();
            yourTimeTextContainer.y = yourTimeHighlight.y + 20;
            yourTimeTextContainer.x = yourTimeHighlight.x + 50;
            yourTimeContainer.addChild(yourTimeTextContainer);

          var leaderboardContainer = new PIXI.Container();
          leaderboardContainer.y = 450;
          leaderboardContainer.x = resultsBg.width / 2 + 50;
          resultsBg.addChild(leaderboardContainer);


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
        closedSack: closedSack,
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
        nameInputScreen: nameInputScreen,
        resultsScreen: resultsScreen,
        congratulations: congratulations,
        leaderboardContainer: leaderboardContainer,
        yourTimeTextContainer: yourTimeTextContainer,
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

var showLoadingText = function(renderer) {
  var loader = new PIXI.loaders.Loader();

  var loadingText = new PIXI.Text('Loading...', {
    fontFamily: 'Arial',
    fill: 0xFFFFFF,
    fontSize: 72
  });

  loadingText.x = WIDTH / 2 - loadingText.width / 2;
  loadingText.y = HEIGHT / 2 - loadingText.height / 2;

  renderer.render(loadingText);

  return loadingText;
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

  var loadingText = showLoadingText(renderer);

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

    loadingText.text = "Oops! Something went wrong!"
    renderer.render(loadingText);
  })
};

var STATE_TRANSITIONS = {
  STARTING: {
    enter: function(sceneIndex) {
      sceneIndex.startScreen.visible = true;

      sceneIndex.sack.visible = true;
      sceneIndex.sack.gotoAndStop(0);
      sceneIndex.closedSack.visible = false;
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

  GET_NAME: {
    enter: function(sceneIndex) {
      var nameInput = document.getElementById('name-input');
      nameInput.style.visibility = 'visible';

//       nameInput.onkeypress = function() {
//         g_eventQueue.push({ type: 'keydown', event: e });
//       }

      sceneIndex.nameInputScreen.visible = true;
    },
    exit: function(sceneIndex) {
      var nameInput = document.getElementById('name-input');
      nameInput.style.visibility = 'hidden';

      g_name = nameInput.value;

      sceneIndex.nameInputScreen.visible = false;
    }
  },

  FINISHED: {
    enter: function(sceneIndex) {
      sceneIndex.resultsScreen.visible = true;

      sceneIndex.sack.visible = false;
      sceneIndex.closedSack.visible = true;

      g_roundEndTime = Date.now()

      var roundTime = g_roundEndTime - g_roundStartTime;
      g_playerBestTimeEntry = finishGame(sceneIndex, g_bestTimes, roundTime);

      sceneIndex.congratulations.y = 150;
      runResultsScreenTween(sceneIndex);

      createLeaderboard(sceneIndex, g_bestTimes, g_playerBestTimeEntry);
      updateYourTimeResult(sceneIndex, roundTime);
    },

    exit: function(sceneIndex) {
      sceneIndex.resultsScreen.visible = false;
    }
  }  
}
