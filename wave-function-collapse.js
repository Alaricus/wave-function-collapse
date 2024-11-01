import {assets as assetList} from './assets.js';
import { placeAssets } from './placeAssets.js';

const image = document.querySelectorAll('img')[0];
const assetsImage = document.querySelectorAll('img')[1];
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const tileSize = 32;
let widthInTiles = Math.ceil(window.innerWidth / tileSize);
let heightInTiles = Math.ceil(window.innerHeight / tileSize);

// Coordinates (in x,y format) on each tile on the tileset image
const tileCoordsXY = [];
// The keys in this object correspond to the indices of tileCoordxXY array
const tileTypes = {};
const allHashes = new Set();
const edgeEnum = {};

const initialize = () => {
  const osCanvas = new OffscreenCanvas(image.width, image.height);
  const osCtx = osCanvas.getContext('2d', { willReadFrequently: true });

  osCtx.drawImage(image, 0, 0);

  const tilesWide = osCtx.canvas.width / tileSize;
  const tilesHigh = osCtx.canvas.height / tileSize;

  // This is directly from MDN https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
  const makeHash = async (value) => {
    const messageUint8 = new TextEncoder().encode(value);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', messageUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  };

  const generateHashesForTile = async (row = 1, col = 0) => {
    // The heuristic is that tiles match if their corners match. I noticed this to be true in all the tilesets
    // I've tested on, but this is not a guarantee, so this could create data that would cause bad generations
    const imageDataNW = osCtx.getImageData(col * tileSize, row * tileSize, 1, 1).data;
    const imageDataNE = osCtx.getImageData(col * tileSize + tileSize - 1, row * tileSize, 1, 1).data;
    const imageDataSE = osCtx.getImageData(col * tileSize + tileSize - 1, row * tileSize + tileSize - 1, 1, 1).data;
    const imageDataSW = osCtx.getImageData(col * tileSize, row * tileSize + tileSize - 1, 1, 1).data;

    const northHash = await makeHash([...imageDataNW, ...imageDataNE, 'h'].join(''));
    const eastHash = await makeHash([...imageDataNE, ...imageDataSE, 'v'].join(''));
    const southHash = await makeHash([...imageDataSW, ...imageDataSE, 'h'].join(''));
    const westHash = await makeHash([...imageDataNW, ...imageDataSW, 'v'].join(''));

    // If any hash has both corners equal RGBA (0, 0, 0, 0) then it's probably a transparent tile,
    // which is likely unused in the tileset and can be skipped
    if (northHash === '1825ea3995228654b0ed685a7c7ed7710adbd944a0e3fe76bc302dfef660ee6c'
      || southHash === '1825ea3995228654b0ed685a7c7ed7710adbd944a0e3fe76bc302dfef660ee6c'
      || eastHash === '183030c6eaeb682d500ac9154d0426d6d0cc944cad4bb826ea113ccc50c1a8ba'
      || westHash === '183030c6eaeb682d500ac9154d0426d6d0cc944cad4bb826ea113ccc50c1a8ba') {
      return null;
    }

    return { n: northHash, e: eastHash, s: southHash, w: westHash };
  };

  const processTileset = async () => {
    let counter = 0;
    for (let i = 0; i < tilesHigh; i++) {
      for (let j = 0; j < tilesWide; j++) {
        const tileHashes = await generateHashesForTile(i, j);
        if (tileHashes === null) {
          continue;
        }

        tileTypes[counter] = {};

        ['n', 'e', 's', 'w'].forEach(direction => {
          const hash = tileHashes[direction];
          allHashes.add(hash);

          tileTypes[counter][direction] = hash;
        })

        tileCoordsXY.push([j , i]);
        counter++;
      }
    }

    Array.from(allHashes).forEach((hash, index) => {
      edgeEnum[hash] = index;
    });

    for (const tile in tileTypes) {
      tileTypes[tile].n = edgeEnum[tileTypes[tile].n];
      tileTypes[tile].s = edgeEnum[tileTypes[tile].s];
      tileTypes[tile].e = edgeEnum[tileTypes[tile].e];
      tileTypes[tile].w = edgeEnum[tileTypes[tile].w];
    }

    main();
  };

  processTileset();
};

const buildBoard = (rows, columns) => {
  const arr = [];

  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < columns; j++) {
      row.push({ result: null, variants: Object.keys(tileTypes) });
    }
    arr.push(row);
  }

  return arr;
};

const delay = (ms) => {
  return new Promise(resolve => {
      setTimeout(resolve, ms);
  });
};

