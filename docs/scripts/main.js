
var ASSET_PATHS = {
  BG: 'images/bg.jpg',
  CONVEYOR_BELTS: {
    1: 'images/conveyorbelt1.png',
    2: 'images/conveyorbelt2.png',
    3: 'images/conveyorbelt3.png',
    4: 'images/conveyorbelt4.png'
  },
  GIFTS: ['images/gift.png'],
  BAD_GIFTS: ['images/elfboy.jpg'],
  SACK: 'images/sac.jpg',
  SCALE: 'images/scale.png',
  NEEDLE: 'images/needle.png'
};

var LEFT = 0;
var RIGHT = 1;

var GOOD = 0;
var BAD = 1;


var HEIGHT = 1080;
var WIDTH = 1920;

var FPS = 60;

var eventQueue = [];

var TIME_BETWEEN_FEEDS = 0.25;

var NEEDLE_ROT_MIN = -Math.PI / 4;
var NEEDLE_ROT_MAX = Math.PI / 4;
var MAX_SCORE = 100;

var MAX_GIFTS_PER_CONVEYOR_BELT = 4;

var g_conveyorBeltToGifts = new Map();
var g_conveyorBeltFromDirections = new Map();
var g_keyToConveyorBelt = new Map();

var g_giftToType = new Map();

var g_feedTimer = 0;
var g_nextConveyorBeltIndex = 0;
var g_tweens = [];
var g_score = 0;

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

var updateTween = function (dt, tween) {
  var obj = tween.obj;

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
  return g_conveyorBeltFromDirections.get(conveyorBelt);
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

  var distanceAlongBelt = conveyorBelt.width / 3;

  var directionMultiplier = getConveyorBeltFromDirection(conveyorBelt) === LEFT ? -1 : 1;

  var x1 = directionMultiplier * distanceAlongBelt * Math.cos(rotation);
  var y1 = directionMultiplier * distanceAlongBelt * Math.sin(rotation) - conveyorBelt.height / 2;

  var x2 = 0;
  var y2 = -conveyorBelt.height / 2;

  var x3 = -directionMultiplier * distanceAlongBelt * Math.cos(rotation);
  var y3 = -directionMultiplier * distanceAlongBelt * Math.sin(rotation) - conveyorBelt.height / 2;

  var x4 = -30 * directionMultiplier;
  var y4 = -dropConveyorBelt.height / 2;

  return [
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x1, conveyorBeltGlobalPos.y + y1), rotation: conveyorBelt.rotation},
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x2, conveyorBeltGlobalPos.y + y2), rotation: conveyorBelt.rotation},
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x3, conveyorBeltGlobalPos.y + y3), rotation: conveyorBelt.rotation},
    {position: new PIXI.Point(dropConveyorBeltGlobalPos.x + x4, dropConveyorBeltGlobalPos.y + y4), rotation: 0},
  ]
};


var rollForGiftType = function() {
  return (Math.random() < 0.8) ? GOOD : BAD;
};

var addGift = function(giftContainer) {
  var giftType = rollForGiftType();
  var giftAssetList = (giftType === GOOD) ? ASSET_PATHS.GIFTS : ASSET_PATHS.BAD_GIFTS;
  var giftAsset = giftAssetList[Math.floor(Math.random() * giftAssetList.length)];

  var gift = PIXI.Sprite.fromFrame(giftAsset);
  gift.anchor.set(0.5, 1);
  gift.scale.set(0.75);
  giftContainer.addChild(gift);

  g_giftToType.set(gift, giftType);

  return gift;
};

var removeGift = function(gift) {
  gift.parent.removeChild(gift);
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
  var DURATION = TIME_BETWEEN_FEEDS / 3;

  var startPos = new PIXI.Point(gift.x, gift.y);

  var posTween = createTween(gift.position, startPos, endPos, DURATION, linear);
  var rotTween = createTween(gift, {rotation: gift.rotation}, {rotation: endRot}, DURATION, linear);

  startTween(posTween);
  startTween(rotTween);
};

