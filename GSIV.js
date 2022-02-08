class GSIV {
  loadProto = () =>
    new Promise((resolve, reject) => {
      protobuf.load("vector_tile.proto", (err, root) => {
        if (err) reject(err);
        this.tile = root.lookupType("vector_tile.Tile");
        resolve(this);
      });
    });

  static load = (path) =>
    new Promise((resolve, reject) => {
      const req = new XMLHttpRequest();
      req.open("get", path, true);
      req.responseType = "arraybuffer";
      req.onload = () => {
        if (req.status == 200) resolve(req.response);
        else reject("file cannot load");
      };
      req.send();
    });

  loadTile = (zoom, x, y) =>
    new Promise((resolve, reject) => {
      GSIV.load(
        `https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/${zoom}/${x}/${y}.pbf`
      )
        .then((plain) => {
          const buf = new Uint8Array(plain);
          const msg = this.tile.decode(buf);
          const obj = this.tile.toObject(msg);
          const layers = {};
          for (let l of obj.layers) layers[l.name] = l;
          console.log(layers);
          resolve({ zoom: zoom, tilex: x, tiley: y, layers: layers });
        })
        .catch((r) => {
          reject("cannot load tile");
        });
    });

  draw(can, layer) {
    const decodeint = (value) => (value >> 1) ^ -(value & 1);
    //console.log(layer)
    const ext = layer.extent;
    const ctx = can.getContext("2d");
    let lc = 0;
    const wx = can.width / ext,
      wy = can.height / ext; // axis scale
    for (let i in layer.features) {
      //decode tags
      const tags = layer.features[i].tags;
      const type = layer.features[i].type;
      const attr = {};
      for (let i = 0; i < tags.length; i += 2) {
        attr[layer.keys[tags[i]]] = layer.values[tags[i + 1]];
      }
      //		console.log(attr)
      switch (layer.name) {
        case "road":
          ctx.lineWidth = attr.rnkWidth ? attr.rnkWidth.intValue + 1 : 1;
          ctx.strokeStyle = "rgba(100,100,100,1)";
          if (attr.motorway.intValue == 1) {
            ctx.lineWidth = 6;
          }
          break;
        case "structurel":
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(150,150,50,1)";
          break;
        case "building":
        case "structurea":
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(200,100,100,0)";
          ctx.fillStyle = "rgba(200,100,100,1)";
          break;
        case "railway":
          ctx.lineWidth = 4;
          ctx.strokeStyle = "rgba(150,200,150,1)";
          break;
        case "river":
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(100,100,250,1)";
          break;
        case "waterarea":
        case "lake":
          ctx.fillStyle = "rgba(150,150,200,1)";
          break;
        case "contour":
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(100,50,50,0.5)";
          break;
        default:
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(0,0,0,0.5)";
          ctx.fillStyle = "rgba(100,100,200,1)";
      }
      //decode geometory
      const geo = layer.features[i].geometry;
      let gi = 0;
      let cx = 0;
      let cy = 0;
      let sx = 0;
      let sy = 0;
      //		ctx.lineWidth = attr.rnkWidth.intValue + 1
      ctx.beginPath();
      while (gi < geo.length) {
        let c = geo[gi++];
        let cmd = c & 7; //command
        let count = c >> 3; //count
        switch (cmd) {
          case 1: //moveto
            for (let i = 0; i < count; i++) {
              cx = cx + decodeint(geo[gi]);
              cy = cy + decodeint(geo[gi + 1]);
              ctx.moveTo(cx * wx, cy * wy);
              //						console.log("move "+ cx+"x"+cy)
            }
            (sx = cx), (sy = cy);
            gi += count * 2;
            break;
          case 2: //liento
            for (let i = 0; i < count; i++) {
              cx += decodeint(geo[gi++]);
              cy += decodeint(geo[gi++]);
              ctx.lineTo(cx * wx, cy * wy);
              lc++;
              //						console.log("line "+cx+"x"+cy)
            }
            break;
          case 7: //close
            ctx.lineTo(sx * wx, sy * wy);
            ctx.moveTo(cx * wx, cy * wy);
            lc++;
            break;
          default:
            console.log("illigal command");
        }
      }
      if (type == 3) ctx.fill();
      else ctx.stroke();
    }
    return lc;
  }
}
