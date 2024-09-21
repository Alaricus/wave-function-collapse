const image = document.querySelector('img');

const canvas = new OffscreenCanvas(image.width, image.height);
const ctx = canvas.getContext('2d');

ctx.drawImage(image, 0, 0);

const tileSize = 32;
const tilesWide = ctx.canvas.width / tileSize;
const tilesHigh = ctx.canvas.height / tileSize;

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

const processTile = async (row = 1, col = 0) => {
  // The heuristic is that tiles match if their corners match. I noticed this to be true in all the tilesets
  // I've tested on, but this is not a guarantee, so this could create data that would cause bad generations
  const imageDataNW = ctx.getImageData(col * tileSize, row * tileSize, 1, 1).data;
  const imageDataNE = ctx.getImageData(col * tileSize + tileSize - 1, row * tileSize - 1, 1, 1).data;
  const imageDataSE = ctx.getImageData(col * tileSize + tileSize - 1, row * tileSize + tileSize - 1, 1, 1).data;
  const imageDataSW = ctx.getImageData(col * tileSize, row * tileSize + tileSize - 1, 1, 1).data;

  const northHash = await makeHash([...imageDataNW, ...imageDataNE].join(''));
  const eastHash = await makeHash([...imageDataNE, ...imageDataSE].join(''));
  const southHash = await makeHash([...imageDataSW, ...imageDataSE].join(''));
  const westHash = await makeHash([...imageDataNW, ...imageDataSW].join(''));

  return { n: northHash, e: eastHash, s: southHash, w: westHash };
};

const tileCoordsXY = [];
const tileTypes = {};
const allHashes = new Set();

const processTiles = async () => {
  let counter = 0;
  for (let i = 0; i < tilesHigh; i++) {
    for (let j = 0; j < tilesWide; j++) {
      const tileHashes = await processTile(i, j);

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

  console.log(tileCoordsXY, tileTypes, Array.from(allHashes));
};

processTiles();
