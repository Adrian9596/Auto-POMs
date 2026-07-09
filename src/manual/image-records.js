// Manual mode: pure image-record helpers. createImageRecord turns a
// loaded Image into the state.images shape (size, world position, id) and
// stashes the data URL by id; blobToDataURL / loadImageFromDataURL are
// promise wrappers around the matching browser APIs.
// Source part for app.js. Run `npm run build` after editing.

  function createImageRecord(img, dataURL, stackIndex) {
    const rect = state.lastCanvasRect || el.canvas.getBoundingClientRect();
    const maxW = Math.max(180, rect.width * 0.42);
    const maxH = Math.max(180, rect.height * 0.42);
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const width = Math.max(60, img.width * scale);
    const height = Math.max(60, img.height * scale);
    const centerWorld = screenToWorld(rect.width / 2, rect.height / 2);
    const offset = stackIndex * (18 / Math.max(state.zoom, 0.25));

    const id = state.idCounter++;
    imageDataById.set(id, dataURL);
    return {
      id,
      dataURL,
      img,
      width,
      height,
      x: centerWorld.x - width / 2 + offset,
      y: centerWorld.y - height / 2 + offset,
      locked: false,
    };
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function loadImageFromDataURL(dataURL) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataURL;
    });
  }