const draw = (board, tileSize) => {
  ctx.fillStyle = 'black';
  ctx.strokeStyle = 'white';
  board.forEach((row, i) => {
    row.forEach((col, j) => {
      const x = j * tileSize;
      const y = i * tileSize;
      const w = tileSize;
      const h = tileSize;

      const cell = board[i][j];

      ctx.fillRect(x, y, w, h);

      if (cell.result !== null) {
        if (cell.result === undefined) {
          // Trying to catch a very infrequent bug, when it errors out immediately
          console.log('Error', cell, tileCoordsXY);
        }
        const [sx, sy] = tileCoordsXY[cell.result];
        ctx.drawImage(image, sx * tileSize, sy * tileSize, tileSize, tileSize, x, y, tileSize, tileSize);
      } else {
        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';
        ctx.fillText(cell.variants.length, x + ((w - ctx.measureText(cell.variants.length.toString()).width) / 2), y + 19);
      }

      ctx.fillStyle = 'black';
    });
  });
};

const main = async () => {
  const height = heightInTiles;
  const width = widthInTiles;

  ctx.width = width * tileSize;
  ctx.height = height * tileSize;
  ctx.canvas.width = width * tileSize;
  ctx.canvas.height = height * tileSize;

  let resizeCache = {};

  const getLowestEntropyTile = () => {
    const lowest = board.flat().reduce((acc, cur, index) => {
      if (cur.result === null && cur.variants.length <= acc.entropy) {
        acc.entropy = cur.variants.length;
        acc.index = index;
      }
      return acc;
    }, { entropy: Object.keys(edgeEnum).length, index: null });

    if (lowest.index === null) {
      return null;
    }

    const lowestEntropyTile = {
      x: lowest.index % width,
      y: Math.floor(lowest.index / width)
    };

    return lowestEntropyTile;
  };

  const board = buildBoard(height, width);
  const startingTileCoords = {
    x: Math.floor(Math.random() * width),
    y: Math.floor(Math.random() * height)
  };
  const startingTileType = Math.floor(Math.random() * Object.keys(tileTypes).length); // 11 is grass

  board[startingTileCoords.y][startingTileCoords.x] = { result: startingTileType, variants: [] };

  const resetTileAndNeighbors = (x, y) => {
    let again = null;
    const updatedTiles = [];

    // The cache is so that if the same tile keeps being problematic the area that's getting reset will grow
    if (!resizeCache[`${x}-${y}`]) {
      resizeCache[`${x}-${y}`] = { counter: 0, size: 1};
    }
    resizeCache[`${x}-${y}`].counter += 1;
    if (resizeCache[`${x}-${y}`].counter > 3) {
      resizeCache[`${x}-${y}`].size += 1;
      resizeCache[`${x}-${y}`].counter = 1;
    }

    // Select a square around the problem tile and reset it
    const minX = x - resizeCache[`${x}-${y}`].size;
    const maxX = x + resizeCache[`${x}-${y}`].size;
    const minY = y - resizeCache[`${x}-${y}`].size;
    const maxY = y + resizeCache[`${x}-${y}`].size;

    for (let i = minY; i < maxY + 1; i++) {
      if (i > -1 && i < height) {
        for (let j = minX; j < maxX + 1; j++) {
          if (j > -1 && j < width) {
            // Reset the tile to original state
            board[i][j] = { result: null, variants: Object.keys(tileTypes) };
            updatedTiles.push({ x: j, y: i });
            // console.log(`[${x}/${y}] reset ${resizeCache[`${x}-${y}`].counter} times at ${resizeCache[`${x}-${y}`].size * 2 + 1}x${resizeCache[`${x}-${y}`].size * 2 + 1}`, board[i][j]);
          }
        }
      }
    }

    // Collapse all reset tiles that have collapsed neighbors
    for (const tile of updatedTiles) {
      if (board?.[tile.y-1]?.[tile.x]?.result) {
        const allowed = [];
        const neighbor = board[tile.y-1][tile.x].result;
        for (const key in tileTypes) {
          // Find northern types that match the south of the northern neighbor
          if (tileTypes[key].n === tileTypes[neighbor].s) {
            allowed.push(key);
          }
        }
        board[tile.y][tile.x].variants = board[tile.y][tile.x].variants.filter(variant => allowed.includes(variant));
      }

      if (board?.[tile.y]?.[tile.x+1]?.result) {
        const allowed = [];
        const neighbor = board[tile.y][tile.x+1].result;
        for (const key in tileTypes) {
          if (tileTypes[key].e === tileTypes[neighbor].w) {
            allowed.push(key);
          }
        }
        board[tile.y][tile.x].variants = board[tile.y][tile.x].variants.filter(variant => allowed.includes(variant));
      }

      if (board?.[tile.y+1]?.[tile.x]?.result) {
        const allowed = [];
        const neighbor = board[tile.y+1][tile.x].result;
        for (const key in tileTypes) {
          if (tileTypes[key].s === tileTypes[neighbor].n) {
            allowed.push(key);
          }
        }
        board[tile.y][tile.x].variants = board[tile.y][tile.x].variants.filter(variant => allowed.includes(variant));
      }

      if (board?.[tile.y]?.[tile.x-1]?.result) {
        const allowed = [];
        const neighbor = board[tile.y][tile.x-1].result;
        for (const key in tileTypes) {
          if (tileTypes[key].w === tileTypes[neighbor].e) {
            allowed.push(key);
          }
        }
        board[tile.y][tile.x].variants = board[tile.y][tile.x].variants.filter(variant => allowed.includes(variant));
      }
    }

    if (again) {
      resetTileAndNeighbors(again.x, again.y);
    }
  };

  // Pass the coords of the first random tile first
  const processTile = async (x, y) => {
    const thisTile = board[y][x];
    if (thisTile.result !== null) {
      // For a known tile, find the neighbors and process them
      const wNeighborCoords = (x > 0) ? { x: x - 1, y: y } : null;
      const eNeighborCoords = (x < width - 1) ? { x: x + 1, y: y } : null;
      const nNeighborCoords = (y > 0) ? { x: x, y: y - 1 } : null;
      const sNeighborCoords = (y < height - 1) ? { x: x, y: y + 1 } : null;

      const processNeighbor = (coords, direction) => {
        let oppositeDirection = null;
        if (direction === 'n') { oppositeDirection = 's'};
        if (direction === 'e') { oppositeDirection = 'w'};
        if (direction === 's') { oppositeDirection = 'n'};
        if (direction === 'w') { oppositeDirection = 'e'};
        // if a west neighbor exists
        if (coords && oppositeDirection) {
          // remove variants that don't exist in tileTypes for this type of cell
          const neighbor = board[coords.y][coords.x]
          if (neighbor.result === null) {
            // filter variants (tileTypes) by them having a correct constraint
            // get all tile types that match this edge
            const allowed = [];
            for (const key in tileTypes) {
              if (tileTypes[key][oppositeDirection] === tileTypes[thisTile.result][direction]) {
                allowed.push(key);
              }
            }
            neighbor.variants = neighbor.variants.filter(variant => allowed.includes(variant));
            if (neighbor.variants.length === 0) {
              resetTileAndNeighbors(x, y);
            }
          }
        }
      };

      processNeighbor(nNeighborCoords, 'n');
      processNeighbor(eNeighborCoords, 'e');
      processNeighbor(sNeighborCoords, 's');
      processNeighbor(wNeighborCoords, 'w');

      // Find the tile with lowest amount of variants and randomly select one for it to collapse into
      const lowestEntropyTileCoords = getLowestEntropyTile();

      // This runs when map creation is finished
      if (!lowestEntropyTileCoords) {
        await placeAssets(ctx, delay, assetsImage, board, assetList, width, tileSize, '16');
        await placeAssets(ctx, delay, assetsImage, board, assetList, width, tileSize, '13');
        await placeAssets(ctx, delay, assetsImage, board, assetList, width, tileSize, '10');

        // This is a CSS bounce animation
        canvas.style.animation = 'bounce 300ms linear 1';
        return;
      }
      const lowestEntropyTile = board[lowestEntropyTileCoords.y][lowestEntropyTileCoords.x];
      const randomVariant = lowestEntropyTile.variants[Math.floor(Math.random() * lowestEntropyTile.variants.length)];
      lowestEntropyTile.result = randomVariant;

      // Experimenting with land/water bodies chunkiness. Will probably want to replace this with weights later
      // Adjust chunkiness of grass
      if (lowestEntropyTile.variants.includes('10')) {
        const percentage = Math.random();
        if (percentage <= 0.90) {
          lowestEntropyTile.result = '10';
        } else {
          lowestEntropyTile.result = randomVariant;
        }
      }
      // Adjust chunkiness of water
      if (lowestEntropyTile.variants.includes('16')) {
        const percentage = Math.random();
        if (percentage <= 0.95) {
          lowestEntropyTile.result = '16';
        } else {
          lowestEntropyTile.result = randomVariant;
        }
      }
      // Adjust chunkiness of dirt
      if (lowestEntropyTile.variants.includes('13')) {
        const percentage = Math.random();
        if (percentage <= 0.9) {
          lowestEntropyTile.result = '13';
        } else {
          lowestEntropyTile.result = randomVariant;
        }
      }
      // Adjust chunkiness of deep water
      if (lowestEntropyTile.variants.includes('33')) {
        const percentage = Math.random();
        if (percentage <= 0.9) {
          lowestEntropyTile.result = '33';
        } else {
          lowestEntropyTile.result = randomVariant;
        }
      }

      await delay(15);
      draw(board, tileSize);
      processTile(lowestEntropyTileCoords.x, lowestEntropyTileCoords.y);
    }
  };

  processTile(startingTileCoords.x, startingTileCoords.y);
};

window.onload = () => initialize();