var createFallingTween = function(gift, sack) {
  var DROP_DURATION = 0.5;

  var startPos = new PIXI.Point(gift.x, gift.y);
  var endPos = new PIXI.Point(sack.x, sack.y)

  var tween = createTween(gift.position, startPos, endPos, DROP_DURATION, quadIn);
  startTween(tween);
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
    createFallingTween(fallingGift, sack);
  }
};


var updateFeedTimer = function(dt, sceneIndex) {
  g_feedTimer += dt;
  if (g_feedTimer >= TIME_BETWEEN_FEEDS) {
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

var grabGift = function(gift) {
  var DURATION = 0.75;

  var startPos = new PIXI.Point(gift.x, gift.y);
  var endPos = new PIXI.Point(WIDTH/2, -100);

  var tween = createTween(gift.position, startPos, endPos, DURATION, quadIn, function(tween) {
    removeGift(gift);
  });

  startTween(tween);
};

var processKeyDown = function(dt, event, sceneIndex) {
  var conveyorBelt = g_keyToConveyorBelt.get(event.key);
  if (!conveyorBelt) { return; }

  var giftToGrab = getGiftToGrabFromConveyorBelt(conveyorBelt);
  if (!giftToGrab)  { return; }

  grabGift(giftToGrab);
};

var processInput = function(dt, sceneIndex) {
  while (eventQueue.length) {
    var eventData = eventQueue.shift();
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

var getScoreFromGift = function(gift) {
  var giftType = g_giftToType.get(gift);
  return giftType === GOOD ? 1 : -3
};

var checkForSackCollision = function(dt, sceneIndex) {
  var gifts = sceneIndex.giftContainer.children;
  var sack = sceneIndex.sack;

  for (var i = 0; i < gifts.length; i++) {
    var gift = gifts[i];

    if (rectHitTest(gift.getBounds(), sack.getBounds())) {
      removeGift(gift);
      increaseScore(getScoreFromGift(gift));
    }
  }
};

var checkForWin = function() {
  if (g_score >= MAX_SCORE) {
    alert('you win!');
    window.location.reload();
  }
};

var update = function (dt, sceneIndex) {
  processInput(dt, sceneIndex);
  updateFeedTimer(dt, sceneIndex);
  for (var i = 0; i < g_tweens.length; i++) {
    updateTween(dt, g_tweens[i]);
  }

  updateNeedle(dt, sceneIndex);
  checkForSackCollision(dt, sceneIndex);

  checkForWin();
};

var run = function (renderer, sceneIndex) {
  update(getTickerDt(PIXI.ticker.shared), sceneIndex);
  renderer.render(sceneIndex.root);
};

var startGame = function (renderer, sceneIndex) {
  //setupScene(sceneIndex);
  PIXI.ticker.shared.add(run.bind(null, renderer, sceneIndex));
};

// returns an index of {name: element}

var addConveyorBelt = function(conveyorBeltDatum) {
  var conveyorBelt = PIXI.Sprite.fromFrame(conveyorBeltDatum.assetPath);

  conveyorBelt.position.set(conveyorBeltDatum.position.x, conveyorBeltDatum.position.y);
  conveyorBelt.anchor.set(conveyorBeltDatum.anchor.x, conveyorBeltDatum.anchor.y);
  conveyorBelt.scale.set(conveyorBeltDatum.scale.x, conveyorBeltDatum.scale.y);
  conveyorBelt.rotation = conveyorBeltDatum.rotation;

  g_conveyorBeltToGifts.set(conveyorBelt, []);

  var fromDirection = conveyorBeltDatum.fromDirection;
  g_conveyorBeltFromDirections.set(conveyorBelt, fromDirection);

  if (conveyorBeltDatum.key) {
    g_keyToConveyorBelt.set(conveyorBeltDatum.key, conveyorBelt); 
  }

  return conveyorBelt;
};

var buildSceneGraph = function () {

  var root = new PIXI.Container();

    var worldContainer = new PIXI.Container();
    root.addChild(worldContainer);

      var bg = PIXI.Sprite.fromFrame(ASSET_PATHS.BG);
      worldContainer.addChild(bg);

      var scaleContainer = new PIXI.Container();
      scaleContainer.scale.set(0.25);
      scaleContainer.position.set(WIDTH/2, 100);
      worldContainer.addChild(scaleContainer);
        var scale = PIXI.Sprite.fromFrame(ASSET_PATHS.SCALE);
        scale.anchor.set(0.5, 0.5)
        scaleContainer.addChild(scale);

        var needle = PIXI.Sprite.fromFrame(ASSET_PATHS.NEEDLE);
        needle.anchor.set(0.5, 1);
        needle.position.set(scale.x, -110);
        needle.pivot.y = 93;
        needle.rotation = -Math.PI / 4;
        scaleContainer.addChild(needle);

      var allConveyorBeltsContainer = new PIXI.Container();
      worldContainer.addChild(allConveyorBeltsContainer);

      var CONVEYOR_BELT_DATA = [
        { 
          position: { x: 0, y: 0 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[1], rotation: Math.PI / 8, anchor: {x: 0.5, y: 0.5}, scale: {x: 2, y: 1}, 
          fromDirection: LEFT,
          key: '1',
          dropConveyorBeltDatum: { 
            position: { x: 400, y: 120 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[1], rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: 0.75, y: 1},
            fromDirection: LEFT,
          }
        },

        { 
          position: { x: 0, y: 300 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[2], rotation: Math.PI / 8, anchor: {x: 0.5, y: 0.5}, scale: {x: 2, y: 1},
          fromDirection: LEFT,
          key: '2',
          dropConveyorBeltDatum: { 
            position: { x: 400, y: 420 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[2], rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: 0.75, y: 1},
            fromDirection: LEFT,
          } 
        },

        { 
          position: { x: 1282, y: 0 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[3], rotation: -Math.PI / 8, anchor: {x: 0.5, y: 0.5}, scale: {x: 2, y: 1},
          fromDirection: RIGHT,
          key: '3',
          dropConveyorBeltDatum: { 
            position: { x: 882, y: 120 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[3], rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: 0.75, y: 1},
            fromDirection: LEFT,
          }
        },

        { 
          position: { x: 1282, y: 300 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[4], rotation: -Math.PI / 8, anchor: {x: 0.5, y: 0.5}, scale: {x: 2, y: 1},
          fromDirection: RIGHT,
          key: '4',
          dropConveyorBeltDatum: { 
            position: { x: 882, y: 420 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[4], rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: 0.75, y: 1},
            fromDirection: LEFT,
          }
        },
      ];

      CONVEYOR_BELT_DATA.forEach(function (conveyorBeltDatum) {
        var conveyorBeltContainer = new PIXI.Container();
        var conveyorBelt = addConveyorBelt(conveyorBeltDatum);
        var dropConveyorBelt = addConveyorBelt(conveyorBeltDatum.dropConveyorBeltDatum);

        allConveyorBeltsContainer.addChild(conveyorBelt);
        allConveyorBeltsContainer.addChild(dropConveyorBelt);
      });

      allConveyorBeltsContainer.position.set(allConveyorBeltsContainer.children[0].width / 2);

      var giftContainer = new PIXI.Container();
      worldContainer.addChild(giftContainer);

      var sack = PIXI.Sprite.fromFrame(ASSET_PATHS.SACK);
      sack.anchor.set(0.5, 1);
      sack.x = WIDTH / 2;
      sack.y = HEIGHT;
      worldContainer.addChild(sack);
        

  return {
    root: root,
      worldContainer: worldContainer,
        bg: bg,
        scaleContainer: scaleContainer,
        scale: scale,
        needle: needle,
        allConveyorBeltsContainer: allConveyorBeltsContainer,
        giftContainer: giftContainer,
        sack: sack
  };
};


var addKeyHandlers = function (renderer, worldContainer) {
  window.addEventListener('keydown', function (e) {
    // push keydown event to event queue
    eventQueue.push({ type: 'keydown', event: e });
  });

  window.addEventListener('keyup', function (e) {
    // push keyup event to event queue
    eventQueue.push({ type: 'keyup', event: e });
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